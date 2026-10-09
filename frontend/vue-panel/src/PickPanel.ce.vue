<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RosbridgeClient } from '../../shared/rosbridgeClient.js';
import { CONFIG_URL, STREAM_URL, TOPICS, defaultWsUrl } from '../../shared/topics.js';
import CalibrationInputs from './components/CalibrationInputs.vue';
import CameraView from './components/CameraView.vue';
import ReadoutTable from './components/ReadoutTable.vue';
import { compensationMm, pixelToOffsetMm } from './utils/pickMath';

// Attributes set by the host page: <pick-panel ws-url="..." stream-url="..." config-url="...">
const props = defineProps({
  wsUrl: { type: String, default: '' },
  streamUrl: { type: String, default: '' },
  configUrl: { type: String, default: '' },
});
const emit = defineEmits(['pick']);

const connected = ref(false);
const configLoaded = ref(false);
const streamKey = ref(0);
const sendStatus = ref('');
const click = ref(null);
const mmPerPixel = ref(0);
const beltSpeed = ref(0);
const latencyMs = ref(0);

const effectiveWsUrl = computed(() => props.wsUrl || defaultWsUrl());
const effectiveStreamUrl = computed(() => props.streamUrl || STREAM_URL);

const compensation = computed(() => compensationMm(beltSpeed.value, latencyMs.value));
const offset = computed(() => {
  if (!click.value || !Number.isFinite(mmPerPixel.value)) return null;
  return pixelToOffsetMm({ ...click.value, mmPerPixel: mmPerPixel.value });
});
const target = computed(() => {
  if (!offset.value || !Number.isFinite(compensation.value)) return null;
  return { x: offset.value.dx + compensation.value, y: offset.value.dy };
});

let client = null;
let configTimer = null;
let unmounted = false;
let hasConnectedBefore = false;

async function loadConfig() {
  try {
    const response = await fetch(props.configUrl || CONFIG_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const cfg = await response.json();
    mmPerPixel.value = cfg.calibration.mm_per_pixel;
    beltSpeed.value = cfg.conveyor.belt_speed_m_per_s;
    latencyMs.value = cfg.conveyor.pipeline_latency_ms;
    configLoaded.value = true;
  } catch {
    if (!unmounted) configTimer = setTimeout(loadConfig, 2000); // backend not up yet: keep trying
  }
}

function publishTarget() {
  if (!target.value || !client) return;
  const now = Date.now();
  const sent = client.publish(TOPICS.PICK_TARGET.name, TOPICS.PICK_TARGET.type, {
    header: { frame_id: 'camera_center', stamp: { sec: Math.floor(now / 1000), nanosec: (now % 1000) * 1e6 } },
    point: { x: target.value.x, y: target.value.y, z: 0 }, // millimetres
  });
  sendStatus.value = sent ? 'sent to /pick_target' : 'NOT sent: backend disconnected';
}

function onPick(point) {
  click.value = point;
  publishTarget();
  emit('pick', { ...point, target: target.value, compensationMm: compensation.value });
}

watch(connected, (isUp) => {
  if (!isUp) return;
  if (hasConnectedBefore) streamKey.value += 1; // backend came back: reload the MJPEG stream
  hasConnectedBefore = true;
});

onMounted(() => {
  client = new RosbridgeClient(effectiveWsUrl.value, { onStatusChange: (isUp) => { connected.value = isUp; } });
  client.connect();
  loadConfig();
});

onBeforeUnmount(() => {
  unmounted = true;
  clearTimeout(configTimer);
  if (client) client.close();
});
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <h2>Camera &amp; pick panel</h2>
      <span class="link" :class="connected ? 'link-ok' : 'link-bad'">
        {{ connected ? 'pick link connected' : 'pick link disconnected' }}
      </span>
    </header>

    <CameraView :stream-url="effectiveStreamUrl" :click="click" :reload-key="streamKey"
                :disabled="!configLoaded" @pick="onPick" />

    <p v-if="!configLoaded" class="muted">Waiting for the backend configuration&hellip;</p>
    <template v-else>
      <CalibrationInputs v-model:mmPerPixel="mmPerPixel" v-model:beltSpeed="beltSpeed"
                         v-model:latencyMs="latencyMs" />
      <ReadoutTable :click="click" :offset="offset" :compensation="compensation"
                    :target="target" :send-status="sendStatus" />
    </template>
  </section>
</template>

<style>
/* One stylesheet for the whole panel. It is injected into the custom element's shadow root. */
:host {
  display: block;
  --ink: #1b2430;
  --muted: #667282;
  --line: #c9ced4;
  --paper: #f6f7f8;
  --ok: #1e8e3e;
  --bad: #d6221f;
  --accent: #e8a300;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--ink);
}
.panel { background: var(--paper); border: 1px solid var(--line); border-radius: 6px; padding: 14px; }
.panel-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
.panel-head h2 { margin: 0; font-size: 1.05rem; }
.link { font-size: 0.8rem; font-weight: 600; }
.link-ok { color: var(--ok); }
.link-bad { color: var(--bad); }
.muted { color: var(--muted); }

.camera-frame { position: relative; line-height: 0; background: #111; user-select: none; }
.camera-img { display: block; width: 100%; height: auto; cursor: crosshair; }
.crosshair { position: absolute; inset: 0; pointer-events: none; }
.crosshair-h, .crosshair-v { position: absolute; background: var(--accent); box-shadow: 0 0 0 1px rgba(0,0,0,.55); }
.crosshair-h { left: 0; right: 0; top: 50%; height: 1px; }
.crosshair-v { top: 0; bottom: 0; left: 50%; width: 1px; }
.marker {
  position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%;
  border: 2px solid #fff; background: rgba(214, 34, 31, .85); pointer-events: none;
}

.settings { display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0; }
.settings label { display: flex; flex-direction: column; font-size: 0.78rem; color: var(--muted); gap: 3px; }
.settings input { width: 110px; padding: 5px 6px; border: 1px solid var(--line); border-radius: 4px; font-size: 0.95rem; }

.readout { width: 100%; border-collapse: collapse; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
.readout th { text-align: left; font-weight: 500; color: var(--muted); padding: 5px 10px 5px 0; width: 38%; vertical-align: top; }
.readout td { padding: 5px 0; }
.readout tr + tr { border-top: 1px solid var(--line); }
.status { display: block; font-size: 0.8rem; color: var(--muted); }
</style>
