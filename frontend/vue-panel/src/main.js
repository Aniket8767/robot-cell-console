import { defineCustomElement } from 'vue';
import PickPanel from './PickPanel.ce.vue';

// Registers <pick-panel>. Vue renders it (inside its own shadow DOM) wherever the tag appears.
if (!customElements.get('pick-panel')) {
  customElements.define('pick-panel', defineCustomElement(PickPanel));
}
