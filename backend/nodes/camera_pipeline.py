"""Camera sources (real webcam or synthetic) and the MJPEG/HTTP server. No ROS imports."""
import json
import math
import os
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import numpy as np

BOUNDARY = "frame"


class SyntheticSource:
    """A fake top-down camera: labelled pixel grid, moving blobs and a clock."""

    def __init__(self, width, height):
        self.width, self.height = width, height
        self.base = self._draw_background()

    def _draw_background(self):
        img = np.full((self.height, self.width, 3), (44, 36, 30), dtype=np.uint8)
        for x in range(0, self.width, 80):
            cv2.line(img, (x, 0), (x, self.height), (70, 62, 54) if x % 160 else (110, 100, 90), 1)
        for y in range(0, self.height, 80):
            cv2.line(img, (0, y), (self.width, y), (70, 62, 54) if y % 160 else (110, 100, 90), 1)
        for x in range(0, self.width, 160):
            for y in range(0, self.height, 160):
                cv2.putText(img, f"{x},{y}", (x + 4, y + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (150, 140, 128), 1)
        cv2.putText(img, "SYNTHETIC CAMERA", (24, 52), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 190, 255), 3)
        cv2.putText(img, f"{self.width}x{self.height} (no webcam in use)", (24, 84),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 190, 255), 1)
        return img

    def read(self):
        frame = self.base.copy()
        t = time.time()
        cx = int(self.width * (0.5 + 0.30 * math.cos(0.8 * t)))
        cy = int(self.height * (0.5 + 0.25 * math.sin(1.3 * t)))
        cv2.circle(frame, (cx, cy), 42, (40, 40, 230), -1)
        cv2.circle(frame, (self.width // 4, self.height // 2), 28, (60, 200, 70), -1)
        stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        cv2.putText(frame, stamp, (24, self.height - 24), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (235, 235, 235), 2)
        return frame

    def close(self):
        pass


class WebcamSource:
    def __init__(self, capture):
        self.capture = capture

    def read(self):
        ok, frame = self.capture.read()
        return frame if ok else None

    def close(self):
        self.capture.release()


def open_webcam(device, width, height, fps):
    """Returns a WebcamSource, or None (plus a reason) if the device is unusable."""
    if not os.path.exists(device):
        return None, f"{device} does not exist"
    capture = cv2.VideoCapture(device, cv2.CAP_V4L2)
    if not capture.isOpened():
        return None, f"{device} exists but could not be opened"
    capture.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
    capture.set(cv2.CAP_PROP_FRAME_WIDTH, width)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    capture.set(cv2.CAP_PROP_FPS, fps)
    ok, _ = capture.read()
    if not ok:
        capture.release()
        return None, f"{device} opened but delivered no frames"
    return WebcamSource(capture), None


class FrameBuffer:
    """Holds the latest JPEG and lets HTTP threads wait for the next one."""

    def __init__(self):
        self.cond = threading.Condition()
        self.jpeg = None
        self.seq = 0

    def publish(self, jpeg):
        with self.cond:
            self.jpeg = jpeg
            self.seq += 1
            self.cond.notify_all()

    def latest(self):
        with self.cond:
            return self.jpeg

    def wait_next(self, last_seq, timeout):
        with self.cond:
            self.cond.wait_for(lambda: self.seq != last_seq, timeout)
            return self.seq, self.jpeg


def make_handler(buffer, config_json, stop_event):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):  # keep the container log readable
            pass

        def do_GET(self):
            path = self.path.split("?")[0]
            if path == "/stream.mjpg":
                self._stream()
            elif path == "/frame.jpg":
                self._send_bytes("image/jpeg", buffer.latest())
            elif path == "/config.json":
                self._send_bytes("application/json", config_json)
            else:
                self.send_error(404)

        def _send_bytes(self, content_type, body):
            if body is None:
                self.send_error(503, "no frame yet")
                return
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _stream(self):
            self.send_response(200)
            self.send_header("Content-Type", f"multipart/x-mixed-replace; boundary={BOUNDARY}")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            seq = 0
            try:
                while not stop_event.is_set():
                    seq, jpeg = buffer.wait_next(seq, 1.0)
                    if jpeg is None:
                        continue
                    self.wfile.write(f"--{BOUNDARY}\r\nContent-Type: image/jpeg\r\n"
                                     f"Content-Length: {len(jpeg)}\r\n\r\n".encode())
                    self.wfile.write(jpeg)
                    self.wfile.write(b"\r\n")
            except (BrokenPipeError, ConnectionResetError):
                pass  # browser closed the stream

    return Handler


def start_http_server(port, buffer, public_config, stop_event):
    handler = make_handler(buffer, json.dumps(public_config).encode(), stop_event)
    server = ThreadingHTTPServer(("0.0.0.0", port), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server
