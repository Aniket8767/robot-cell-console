<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { clickToSourcePixel } from '../utils/pickMath';

const props = defineProps({
  streamUrl: { type: String, required: true },
  click: { type: Object, default: null }, // last click: { u, v, srcWidth, srcHeight, ... }
  reloadKey: { type: Number, default: 0 }, // bump to reload the stream (e.g. after a backend restart)
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['pick']);

const retry = ref(0);
let retryTimer = null;

const src = computed(() => `${props.streamUrl}?k=${props.reloadKey}-${retry.value}`);

const markerStyle = computed(() => {
  if (!props.click) return null;
  return {
    left: `${(props.click.u / props.click.srcWidth) * 100}%`,
    top: `${(props.click.v / props.click.srcHeight) * 100}%`,
  };
});

function onStreamError() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { retry.value += 1; }, 2000);
}

function onImageClick(event) {
  const img = event.currentTarget;
  if (props.disabled || !img.naturalWidth) return; // no frame decoded yet
  emit('pick', clickToSourcePixel({
    clientX: event.clientX,
    clientY: event.clientY,
    rect: img.getBoundingClientRect(),
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
  }));
}

onBeforeUnmount(() => clearTimeout(retryTimer));
</script>

<template>
  <div class="camera-frame">
    <img class="camera-img" :src="src" alt="Overhead camera" draggable="false"
         @click="onImageClick" @error="onStreamError" />
    <div class="crosshair" aria-hidden="true">
      <span class="crosshair-h"></span>
      <span class="crosshair-v"></span>
    </div>
    <span v-if="markerStyle" class="marker" :style="markerStyle"></span>
  </div>
</template>
