import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import URDFLoader from 'urdf-loader';

const MOVABLE = ['revolute', 'continuous', 'prismatic'];

function extractJointInfo(robot) {
  return Object.values(robot.joints)
    .filter((joint) => MOVABLE.includes(joint.jointType))
    .map((joint) => ({ name: joint.name, lower: joint.limit.lower, upper: joint.limit.upper }));
}

function disposeObject(root) {
  root.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) [].concat(node.material).forEach((material) => material.dispose());
  });
}

/**
 * 3D view of the URDF. It only DISPLAYS `positions` (from /joint_states);
 * it never reads the sliders. Joint limits are read from the URDF and passed up.
 */
export default function RobotViewer({ urdfUrl, positions, onJointsLoaded }) {
  const mountRef = useRef(null);
  const robotRef = useRef(null);
  const onLoadedRef = useRef(onJointsLoaded);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    onLoadedRef.current = onJointsLoaded;
  }, [onJointsLoaded]);

  useEffect(() => {
    const mount = mountRef.current;
    let disposed = false;
    let frameId = 0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe6e9ec);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8892a0, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(2, 3, 2);
    scene.add(sun);
    scene.add(new THREE.GridHelper(2, 20, 0x9aa3ad, 0xc3c9d0));

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 50);
    camera.position.set(1.4, 1.1, 1.4);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.35, 0);
    controls.update();

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    new URDFLoader().load(
      urdfUrl,
      (robot) => {
        if (disposed) return;
        robot.rotation.x = -Math.PI / 2; // URDF is Z-up, three.js is Y-up
        scene.add(robot);
        robotRef.current = robot;
        onLoadedRef.current(extractJointInfo(robot));
        setLoaded(true);
      },
      undefined,
      (loadError) => {
        if (!disposed) setError(String(loadError));
      },
    );

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      robotRef.current = null;
      setLoaded(false);
    };
  }, [urdfUrl]);

  useEffect(() => {
    const robot = robotRef.current;
    if (!robot || !positions) return;
    Object.entries(positions).forEach(([name, value]) => robot.setJointValue(name, value));
  }, [positions, loaded]);

  return (
    <div className="viewer" ref={mountRef}>
      {!loaded && !error && <p className="viewer-note">Loading robot model&hellip;</p>}
      {error && <p className="viewer-note error">Could not load URDF: {error}</p>}
    </div>
  );
}
