export default function ConnectionBadge({ connected, url }) {
  return (
    <div className={`badge ${connected ? 'badge-ok' : 'badge-bad'}`} role="status">
      <span className="badge-dot" />
      <span className="badge-text">
        <strong>{connected ? 'Connected' : 'Disconnected, retrying'}</strong>
        <code>{url}</code>
      </span>
    </div>
  );
}
