// Topic names, message types and URLs shared by the React app and the Vue panel.
export const TOPICS = {
  JOINT_COMMAND: { name: '/joint_command', type: 'sensor_msgs/JointState' },
  JOINT_STATES: { name: '/joint_states', type: 'sensor_msgs/JointState' },
  ESTOP: { name: '/estop', type: 'std_msgs/Bool' },
  ESTOP_STATE: { name: '/estop_state', type: 'std_msgs/Bool' },
  PICK_TARGET: { name: '/pick_target', type: 'geometry_msgs/PointStamped' },
};

// nginx (frontend/nginx.conf) maps these paths to the backend container.
export const WS_PATH = '/ws';
export const API_BASE = '/api';
export const STREAM_URL = `${API_BASE}/stream.mjpg`;
export const CONFIG_URL = `${API_BASE}/config.json`;

export function defaultWsUrl(loc = window.location) {
  const scheme = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${loc.host}${WS_PATH}`;
}
