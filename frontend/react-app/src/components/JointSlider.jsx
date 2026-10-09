import { radToDeg } from '../utils/angles';

export default function JointSlider({ name, lower, upper, value, reported, disabled, onChange }) {
  const inputId = `joint-${name}`;
  return (
    <div className={`slider ${disabled ? 'slider-disabled' : ''}`}>
      <div className="slider-head">
        <label htmlFor={inputId}>{name}</label>
        <span className="slider-values">
          <strong>{radToDeg(value).toFixed(1)}&deg;</strong> / {value.toFixed(3)} rad
        </span>
      </div>
      <input id={inputId} type="range" min={lower} max={upper} step="0.001" value={value}
             disabled={disabled} onChange={(event) => onChange(name, Number(event.target.value))} />
      <div className="slider-foot">
        <span>{radToDeg(lower).toFixed(0)}&deg;</span>
        <span>robot reports {radToDeg(reported).toFixed(1)}&deg;</span>
        <span>{radToDeg(upper).toFixed(0)}&deg;</span>
      </div>
    </div>
  );
}
