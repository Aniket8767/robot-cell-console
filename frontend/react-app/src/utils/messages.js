// Builds the sensor_msgs/JointState sent on /joint_command (positions in radians).
export function buildJointCommand(positionsByName) {
  const names = Object.keys(positionsByName);
  return {
    header: { stamp: { sec: 0, nanosec: 0 }, frame_id: '' },
    name: names,
    position: names.map((name) => positionsByName[name]),
    velocity: [],
    effort: [],
  };
}
