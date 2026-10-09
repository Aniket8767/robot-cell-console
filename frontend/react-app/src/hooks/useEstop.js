import { useCallback, useEffect, useState } from 'react';
import { TOPICS } from '../../../shared/topics.js';

/**
 * E-STOP control. `locked` is true if either this UI latched it or the backend reports it latched.
 * While latched locally and connected, the latch is (re)sent to the backend, so an E-STOP pressed
 * during a connection drop still reaches the backend once the link is back.
 */
export function useEstop(client, connected, backendEstop) {
  const [localLatch, setLocalLatch] = useState(false);

  useEffect(() => {
    if (client && connected && localLatch) {
      client.publish(TOPICS.ESTOP.name, TOPICS.ESTOP.type, { data: true });
    }
  }, [client, connected, localLatch]);

  const latch = useCallback(() => setLocalLatch(true), []);
  const reset = useCallback(() => {
    setLocalLatch(false);
    if (client) client.publish(TOPICS.ESTOP.name, TOPICS.ESTOP.type, { data: false });
  }, [client]);

  return { locked: localLatch || backendEstop, latch, reset };
}
