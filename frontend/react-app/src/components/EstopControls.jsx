export default function EstopControls({ locked, connected, hasHome, onHome, onLatch, onReset }) {
  return (
    <div className="controls">
      {locked && (
        <div className="estop-banner" role="alert">
          E-STOP LATCHED. The robot is stopped and joint commands are blocked. Press RESET to continue.
        </div>
      )}
      <div className="control-row">
        <button type="button" className="btn btn-home" onClick={onHome}
                disabled={!connected || locked || !hasHome}>
          HOME
        </button>
        <button type="button" className="btn btn-estop" onClick={onLatch} disabled={locked}>
          E-STOP
        </button>
        <button type="button" className="btn btn-reset" onClick={onReset} disabled={!locked}>
          RESET
        </button>
      </div>
    </div>
  );
}
