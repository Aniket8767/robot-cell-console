<script setup>
const mmPerPixel = defineModel('mmPerPixel', { type: Number, required: true });
const beltSpeed = defineModel('beltSpeed', { type: Number, required: true });
const latencyMs = defineModel('latencyMs', { type: Number, required: true });
</script>

<template>
  <div class="settings">
    <label>mm / pixel
      <input type="number" step="0.01" min="0" v-model.number="mmPerPixel" />
    </label>
    <label>belt speed (m/s)
      <input type="number" step="0.01" min="0" v-model.number="beltSpeed" />
    </label>
    <label>latency (ms)
      <input type="number" step="10" min="0" v-model.number="latencyMs" />
    </label>
  </div>
</template>
