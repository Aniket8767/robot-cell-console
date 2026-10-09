"""Camera node: webcam if available, otherwise a synthetic image. Never crashes without a camera.

Frames are (1) published on /camera/image/compressed (sensor_msgs/CompressedImage, JPEG)
and (2) served to the browser as MJPEG at /stream.mjpg by a small HTTP server.
"""
import threading

import cv2
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import CompressedImage

from camera_pipeline import FrameBuffer, SyntheticSource, open_webcam, start_http_server
from cell_config import load_config, public_config

IMAGE_TOPIC = "/camera/image/compressed"
MAX_READ_FAILURES = 30


class CameraNode(Node):
    def __init__(self, cfg):
        super().__init__("camera_node")
        cam = cfg["camera"]
        self.width, self.height = cam["width"], cam["height"]
        self.jpeg_params = [cv2.IMWRITE_JPEG_QUALITY, cam["jpeg_quality"]]
        self.failures = 0
        self.source = self._choose_source(cam)
        self.buffer = FrameBuffer()
        self.stop_event = threading.Event()
        self.server = start_http_server(cfg["network"]["http_port"], self.buffer,
                                        public_config(cfg), self.stop_event)
        self.publisher = self.create_publisher(CompressedImage, IMAGE_TOPIC, 5)
        self.create_timer(1.0 / cam["fps"], self.tick)
        self.get_logger().info(f"HTTP server on :{cfg['network']['http_port']} "
                               f"(/stream.mjpg, /frame.jpg, /config.json)")

    def _choose_source(self, cam):
        if cam["force_synthetic"]:
            self.get_logger().warning("Synthetic camera forced by config / NO_CAMERA=1")
            return SyntheticSource(self.width, self.height)
        source, reason = open_webcam(cam["device"], self.width, self.height, cam["fps"])
        if source is None:
            self.get_logger().warning(f"NO CAMERA: {reason}. Publishing a SYNTHETIC image instead.")
            return SyntheticSource(self.width, self.height)
        self.get_logger().info(f"Using real webcam {cam['device']}")
        return source

    def _fall_back_to_synthetic(self):
        self.get_logger().warning("Webcam stopped delivering frames. Switching to SYNTHETIC image.")
        self.source.close()
        self.source = SyntheticSource(self.width, self.height)

    def tick(self):
        frame = self.source.read()
        if frame is None:
            self.failures += 1
            if self.failures >= MAX_READ_FAILURES:
                self._fall_back_to_synthetic()
            return
        self.failures = 0
        ok, encoded = cv2.imencode(".jpg", frame, self.jpeg_params)
        if not ok:
            return
        jpeg = encoded.tobytes()
        self.buffer.publish(jpeg)
        msg = CompressedImage()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = "camera"
        msg.format = "jpeg"
        msg.data = jpeg
        self.publisher.publish(msg)

    def shutdown(self):
        self.stop_event.set()
        self.server.shutdown()
        self.source.close()


def main():
    rclpy.init()
    node = CameraNode(load_config())
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.shutdown()
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
