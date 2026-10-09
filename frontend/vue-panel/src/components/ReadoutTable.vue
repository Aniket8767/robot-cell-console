<script setup>
import { computed } from 'vue';

const props = defineProps({
  click: { type: Object, default: null },
  offset: { type: Object, default: null },
  compensation: { type: Number, default: 0 },
  target: { type: Object, default: null },
  sendStatus: { type: String, default: '' },
});

const fmt = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '-');
const scale = computed(() => (props.click ? props.click.srcWidth / props.click.displayWidth : null));
</script>

<template>
  <table class="readout">
    <tbody>
      <tr>
        <th>Pixel (u, v)</th>
        <td v-if="click">({{ fmt(click.u) }}, {{ fmt(click.v) }}) of {{ click.srcWidth }}&times;{{ click.srcHeight }}</td>
        <td v-else class="muted">click the image</td>
      </tr>
      <tr>
        <th>Display scale</th>
        <td v-if="click">shown at {{ fmt(click.displayWidth, 0) }} px wide, source / display = {{ fmt(scale, 2) }}</td>
        <td v-else class="muted">-</td>
      </tr>
      <tr>
        <th>Offset from centre</th>
        <td v-if="offset">{{ fmt(offset.du) }} px, {{ fmt(offset.dv) }} px</td>
        <td v-else class="muted">-</td>
      </tr>
      <tr>
        <th>&Delta;x, &Delta;y</th>
        <td v-if="offset"><strong>{{ fmt(offset.dx, 2) }} mm, {{ fmt(offset.dy, 2) }} mm</strong></td>
        <td v-else class="muted">-</td>
      </tr>
      <tr>
        <th>Belt compensation (+X)</th>
        <td><strong>{{ fmt(compensation, 2) }} mm</strong></td>
      </tr>
      <tr>
        <th>Pick target sent</th>
        <td v-if="target">x = {{ fmt(target.x, 2) }} mm (&Delta;x + compensation), y = {{ fmt(target.y, 2) }} mm
          <span class="status">{{ sendStatus }}</span></td>
        <td v-else class="muted">-</td>
      </tr>
    </tbody>
  </table>
</template>
