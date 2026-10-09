#!/bin/bash
set -e
source "/opt/ros/${ROS_DISTRO}/setup.bash"
exec ros2 launch /app/launch/cell.launch.py
