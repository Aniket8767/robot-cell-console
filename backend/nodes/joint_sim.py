"""Joint simulator: applies /joint_command, enforces E-STOP, publishes /joint_states.

The robot is simulated: each joint moves toward its commanded target at a limited
velocity (smooth motion). E-STOP is enforced HERE, on the server: while latched,
every joint command is rejected and the robot holds its position.
"""
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import JointState
from std_msgs.msg import Bool

from cell_config import load_config, load_joint_limits

JOINT_COMMAND = "/joint_command"
JOINT_STATES = "/joint_states"
ESTOP = "/estop"
ESTOP_STATE = "/estop_state"


def clamp(value, lower, upper):
    return max(lower, min(upper, value))


class JointSim(Node):
    def __init__(self, cfg):
        super().__init__("joint_sim")
        robot = cfg["robot"]
        self.limits = {name: (lo, hi) for name, lo, hi in load_joint_limits(robot["urdf_path"])}
        self.names = list(self.limits)
        self.position = self._validated_home(robot["home_pose"])
        self.target = dict(self.position)
        self.max_step = robot["max_joint_velocity_rad_s"] / robot["joint_state_rate_hz"]
        self.estop = False

        self.state_pub = self.create_publisher(JointState, JOINT_STATES, 10)
        self.estop_pub = self.create_publisher(Bool, ESTOP_STATE, 10)
        self.create_subscription(JointState, JOINT_COMMAND, self.on_command, 10)
        self.create_subscription(Bool, ESTOP, self.on_estop, 10)
        self.create_timer(1.0 / robot["joint_state_rate_hz"], self.tick)
        self.get_logger().info(
            f"Joint sim ready: {len(self.names)} joints, "
            f"{robot['joint_state_rate_hz']} Hz, max {robot['max_joint_velocity_rad_s']} rad/s"
        )

    def _validated_home(self, home_pose):
        missing = [n for n in self.names if n not in home_pose]
        if missing:
            raise ValueError(f"home_pose in cell.yaml is missing joints: {missing}")
        for name in self.names:
            lo, hi = self.limits[name]
            if not lo <= home_pose[name] <= hi:
                raise ValueError(f"home_pose[{name}]={home_pose[name]} outside URDF limits [{lo}, {hi}]")
        return {name: float(home_pose[name]) for name in self.names}

    def on_estop(self, msg):
        if msg.data and not self.estop:
            self.estop = True
            self.target = dict(self.position)  # stop where we are
            self.get_logger().warning("E-STOP LATCHED: robot stopped, joint commands will be rejected")
        elif not msg.data and self.estop:
            self.estop = False
            self.get_logger().info("E-STOP RESET: joint commands accepted again")

    def on_command(self, msg):
        if self.estop:
            self.get_logger().warning("E-STOP active: REJECTED joint command")
            return
        for name, value in zip(msg.name, msg.position):
            if name not in self.limits:
                self.get_logger().warning(f"Ignoring unknown joint '{name}'")
                continue
            lo, hi = self.limits[name]
            self.target[name] = clamp(float(value), lo, hi)

    def tick(self):
        for name in self.names:
            delta = self.target[name] - self.position[name]
            self.position[name] += clamp(delta, -self.max_step, self.max_step)
        state = JointState()
        state.header.stamp = self.get_clock().now().to_msg()
        state.name = self.names
        state.position = [self.position[n] for n in self.names]
        self.state_pub.publish(state)
        self.estop_pub.publish(Bool(data=self.estop))


def main():
    rclpy.init()
    node = JointSim(load_config())
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
