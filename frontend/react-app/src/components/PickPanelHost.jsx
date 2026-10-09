import { useEffect, useRef, useState } from 'react';
import { CONFIG_URL, STREAM_URL } from '../../../shared/topics.js';

const VUE_BUNDLE_URL = '/vue-panel/pick-panel.js'; // built separately from frontend/vue-panel

/**
 * Hosts the Vue 3 panel. The Vue bundle registers the <pick-panel> custom element; React just
 * renders the tag, passes URLs as attributes and listens for the DOM 'pick' event Vue emits.
 */
export default function PickPanelHost({ wsUrl, onPick }) {
  const elementRef = useRef(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import(/* @vite-ignore */ VUE_BUNDLE_URL).catch((error) => {
      if (!cancelled) setLoadError(String(error));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    const handlePick = (event) => onPick(event.detail[0]); // Vue wraps emit args in an array
    element.addEventListener('pick', handlePick);
    return () => element.removeEventListener('pick', handlePick);
  }, [onPick, loadError]);

  if (loadError) return <p className="error">Could not load the Vue camera panel: {loadError}</p>;
  return <pick-panel ref={elementRef} ws-url={wsUrl} stream-url={STREAM_URL} config-url={CONFIG_URL} />;
}
