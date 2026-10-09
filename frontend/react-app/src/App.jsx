import { useCallback, useEffect, useState } from 'react';
import { TOPICS, defaultWsUrl } from '../../shared/topics.js';
import ConnectionBadge from './components/ConnectionBadge.jsx';
import EstopControls from './components/EstopControls.jsx';
import JointSlider from './components/JointSlider.jsx';
import PickPanelHost from './components/PickPanelHost.jsx';
import RobotViewer from './components/RobotViewer.jsx';
import { useCellConfig } from './hooks/useCellConfig.js';
import { useEstop } from './hooks/useEstop.js';
import { useRobotState } from './hooks/useRobotState.js';
import { useRosbridge } from './hooks/useRosbridge.js';
import { buildJointCommand } from './utils/messages.js';

const WS_URL = defaultWsUrl();
const URDF_URL = '/robot/urdf/ur5e.urdf';

export default function App() {
  const { client, connected } = useRosbridge(WS_URL);
  const config = useCellConfig();
  const { positions, backendEstop, fresh } = useRobotState(client, connected);
  const { locked, latch, reset } = useEstop(client, connected, backendEstop);

  const [joints, setJoints] = useState([]); // [{ name, lower, upper }] read from the URDF
  const [targets, setTargets] = useState(null); // what the sliders ask for (radians)
  const [lastPick, setLastPick] = useState(null);

  // (Re)sync the sliders to the robot's reported pose after every (re)connection.
  useEffect(() => {
    if (!connected) setTargets(null);
  }, [connected]);
  useEffect(() => {
    if (connected && fresh && targets === null) setTargets(positions);
  }, [connected, fresh, targets, positions]);

  const sendJointCommand = useCallback((commanded) => {
    if (locked || !client) return; // no joint commands while E-STOP is latched
    client.publish(TOPICS.JOINT_COMMAND.name, TOPICS.JOINT_COMMAND.type, buildJointCommand(commanded));
  }, [client, locked]);

  const handleSlider = (name, value) => {
    const next = { ...targets, [name]: value };
    setTargets(next);
    sendJointCommand(next);
  };

  const handleHome = () => {
    const home = config.robot.home_pose;
    const next = { ...targets, ...home };
    setTargets(next);
    sendJointCommand(next);
  };

  const handleReset = () => {
    reset();
    setTargets(positions); // the robot held its pose during E-STOP: show it
  };

  const handlePick = useCallback((pick) => setLastPick(pick), []);

  const sliderValues = (locked ? positions : targets) ?? positions;
  const slidersDisabled = !connected || locked || targets === null;

  return (
    <div className="app">
      <header className="app-head">
        <h1>Robot Cell Operator Console</h1>
        <ConnectionBadge connected={connected} url={WS_URL} />
      </header>

      <main className="layout">
        <section className="card">
          <h2>Main console</h2>
          <RobotViewer urdfUrl={URDF_URL} positions={positions} onJointsLoaded={setJoints} />
          <EstopControls locked={locked} connected={connected} hasHome={Boolean(config) && targets !== null}
                         onHome={handleHome} onLatch={latch} onReset={handleReset} />
          <div className="sliders">
            {joints.length === 0 || !sliderValues ? (
              <p className="muted">Waiting for the robot model and /joint_states&hellip;</p>
            ) : (
              joints.map((joint) => (
                <JointSlider key={joint.name} name={joint.name} lower={joint.lower} upper={joint.upper}
                             value={sliderValues[joint.name] ?? 0} reported={positions?.[joint.name] ?? 0}
                             disabled={slidersDisabled} onChange={handleSlider} />
              ))
            )}
          </div>
        </section>

        <aside className="card card-vue">
          <PickPanelHost wsUrl={WS_URL} onPick={handlePick} />
          <p className="muted small">
            {lastPick
              ? `Last pick event from the Vue panel: pixel (${lastPick.u.toFixed(1)}, ${lastPick.v.toFixed(1)})`
              : 'No pick event received from the Vue panel yet.'}
          </p>
        </aside>
      </main>
    </div>
  );
}
