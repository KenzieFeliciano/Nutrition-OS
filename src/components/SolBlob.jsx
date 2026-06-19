import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// The same torus-knot curve drawn at the center of the vortex (HelixSceneDemo),
// rendered small here so the corner Sol icon visually reads as that core thread.
function buildKnotCurve(segments = 600) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const r = 1 + 0.4 * Math.cos(3 * t);
    pts.push(new THREE.Vector3(r * Math.cos(2 * t), 0.55 * Math.sin(3 * t), r * Math.sin(2 * t)));
  }
  return new THREE.CatmullRomCurve3(pts, true);
}

export default function SolBlob({ thinking = false, size = 48 }) {
  const containerRef = useRef(null);
  const thinkingRef = useRef(thinking);

  useEffect(() => {
    thinkingRef.current = thinking;
  }, [thinking]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
    camera.position.z = 3.6;

    const curve = buildKnotCurve();
    const geometry = new THREE.TubeGeometry(curve, 600, 0.05, 8, true);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#8a8073'),
      transparent: true,
      opacity: 0.92,
    });
    const knot = new THREE.Mesh(geometry, material);
    knot.scale.setScalar(0.92);
    scene.add(knot);

    let frame = 0;
    let running = true;
    let spinTime = 0;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      const dt = clock.getDelta();
      const speed = thinkingRef.current ? 1.4 : 0.5;
      spinTime += dt * speed;
      const targetOpacity = thinkingRef.current ? 1.0 : 0.85;
      material.opacity += (targetOpacity - material.opacity) * 0.06;
      knot.rotation.y += dt * speed;
      knot.rotation.x = Math.sin(spinTime * 0.5) * 0.3;
      renderer.render(scene, camera);
    };

    const loop = () => {
      if (!running) return;
      renderFrame();
      frame = requestAnimationFrame(loop);
    };

    if (reducedMotion) {
      renderFrame();
    } else {
      loop();
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!reducedMotion && !running) {
        running = true;
        clock.getDelta();
        loop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [size]);

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        borderRadius: '9999px',
        background: 'radial-gradient(circle at 38% 32%, rgba(168,179,159,0.3), rgba(168,179,159,0.1) 58%, transparent 78%)',
      }}
      aria-hidden="true"
    />
  );
}
