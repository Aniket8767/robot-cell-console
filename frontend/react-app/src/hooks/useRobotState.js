import { useEffect, useState } from 'react';
import { TOPICS } from '../../../shared/topics.js';

/**
 * The robot state as REPORTED by the backend:
 *  - positions: { jointName: radians } from /joint_states
 *  - backendEstop: latch state from /estop_state
 *  - fresh: true once a /joint_states message arrived on the current connection
 */
export function useRobotState(client, connected) {
  const [positions, setPositions] = useState(null);
  const [backendEstop, setBackendEstop] = useState(false);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    if (!client) return undefined;
    const offStates = client.subscribe(TOPICS.JOINT_STATES.name, TOPICS.JOINT_STATES.type, (msg) => {
      setPositions(Object.fromEntries(msg.name.map((name, i) => [name, msg.position[i]])));
      setFresh(true);
    });
    const offEstop = client.subscribe(TOPICS.ESTOP_STATE.name, TOPICS.ESTOP_STATE.type, (msg) => {
      setBackendEstop(Boolean(msg.data));
    });
    return () => {
      offStates();
      offEstop();
    };
  }, [client]);

  useEffect(() => {
    if (!connected) setFresh(false);
  }, [connected]);

  return { positions, backendEstop, fresh };
}
