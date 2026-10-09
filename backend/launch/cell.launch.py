"""Starts everything the cell needs inside the backend container."""
import os
import sys
from pathlib import Path

from launch import LaunchDescription
from launch.actions import ExecuteProcess
from launch_ros.actions import Node

APP_DIR = Path(os.environ.get("APP_DIR", "/app"))
sys.path.insert(0, str(APP_DIR / "nodes"))

from cell_config import load_config  # noqa: E402  (needs the sys.path line above)


def python_node(script):
    return ExecuteProcess(cmd=["python3", "-u", str(APP_DIR / "nodes" / script)], output="screen")


def generate_launch_description():
    cfg = load_config()
    urdf_text = Path(cfg["robot"]["urdf_path"]).read_text(encoding="utf-8")
    return LaunchDescription([
        Node(package="rosbridge_server", executable="rosbridge_websocket", name="rosbridge_websocket",
             parameters=[{"port": cfg["network"]["rosbridge_port"], "address": "0.0.0.0"}],
             output="screen"),
        Node(package="robot_state_publisher", executable="robot_state_publisher",
             parameters=[{"robot_description": urdf_text}], output="screen"),
        python_node("joint_sim.py"),
        python_node("camera_node.py"),
        python_node("pick_logger.py"),
    ])
