import { useEffect, useState } from 'react';
import { CONFIG_URL } from '../../../shared/topics.js';

const RETRY_MS = 2000;

/** Fetches /api/config.json (the backend's view of config/cell.yaml), retrying until it works. */
export function useCellConfig() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(CONFIG_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!cancelled) setConfig(data);
      } catch {
        if (!cancelled) timer = setTimeout(load, RETRY_MS);
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return config;
}
