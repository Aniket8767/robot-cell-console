// Minimal rosbridge (v2 JSON protocol) client with automatic reconnect.
// Used by both the React app and the Vue panel, so the protocol lives in one place.
//
// - subscriptions and advertisements are remembered and re-sent after every reconnect
// - close() stops reconnecting and releases the socket and timer

export class RosbridgeClient {
  constructor(url, { reconnectMs = 1000, onStatusChange = () => {} } = {}) {
    this.url = url;
    this.reconnectMs = reconnectMs;
    this.onStatusChange = onStatusChange;
    this.ws = null;
    this.timer = null;
    this.closed = true;
    this.subscriptions = new Map(); // topic -> { type, throttleRate, listeners:Set }
    this.advertised = new Map(); // topic -> type
  }

  connect() {
    this.closed = false;
    this._open();
  }

  close() {
    this.closed = true;
    clearTimeout(this.timer);
    this.timer = null;
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      ws.close();
    }
    this.onStatusChange(false);
  }

  subscribe(topic, type, callback, throttleRate = 0) {
    let entry = this.subscriptions.get(topic);
    if (!entry) {
      entry = { type, throttleRate, listeners: new Set() };
      this.subscriptions.set(topic, entry);
      this._sendSubscribe(topic, entry);
    }
    entry.listeners.add(callback);
    return () => {
      entry.listeners.delete(callback);
      if (entry.listeners.size === 0 && this.subscriptions.get(topic) === entry) {
        this.subscriptions.delete(topic);
        this._send({ op: 'unsubscribe', topic });
      }
    };
  }

  /** Returns true if the message was handed to an open socket. */
  publish(topic, type, msg) {
    if (!this.advertised.has(topic)) {
      this.advertised.set(topic, type);
      this._send({ op: 'advertise', topic, type });
    }
    return this._send({ op: 'publish', topic, msg });
  }

  _open() {
    if (this.closed) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.onStatusChange(true);
      this.subscriptions.forEach((entry, topic) => this._sendSubscribe(topic, entry));
      this.advertised.forEach((type, topic) => this._send({ op: 'advertise', topic, type }));
    };
    ws.onmessage = (event) => this._handleMessage(event.data);
    ws.onerror = () => {}; // onclose always follows
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.onStatusChange(false);
      this.timer = setTimeout(() => this._open(), this.reconnectMs);
    };
  }

  _sendSubscribe(topic, entry) {
    this._send({ op: 'subscribe', topic, type: entry.type, throttle_rate: entry.throttleRate });
  }

  _send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  _handleMessage(raw) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (data.op !== 'publish') return;
    const entry = this.subscriptions.get(data.topic);
    if (entry) entry.listeners.forEach((listener) => listener(data.msg));
  }
}
