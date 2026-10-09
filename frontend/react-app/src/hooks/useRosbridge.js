import { useEffect, useState } from 'react';
import { RosbridgeClient } from '../../../shared/rosbridgeClient.js';

/** Owns one rosbridge connection. Reconnects automatically; closes on unmount. */
export function useRosbridge(url) {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const rosClient = new RosbridgeClient(url, { onStatusChange: setConnected });
    setClient(rosClient);
    rosClient.connect();
    return () => {
      rosClient.close();
      setClient(null);
    };
  }, [url]);

  return { client, connected };
}
