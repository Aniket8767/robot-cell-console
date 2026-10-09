# Design notes

## 1. Architecture

```
 Browser  http://localhost:8080
 +--------------------------------------------------------------+
 | React app (3D view, sliders, E-STOP, status)                 |
 |   renders <pick-panel> = Vue 3 custom element (own bundle)   |
 +--------+--------------------------------+--------------------+
          | one origin                      |
 +--------v--------------------------------v--------------------+
 | web container (nginx)                                         |
 |  /        static React + /vue-panel/pick-panel.js + /robot/   |
 |  /ws      -> backend:9090 (rosbridge)                         |
 |  /api/    -> backend:8081 (MJPEG, frame.jpg, config.json)     |
 +--------+--------------------------------+---------------------+
          |                                 |
 +--------v---------------------------------v--------------------+
 | backend container (ROS 2, one launch file)                    |
 |  rosbridge_websocket   robot_state_publisher (URDF -> /tf)    |
 |  joint_sim.py          camera_node.py       pick_logger.py    |
 +---------------------------------------------------------------+
        config/cell.yaml (baked into the backend image)
```

| Topic / endpoint | Type | Direction | Units |
|---|---|---|---|
| `/joint_command` | `sensor_msgs/JointState` | UI -> backend | rad |
| `/joint_states` | `sensor_msgs/JointState` | backend -> UI, `robot_state_publisher` | rad, 30 Hz |
| `/estop` | `std_msgs/Bool` | UI -> backend (true = latch) | - |
| `/estop_state` | `std_msgs/Bool` | backend -> UI (authoritative latch) | - |
| `/pick_target` | `geometry_msgs/PointStamped` | Vue -> backend | **mm**, frame `camera_center` |
| `/camera/image/compressed` | `sensor_msgs/CompressedImage` | camera node | JPEG, ~10 Hz |
| `/tf`, `/tf_static` | TF | `robot_state_publisher` | m, rad; `base_link` ... `tool0` |
| `GET /api/stream.mjpg`, `/api/frame.jpg` | MJPEG / JPEG | camera node -> browser | - |
| `GET /api/config.json` | JSON | backend -> UIs | from `cell.yaml` |

## 2. React for A, Vue for B, and how they are joined

The brief makes this a real hybrid: new screens in React, an older Vue widget library. Part A is React (hooks for the
connection, robot state and E-STOP; plain three.js in an effect with full cleanup). Part B is a **Vue 3 custom
element** `<pick-panel>` built as its own bundle (`pick-panel.js`). React loads it with a dynamic `import()`, renders
the tag, passes URLs as attributes and listens for the DOM event `pick`.

Why a custom element rather than an iframe or mounting into a `<div>`: it is a standard browser interface, so React
and Vue share nothing but attributes and events; Vue is genuinely mounted by the browser wherever the tag appears.
Trade-offs: two bundles (Vue is shipped in addition to React), shadow DOM means page CSS does not style the panel
(good for isolation, but the panel carries its own stylesheet), attributes are strings, and the panel opens its own
rosbridge connection. Both apps share one small `rosbridgeClient.js` and `topics.js` (no duplicate protocol code).
I wrote a ~100-line rosbridge client instead of using `roslib`: fewer dependencies and version risks, at the price of
maintaining the (simple) protocol code myself.

## 3. Camera transport

MJPEG over HTTP, served by the camera node and shown with a plain `<img>`. Compared with base64 `CompressedImage`
through rosbridge: no JSON/base64 overhead (about 33 % less data), no JavaScript decoding, and the Python rosbridge
server is kept free for control traffic. Cost: a second HTTP endpoint and an `<img>` that must be reloaded after a
backend restart. The node also publishes `CompressedImage`, so ROS tools still see the camera. At 1280x720, quality 80,
10 fps this is roughly 1 MB/s on localhost.

## 4. Pixel to millimetre maths (with display scaling)

The `<img>` is displayed at some size (`rect.width x rect.height`, CSS pixels) but the camera frame has its own size
(`naturalWidth x naturalHeight`). Calibration is defined in **source** pixels, so the click is scaled first:

```
u = (clientX - rect.left) / rect.width  * naturalWidth      v = (clientY - rect.top) / rect.height * naturalHeight
du = u - naturalWidth/2     dv = v - naturalHeight/2        (offset from the image centre, +u right, +v down)
dx = du * mm_per_pixel      dy = dv * mm_per_pixel          (default 0.4 mm/px)
```
Example: source 1280 px shown at 640 px, click at display x = 420 px (image left edge at 100, so 320 px inside): u = 320 / 640 * 1280 = 640 = centre, so dx = 0.
Unit tests cover this (`pickMath.test.js`). The image has no border or padding and keeps its aspect ratio, so the
bounding rect equals the picture.

## 5. Latency compensation

During the pipeline latency the belt keeps moving, so the part is further along +X when the robot arrives:
`extra_x_mm = belt_speed [m/s] x 1000 [mm/m] x latency [ms] / 1000 [ms/s] = belt_speed x latency_ms`.
Default: 0.25 x 200 = **50 mm**. The panel shows it and publishes `x = dx + extra_x_mm`, `y = dy`, in millimetres.
Belt speed and latency are editable in the panel, initialised from `cell.yaml`.

## 6. E-STOP

Enforced in **`joint_sim.py` on the backend**: while `/estop` has latched, `on_command` rejects every
`/joint_command` (logged as `REJECTED`) and the target is frozen at the current pose, so the robot holds position.
The UI additionally disables sliders and sends nothing, but that is only a convenience: any other client of the
topic (for example `ros2 topic pub`) is rejected too. The backend is the right place because it owns the actuators
and is the only component every command passes through. The UI shows the backend's `/estop_state`, and re-sends a
local latch after a reconnect so a press during a network drop still takes effect.

## 7. Deliberately not done

IK or any real robot motion toward the pick target; transforming the pick into `base_link` (TF bonus); blob detection;
MQTT; Gazebo/Webots; authentication; official UR meshes (I chose a small hand-written URDF so there is nothing large to
commit or download); webcam passthrough on macOS/Windows (not possible with Docker Desktop); dev-server hot reload (the
only supported workflow is `docker compose up --build`). These were cut to keep a small, honest, working submission.
