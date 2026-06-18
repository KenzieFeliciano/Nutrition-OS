// Wellness vortex — single warm preset, rounded-rect SDF masking (ported from the
// cortiz2894/showcase-images reference), interleaved info cards + wellness photos.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildWellnessAtlas } from '../lib/wellnessAtlas.js';
import { demoState } from '../data/demoState.js';

// ── Single warm/neutral preset ────────────────────────────────────────────────

const P = {
  bg: '#faf8f4',          // white stage
  fogNear: 5,
  fogFar: 15,
  grid: '#cabfad',
  gridOpacity: 0.07,
  knot: '#3a2c21',        // espresso
  border: '#f1ebdd',      // cream card edge (pops on white)
  corner: '#c9a87a',      // latte
};

const MOTION = {
  autoRotate: 0.006,
  friction: 0.945,
  wheelForce: 0.00016,
  dragForce: 0.00055,
  radius: 3.9,   // tighter cylinder → cards closer to center
  height: 4.2,   // less vertical spread → cards squished together
  turns: 2.1,
  knotSpin: 0.14,
};

// ── Shaders ───────────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  attribute float aT;
  attribute float aRand;
  attribute float aTile;
  uniform float uScroll;
  uniform float uTime;
  uniform float uRadius;
  uniform float uHeight;
  uniform float uTurns;
  varying vec2 vUv;
  varying float vTile;
  varying float vRand;
  varying float vDepth;
  varying float vWorldY;

  void main() {
    float t = fract(aT + uScroll);
    float ang = t * uTurns * 6.28318;
    float yBase = (t - 0.5) * uHeight + sin(uTime * 0.5 + aRand * 6.28318) * 0.05;
    vec2 local = position.xy;
    float worldAng = ang + local.x / uRadius;
    vec3 world = vec3(sin(worldAng) * uRadius, yBase + local.y, cos(worldAng) * uRadius);
    vUv = uv;
    vTile = aTile;
    vRand = aRand;
    vWorldY = yBase;
    vec4 mv = viewMatrix * vec4(world, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uCols;
  uniform float uRows;
  uniform float uTime;
  uniform float uRadius;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uBg;
  uniform vec3 uBorder;
  uniform vec3 uCorner;
  uniform float uBorderWidth;
  uniform float uBorderRadius;
  uniform float uCornerSize;
  uniform float uCornerWidth;
  uniform float uCornerOffset;
  uniform float uChroma;
  varying vec2 vUv;
  varying float vTile;
  varying float vRand;
  varying float vDepth;
  varying float vWorldY;

  vec2 getTileUV(vec2 local) {
    float idx = floor(vTile + 0.5);
    float col = mod(idx, uCols);
    float row = floor(idx / uCols);
    float u = (col + local.x) / uCols;
    float v = 1.0 - (row + 1.0 - local.y) / uRows;
    return vec2(u, v);
  }

  // Rounded-box SDF in centered coords (p: -0.5..0.5), b = half-size, r = radius
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  // Corner-bracket mask
  float cornerMask(vec2 uv, float len, float w, float o) {
    float m = 0.0;
    if (uv.x >= o && uv.x < o+len && uv.y >= o && uv.y < o+w) m = 1.0;
    if (uv.x >= o && uv.x < o+w && uv.y >= o && uv.y < o+len) m = 1.0;
    if (uv.x > 1.0-o-len && uv.x <= 1.0-o && uv.y > 1.0-o-w && uv.y <= 1.0-o) m = 1.0;
    if (uv.x > 1.0-o-w && uv.x <= 1.0-o && uv.y > 1.0-o-len && uv.y <= 1.0-o) m = 1.0;
    return m;
  }

  void main() {
    // Back-facing cards (far side of the cylinder) would otherwise show mirrored
    // text — flip U so every card reads correctly from the camera.
    vec2 uv = vUv;
    if (!gl_FrontFacing) uv.x = 1.0 - uv.x;

    vec2 centered = uv - 0.5;
    float aa = 0.004;

    // Rounded image mask → transparent outside the card. This is what kills the
    // hard rectangular border / white-box bleed entirely.
    float imgDist = sdRoundedBox(centered, vec2(0.5), uBorderRadius);
    float imageMask = 1.0 - smoothstep(-aa, aa, imgDist);

    // Border stroke just inside the rounded edge
    float bDist = sdRoundedBox(centered, vec2(0.5), uBorderRadius);
    float borderMask = clamp(
      (1.0 - smoothstep(-aa, aa, bDist)) - (1.0 - smoothstep(-aa, aa, bDist + uBorderWidth)),
      0.0, 1.0);

    // Sample atlas tile (slight chromatic split)
    vec2 ca = vec2(uChroma, 0.0);
    float r = texture2D(uAtlas, getTileUV(uv + ca)).r;
    float g = texture2D(uAtlas, getTileUV(uv)).g;
    float b = texture2D(uAtlas, getTileUV(uv - ca)).b;
    vec3 color = vec3(r, g, b);

    // Gentle scanline + depth shaping (kept very subtle for the light theme)
    color *= 1.0 - 0.04 * (sin((vWorldY * 24.0 + uTime * 2.2) * 3.14159) * 0.5 + 0.5);

    // Border + corner overlays
    color = mix(color, uBorder, borderMask);
    float corners = cornerMask(uv, uCornerSize, uCornerWidth, uCornerOffset);
    color = mix(color, uCorner, corners);

    // Distance fade into the background fog (front cards crisp, back cards melt in)
    float fog = smoothstep(uFogNear, uFogFar, vDepth);
    color = mix(color, uBg, fog * 0.9);

    float alpha = max(imageMask, max(borderMask, corners)) * (1.0 - fog * 0.85);
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

function buildKnotCurve(segments = 600) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const r = 1 + 0.4 * Math.cos(3 * t);
    pts.push(new THREE.Vector3(r * Math.cos(2 * t), 0.55 * Math.sin(3 * t), r * Math.sin(2 * t)));
  }
  return new THREE.CatmullRomCurve3(pts, true);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HelixSceneDemo({ onFocus }) {
  const containerRef = useRef(null);
  const entriesRef = useRef([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let disposed = false;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(P.bg);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 60);
    camera.position.set(0, 0, MOTION.radius + 6.2);

    const fog = new THREE.Fog(P.bg, P.fogNear + MOTION.radius, P.fogFar + MOTION.radius);
    scene.fog = fog;

    // Grids above & below
    const gridTop = new THREE.GridHelper(70, 56, P.grid, P.grid);
    const gridBottom = new THREE.GridHelper(70, 56, P.grid, P.grid);
    [gridTop, gridBottom].forEach((g) => {
      g.material.transparent = true;
      g.material.opacity = P.gridOpacity;
      g.material.depthWrite = false;
      scene.add(g);
    });
    gridTop.position.y = MOTION.height / 2 + 1.6;
    gridBottom.position.y = -MOTION.height / 2 - 1.6;

    // Ambient motes
    const PARTICLES = 220;
    const pPos = new Float32Array(PARTICLES * 3);
    for (let i = 0; i < PARTICLES; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 26;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.04, color: new THREE.Color(P.knot), transparent: true,
      opacity: 0.35, depthWrite: false,
    });
    scene.add(new THREE.Points(particleGeo, particleMat));

    // Thin torus-knot tube in the core
    const knotCurve = buildKnotCurve();
    const knotGeo = new THREE.TubeGeometry(knotCurve, 600, 0.012, 8, true);
    const knotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.knot), transparent: true, opacity: 0.85 });
    const knotGroup = new THREE.Group();
    knotGroup.add(new THREE.Mesh(knotGeo, knotMat));
    knotGroup.scale.setScalar(1.4);
    scene.add(knotGroup);

    // Cards (built once the atlas — including remote photos — is ready)
    let cardMesh = null;
    const uniforms = {
      uAtlas: { value: null },
      uCols: { value: 1 },
      uRows: { value: 1 },
      uScroll: { value: 0 },
      uTime: { value: 0 },
      uRadius: { value: MOTION.radius },
      uHeight: { value: MOTION.height },
      uTurns: { value: MOTION.turns },
      uFogNear: { value: P.fogNear + MOTION.radius },
      uFogFar: { value: P.fogFar + MOTION.radius },
      uBg: { value: new THREE.Color(P.bg) },
      uBorder: { value: new THREE.Color(P.border) },
      uCorner: { value: new THREE.Color(P.corner) },
      uBorderWidth: { value: 0.012 },
      uBorderRadius: { value: 0.07 },
      uCornerSize: { value: 0.07 },
      uCornerWidth: { value: 0.009 },
      uCornerOffset: { value: 0.035 },
      uChroma: { value: 0.0035 },
    };

    buildWellnessAtlas().then(({ canvas, cols, rows, entries, tileAspect }) => {
      if (disposed) return;
      entriesRef.current = entries;

      const atlasTex = new THREE.CanvasTexture(canvas);
      atlasTex.colorSpace = THREE.SRGBColorSpace;
      atlasTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      atlasTex.minFilter = THREE.LinearFilter;
      atlasTex.magFilter = THREE.LinearFilter;
      uniforms.uAtlas.value = atlasTex;
      uniforms.uCols.value = cols;
      uniforms.uRows.value = rows;

      const N = entries.length;
      const planeW = 2.5;
      const planeH = planeW / tileAspect;
      const geo = new THREE.InstancedBufferGeometry();
      const plane = new THREE.PlaneGeometry(planeW, planeH, 24, 1);
      geo.index = plane.index;
      geo.attributes.position = plane.attributes.position;
      geo.attributes.uv = plane.attributes.uv;

      const aT = new Float32Array(N);
      const aRand = new Float32Array(N);
      const aTile = new Float32Array(N);
      entries.forEach((entry, i) => {
        aT[i] = i / N + 0.5 / N;
        aRand[i] = Math.random();
        aTile[i] = entry.tileIndex;
      });
      geo.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 1));
      geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(aRand, 1));
      geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(aTile, 1));
      geo.instanceCount = N;

      const mat = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, uniforms,
        transparent: true, side: THREE.DoubleSide, depthWrite: true,
      });
      cardMesh = new THREE.Mesh(geo, mat);
      cardMesh.frustumCulled = false;
      scene.add(cardMesh);
    });

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    // Scroll / drag / click
    const motion = { scroll: 0, vel: 0, dragging: false, lastX: 0, lastY: 0, moved: 0 };
    const pointerPar = { x: 0, y: 0 };

    const onWheel = (e) => { e.preventDefault(); motion.vel += e.deltaY * MOTION.wheelForce; };
    const onPointerDown = (e) => {
      motion.dragging = true; motion.moved = 0;
      motion.lastX = e.clientX; motion.lastY = e.clientY;
      container.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
      pointerPar.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerPar.y = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!motion.dragging) return;
      const dx = e.clientX - motion.lastX, dy = e.clientY - motion.lastY;
      motion.lastX = e.clientX; motion.lastY = e.clientY;
      motion.moved += Math.abs(dx) + Math.abs(dy);
      motion.vel = -(dx + dy * 0.6) * MOTION.dragForce;
      motion.scroll += motion.vel;
    };
    const onPointerUp = (e) => {
      const wasDrag = motion.moved > 6;
      motion.dragging = false;
      if (wasDrag || !cardMesh) return;
      const rect = container.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      let bestIdx = -1, bestDist = 0.1;
      const N = entriesRef.current.length;
      for (let i = 0; i < N; i++) {
        const raw = i / N + 0.5 / N;
        const t = ((raw + motion.scroll) % 1 + 1) % 1;
        const ang = t * MOTION.turns * Math.PI * 2;
        const world = new THREE.Vector3(Math.sin(ang) * MOTION.radius, (t - 0.5) * MOTION.height, Math.cos(ang) * MOTION.radius);
        if (world.z < MOTION.radius * 0.25) continue;
        const proj = world.clone().project(camera);
        const dist = Math.hypot(proj.x - ndc.x, proj.y - ndc.y);
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      }
      if (bestIdx >= 0) onFocus?.(entriesRef.current[bestIdx]);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);

    // Render loop
    let frame = 0, running = true;
    const clock = new THREE.Clock();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const loop = () => {
      if (!running) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      if (!motion.dragging) {
        motion.scroll += motion.vel;
        motion.vel *= MOTION.friction;
        if (!reducedMotion) motion.scroll += MOTION.autoRotate * dt;
      }
      const speed = Math.min(Math.abs(motion.vel) * 60, 1.5);

      uniforms.uScroll.value = motion.scroll;
      uniforms.uTime.value = t;

      const targetProgress = Math.min(Math.max(demoState.score, 0), 100) / 100;
      knotGroup.rotation.y += dt * (MOTION.knotSpin + speed * 1.2);
      knotGroup.rotation.x = Math.sin(t * 0.22) * 0.32;
      knotMat.opacity = 0.7 + targetProgress * 0.2;

      camera.position.x += (pointerPar.x * 0.7 - camera.position.x) * 0.04;
      camera.position.y += (-pointerPar.y * 0.5 - camera.position.y) * 0.04;
      camera.position.z = MOTION.radius + 5.4;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const onVisibility = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(frame); }
      else if (!running) { running = true; clock.getDelta(); frame = requestAnimationFrame(loop); }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true; running = false; cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      if (cardMesh) { cardMesh.geometry.dispose(); cardMesh.material.dispose(); uniforms.uAtlas.value?.dispose(); }
      knotGeo.dispose(); knotMat.dispose();
      particleGeo.dispose(); particleMat.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [onFocus]);

  return (
    <div className="fixed inset-0 z-0 cursor-grab touch-none select-none active:cursor-grabbing">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Depth: a soft cream glow at the spiral's core fading to sage/olive at the
          edges — gives the flat background a sense of looking into a tunnel. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(92% 88% at 50% 46%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 26%, rgba(250,248,244,0) 46%, rgba(140,108,76,0.16) 74%, rgba(74,56,40,0.34) 100%)',
        }}
      />
    </div>
  );
}
