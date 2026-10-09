# ROS 2 backend: rosbridge + robot_state_publisher + simulator + camera.
# Default distro is Lyrical. If its apt packages are missing, build with
#   ROS_DISTRO=jazzy docker compose up --build
ARG ROS_DISTRO=lyrical
FROM ros:${ROS_DISTRO}-ros-base
ARG ROS_DISTRO

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ros-${ROS_DISTRO}-rosbridge-suite \
      ros-${ROS_DISTRO}-robot-state-publisher \
      python3-opencv python3-yaml \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 APP_DIR=/app CELL_CONFIG=/config/cell.yaml
COPY config/cell.yaml /config/cell.yaml
COPY backend/urdf /app/urdf
COPY backend/nodes /app/nodes
COPY backend/launch /app/launch
COPY backend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
