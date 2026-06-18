import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildAtlas } from '../lib/cardTextures.js';
import { demoState } from '../data/demoState.js';

// ----- presets & live params (the repo's Leva role, hand-rolled) -----

export const PRESETS = {
  champagne: {
    label: 'Champagne',
    bg: '#1c1611',
    fogNear: 7,
    fogFar: 20,
    grid: '#c2a878',
    gridOpacity: 0.14,
    knot: '#e3c896',
    mono: 0,
    tint: '#e3c896',
    bloomStrength: 0.55,
    bloomRadius: 0.8,
    bloomThreshold: 0.62,
    dither: 0.22,
    scanlines: 0.16,
    aberration: 0.45,
    flicker: 0.25,
  },
  midnight: {
    label: 'Midnight',
    bg: '#0d0c10',
    fogNear: 7,
    fogFar: 19,
    grid: '#8d93b8',
    gridOpacity: 0.12,
    knot: '#cdd3ef',
    mono: 0,
    tint: '#cdd3ef',
    bloomStrength: 0.7,
    bloomRadius: 0.85,
    bloomThreshold: 0.6,
    dither: 0.3,
    scanlines: 0.22,
    aberration: 0.6,
    flicker: 0.3,
  },
  scifi: {
    label: 'Green SciFi',
    bg: '#020503',
    fogNear: 6,
    fogFar: 18,
    grid: '#2affa3',
    gridOpacity: 0.2,
    knot: '#5fffb5',
    mono: 1,
    tint: '#46ffa6',
    bloomStrength: 1.15,
    bloomRadius: 0.9,
    bloomThreshold: 0.32,
    dither: 0.55,
    scanlines: 0.42,
    aberration: 1.0,
    flicker: 0.55,
  },
};

const MOTION = {
  autoRotate: 0.0065, // helix units / s — the solar-system drift
  friction: 0.945,
  wheelForce: 0.00016,
  dragForce: 0.00055,
  radius: 5.1,
  height: 7.4,
  turns: 2.1,
  knotSpin: 0.16,
};

const CONFIG_FIELDS = [
  { key: 'autoRotate', label: 'Drift', min: 0, max: 0.03, step: 0.001 },
  { key: 'friction', label: 'Friction', min: 0.85, max: 0.99, step: 0.005 },
  { key: 'radius', label: 'Radius', min: 3.5, max: 7.5, step: 0.1 },
  { key: 'turns', label: 'Turns', min: 1, max: 4, step: 0.1 },
  { key: 'height', label: 'Height', min: 4, max: 12, step: 0.2 },
  { key: 'dither', label: 'Dither', min: 0, max: 1, step: 0.01 },
  { key: 'scanlines', label: 'Scanlines', min: 0, max: 1, step: 0.01 },
  { key: 'aberration', label: 'Aberration', min: 0, max: 2, step: 0.05 },
  { key: 'flicker', label: 'Flicker', min: 0, max: 1, step: 0.01 },
  { key: 'bloomStrength', label: 'Bloom', min: 0, max: 2.5, step: 0.05 },
  { key: 'bloomRadius', label: 'Bloom radius', min: 0, max: 1.5, step: 0.05 },
  { key: 'bloomThreshold', label: 'Bloom thresh', min: 0, max: 1, step: 0.02 },
];

// ----- card shaders: cylinder bend + dither/scanline/aberration/flicker/fade -----

