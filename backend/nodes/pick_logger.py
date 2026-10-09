"""Receives /pick_target (geometry_msgs/PointStamped, millimetres) and logs it."""
import rclpy
from geometry_msgs.msg import PointStamped
from rclpy.node import Node

PICK_TARGET = "/pick_target"


class PickLogger(Node):
    def __init__(self):
        super().__init__("pick_logger")
        self.create_subscription(PointStamped, PICK_TARGET, self.on_pick, 10)
        self.get_logger().info(f"Listening for pick targets on {PICK_TARGET} (millimetres)")

    def on_pick(self, msg):
        p = msg.point
        self.get_logger().info(
            f"PICK TARGET RECEIVED: x={p.x:.2f} mm, y={p.y:.2f} mm (frame '{msg.header.frame_id}')"
        )


def main():
    rclpy.init()
    node = PickLogger()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