const cardVertex = /* glsl */ `
  attribute float aT;
  attribute float aRand;
  attribute vec4 aUvRect;
  attribute vec2 aSize;
  uniform float uScroll;
  uniform float uTime;
  uniform float uRadius;
  uniform float uHeight;
  uniform float uTurns;
  varying vec2 vUv;
  varying vec4 vUvRect;
  varying float vRand;
  varying float vEdge;
  varying float vDepth;

  void main() {
    float t = fract(aT + uScroll);
    float ang = t * uTurns * 6.28318 ;
    float yBase = (t - 0.5) * uHeight + sin(uTime * 0.5 + aRand * 6.28318) * 0.06;
    // bend the plane onto the cylinder so cards curve like the reference
    vec2 local = position.xy * aSize;
    float worldAng = ang + local.x / uRadius;
    vec3 world = vec3(sin(worldAng) * uRadius, yBase + local.y, cos(worldAng) * uRadius);
    vUv = uv;
    vUvRect = aUvRect;
    vRand = aRand;
    vEdge = smoothstep(0.0, 0.07, t) * smoothstep(1.0, 0.93, t);
    vec4 mv = viewMatrix * vec4(world, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const cardFragment = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uTime;
  uniform float uVel;
  uniform float uDither;
  uniform float uScan;
  uniform float uAberr;
  uniform float uFlicker;
  uniform float uMono;
  uniform vec3 uTint;
  uniform vec3 uBg;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec2 vUv;
  varying vec4 vUvRect;
  varying float vRand;
  varying float vEdge;
  varying float vDepth;

  float bayer(vec2 p) {
    vec2 q = floor(mod(p, 4.0));
    float i = q.x + q.y * 4.0;
    // 4x4 bayer matrix, normalized
    float m = mod(i * 9.0, 16.0);
    return (m + 0.5) / 16.0;
  }

  void main() {
    vec2 uv = vUv;
    float ab = (0.0012 + uVel * 0.02) * uAberr;
    vec2 base = vUvRect.xy;
    vec2 scale = vUvRect.zw;
    vec3 col;
    col.r = texture2D(uAtlas, base + clamp(uv + vec2(ab, 0.0), 0.0, 1.0) * scale).r;
    col.g = texture2D(uAtlas, base + uv * scale).g;
    col.b = texture2D(uAtlas, base + clamp(uv - vec2(ab, 0.0), 0.0, 1.0) * scale).b;

    // monochrome preset: luminance becomes glowing tint on dark
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 monoCol = uTint * (1.15 - lum) + vec3(0.02);
    col = mix(col, monoCol, uMono);

    // ordered dithering (posterize + bayer threshold)
    float levels = 7.0;
    vec3 dithered = floor(col * levels + bayer(gl_FragCoord.xy)) / levels;
    col = mix(col, dithered, uDither);

    // scanlines
    float scan = sin(gl_FragCoord.y * 1.7) * 0.5 + 0.5;
    col *= 1.0 - uScan * 0.35 * scan;

    // flicker per card
    float fl = step(0.965, fract(sin((floor(uTime * 9.0) + vRand * 120.0) * 12.9898) * 43758.5));
    col *= 1.0 - fl * uFlicker * 0.35;

    // distance fade into the fog colour — the "pull" toward center
    float fog = smoothstep(uFogNear, uFogFar, vDepth);
    col = mix(col, uBg, fog * 0.92);

    float alpha = vEdge * (1.0 - fog * 0.85);
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

function buildKnotPoints(segments = 720) {
  // p=2, q=3 torus knot
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const r = 1 + 0.4 * Math.cos(3 * t);
    pts.push(new THREE.Vector3(r * Math.cos(2 * t), 0.55 * Math.sin(3 * t), r * Math.sin(2 * t)));
  }
  return pts;
}

export default function HelixScene({ onFocus }) {
  const containerRef = useRef(null);
  const paramsRef = useRef({ ...PRESETS.champagne, ...MOTION });
  const [presetKey, setPresetKey] = useState('champagne');
  const [showConfig, setShowConfig] = useState(false);
  const [, forceRender] = useState(0);
  const entriesRef = useRef([]);

  function applyPreset(key) {
    Object.assign(paramsRef.current, PRESETS[key]);
    setPresetKey(key);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let disposed = false;
    const params = paramsRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 60);
    camera.position.set(0, 0, params.radius + 6.2);

    const fog = new THREE.Fog(params.bg, params.fogNear + params.radius, params.fogFar + params.radius);
    scene.fog = fog;

    // grids above & below — perspective space like the reference
    const gridTop = new THREE.GridHelper(70, 56);
    const gridBottom = new THREE.GridHelper(70, 56);
    [gridTop, gridBottom].forEach((grid) => {
      grid.material.transparent = true;
      grid.material.depthWrite = false;
      scene.add(grid);
    });

    // particles drifting through the space
    const PARTICLES = 380;
    const positions = new Float32Array(PARTICLES * 3);
    for (let i = 0; i < PARTICLES; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(particleGeo, particleMat));

    // score knot: a torus-knot curve that draws itself in with the score
    const knotPts = buildKnotPoints();
    const knotGeo = new THREE.BufferGeometry().setFromPoints(knotPts);
    const knotMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.95 });
    const knot = new THREE.Line(knotGeo, knotMat);
    const ghostMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.1 });
    const ghost = new THREE.Line(knotGeo.clone(), ghostMat);
    const knotGroup = new THREE.Group();
    knotGroup.add(knot, ghost);
    knotGroup.scale.setScalar(1.45);
    scene.add(knotGroup);
    let knotProgress = 0;

    // glow core behind the knot
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 256;
    const gctx = glowCanvas.getContext('2d');
    const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,255,255,0.5)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.12)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 256, 256);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    glow.scale.setScalar(6);
    scene.add(glow);

    // instanced cards (built async once the atlas fonts are ready)
    let cardMesh = null;
    const cardUniforms = {
      uAtlas: { value: null },
      uScroll: { value: 0 },
      uTime: { value: 0 },
      uVel: { value: 0 },
      uRadius: { value: params.radius },
      uHeight: { value: params.height },
      uTurns: { value: params.turns },
      uDither: { value: params.dither },
      uScan: { value: params.scanlines },
      uAberr: { value: params.aberration },
      uFlicker: { value: params.flicker },
      uMono: { value: params.mono },
      uTint: { value: new THREE.Color(params.tint) },
      uBg: { value: new THREE.Color(params.bg) },
      uFogNear: { value: params.fogNear + params.radius },
      uFogFar: { value: params.fogFar + params.radius },
    };

    buildAtlas().then(({ canvas, entries }) => {
      if (disposed) return;
      // interleave sections among tiles so the spiral mixes both
      const sections = entries.filter((entry) => entry.kind === 'section');
      const tiles = entries.filter((entry) => entry.kind === 'tile');
      const ordered = [];
      let tileIndex = 0;
      sections.forEach((section, i) => {
        ordered.push(section);
        const take = Math.ceil((tiles.length - tileIndex) / (sections.length - i));
        for (let k = 0; k < take && tileIndex < tiles.length; k++) ordered.push(tiles[tileIndex++]);
      });
      entriesRef.current = ordered;

      const atlasTex = new THREE.CanvasTexture(canvas);
      atlasTex.colorSpace = THREE.SRGBColorSpace;
      atlasTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      cardUniforms.uAtlas.value = atlasTex;

      const N = ordered.length;
      const geo = new THREE.InstancedBufferGeometry();
      const plane = new THREE.PlaneGeometry(1, 1, 24, 1); // segments so the bend is smooth
      geo.index = plane.index;
      geo.attributes.position = plane.attributes.position;
      geo.attributes.uv = plane.attributes.uv;

      const aT = new Float32Array(N);
      const aRand = new Float32Array(N);
      const aUvRect = new Float32Array(N * 4);
      const aSize = new Float32Array(N * 2);
      ordered.forEach((entry, i) => {
        aT[i] = i / N;
        aRand[i] = Math.random();
        aUvRect.set(entry.uv, i * 4);
        aSize.set(entry.size, i * 2);
      });
      geo.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 1));
      geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(aRand, 1));
      geo.setAttribute('aUvRect', new THREE.InstancedBufferAttribute(aUvRect, 4));
      geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(aSize, 2));
      geo.instanceCount = N;

      const mat = new THREE.ShaderMaterial({
        vertexShader: cardVertex,
        fragmentShader: cardFragment,
        uniforms: cardUniforms,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
      });
      cardMesh = new THREE.Mesh(geo, mat);
      cardMesh.frustumCulled = false;
      scene.add(cardMesh);
      forceRender((n) => n + 1);
    });

    // post-processing: bloom
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), params.bloomStrength, params.bloomRadius, params.bloomThreshold);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight);
      composer.setSize(clientWidth, clientHeight);
      bloomPass.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    // ----- scroll physics -----
    const motion = { scroll: 0, vel: 0, dragging: false, lastX: 0, lastY: 0, moved: 0 };
    const pointerPar = { x: 0, y: 0 };

    const onWheel = (event) => {
      event.preventDefault();
      motion.vel += event.deltaY * params.wheelForce;
    };
    const onPointerDown = (event) => {
      motion.dragging = true;
      motion.moved = 0;
      motion.lastX = event.clientX;
      motion.lastY = event.clientY;
      container.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event) => {
      pointerPar.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerPar.y = (event.clientY / window.innerHeight - 0.5) * 2;
      if (!motion.dragging) return;
      const dx = event.clientX - motion.lastX;
      const dy = event.clientY - motion.lastY;
      motion.lastX = event.clientX;
      motion.lastY = event.clientY;
      motion.moved += Math.abs(dx) + Math.abs(dy);
      motion.vel = -(dx + dy * 0.6) * params.dragForce;
      motion.scroll += motion.vel;
    };
    const raycaster = new THREE.Raycaster();
    const onPointerUp = (event) => {
      const wasDrag = motion.moved > 6;
      motion.dragging = false;
      if (wasDrag || !cardMesh) return;
      // click → focus the card under the pointer
      const rect = container.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      // shader moves vertices, so raycast against the analytic helix instead:
      // find the instance whose screen-projected center is nearest the click
      let bestIdx = -1;
      let bestDist = 0.09;
      const N = entriesRef.current.length;
      for (let i = 0; i < N; i++) {
        const t = (aTOf(i, N) + motion.scroll) % 1;
        const tt = t < 0 ? t + 1 : t;
        const ang = tt * params.turns * Math.PI * 2;
        const world = new THREE.Vector3(Math.sin(ang) * params.radius, (tt - 0.5) * params.height, Math.cos(ang) * params.radius);
        if (world.z < params.radius * 0.25) continue; // only front-ish cards
        const proj = world.clone().project(camera);
        const dist = Math.hypot(proj.x - ndc.x, proj.y - ndc.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) onFocus?.(entriesRef.current[bestIdx]);
    };
    const aTOf = (i, N) => i / N;

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);

    // ----- frame loop -----
    let frame = 0;
    let running = true;
    const clock = new THREE.Clock();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const loop = () => {
      if (!running) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      if (!motion.dragging) {
        motion.scroll += motion.vel;
        motion.vel *= params.friction;
        if (!reducedMotion) motion.scroll += params.autoRotate * dt; // solar-system drift
      }
      const speed = Math.min(Math.abs(motion.vel) * 60, 1.5);

      cardUniforms.uScroll.value = motion.scroll;
      cardUniforms.uTime.value = t;
      cardUniforms.uVel.value += (speed - cardUniforms.uVel.value) * 0.1;
      cardUniforms.uRadius.value = params.radius;
      cardUniforms.uHeight.value = params.height;
      cardUniforms.uTurns.value = params.turns;
      cardUniforms.uDither.value = params.dither;
      cardUniforms.uScan.value = params.scanlines;
      cardUniforms.uAberr.value = params.aberration;
      cardUniforms.uFlicker.value = params.flicker;
      cardUniforms.uMono.value = params.mono;
      cardUniforms.uTint.value.set(params.tint);
      cardUniforms.uBg.value.set(params.bg);
      cardUniforms.uFogNear.value = params.fogNear + params.radius * 0.4;
      cardUniforms.uFogFar.value = params.fogFar + params.radius;

      // environment follows the preset live
      scene.background = cardUniforms.uBg.value;
      fog.color.set(params.bg);
      fog.near = params.fogNear + params.radius * 0.2;
      fog.far = params.fogFar + params.radius;
      gridTop.material.color.set(params.grid);
      gridBottom.material.color.set(params.grid);
      gridTop.material.opacity = params.gridOpacity;
      gridBottom.material.opacity = params.gridOpacity;
      gridTop.position.y = params.height / 2 + 1.6;
      gridBottom.position.y = -params.height / 2 - 1.6;
      particleMat.color.set(params.knot);
      knotMat.color.set(params.knot);
      ghostMat.color.set(params.knot);
      glow.material.color.set(params.knot);

      // the score draws the knot in
      const targetProgress = Math.min(Math.max(demoState.score, 0), 100) / 100;
      knotProgress += (targetProgress - knotProgress) * 0.02;
      knotGeo.setDrawRange(0, Math.max(2, Math.floor(721 * knotProgress)));
      knotGroup.rotation.y += dt * (params.knotSpin + speed * 1.4);
      knotGroup.rotation.x = Math.sin(t * 0.22) * 0.35;
      glow.material.opacity = 0.35 + targetProgress * 0.3 + speed * 0.1;
      glow.scale.setScalar(5.4 + Math.sin(t * 0.8) * 0.25);

      camera.position.x += (pointerPar.x * 0.7 - camera.position.x) * 0.04;
      camera.position.y += (-pointerPar.y * 0.5 - camera.position.y) * 0.04;
      camera.position.z = params.radius + 6.2;
      camera.lookAt(0, 0, 0);

      bloomPass.strength = params.bloomStrength;
      bloomPass.radius = params.bloomRadius;
      bloomPass.threshold = params.bloomThreshold;

      composer.render();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        clock.getDelta();
        frame = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      composer.dispose();
      if (cardMesh) {
        cardMesh.geometry.dispose();
        cardMesh.material.dispose();
        cardUniforms.uAtlas.value?.dispose();
      }
      knotGeo.dispose();
      knotMat.dispose();
      ghostMat.dispose();
      glowTex.dispose();
      glow.material.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 cursor-grab touch-none select-none active:cursor-grabbing">
      <div ref={containerRef} className="absolute inset-0" />
      {/* gradient pull toward center */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(115% 100% at 50% 50%, transparent 42%, rgba(5,3,2,0.62) 100%)' }}
      />
      <div className="stage-scanlines pointer-events-none absolute inset-0 opacity-50" />

      {/* presets + config */}
      <div className="absolute bottom-5 left-5 z-20 flex flex-col gap-2">
        {showConfig && (
          <div className="w-60 rounded-xl border border-white/10 bg-black/55 p-3 backdrop-blur">
            {CONFIG_FIELDS.map((field) => (
              <label key={field.key} className="mb-1.5 flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-cream/55">
                <span className="w-20 shrink-0">{field.label}</span>
                <input
                  className="h-1 w-full accent-[#c2a878]"
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  defaultValue={paramsRef.current[field.key]}
                  onChange={(event) => {
                    paramsRef.current[field.key] = Number(event.target.value);
                  }}
                />
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`rounded-md border px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition ${
                presetKey === key
                  ? 'border-gold/70 bg-gold/15 text-cream'
                  : 'border-white/10 bg-black/40 text-cream/50 hover:text-cream'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowConfig((current) => !current)}
            className={`rounded-md border px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition ${
              showConfig ? 'border-gold/70 bg-gold/15 text-cream' : 'border-white/10 bg-black/40 text-cream/50 hover:text-cream'
            }`}
          >
            Config
          </button>
        </div>
      </div>
    </div>
  );
}
