// Wellness ellipse — built on the cortiz2894/showcase-images cylindrical-gallery
// foundation, but the six unique cards ride a single closed, tilted-ellipse path
// instead of an open climbing spiral (so there is no top-to-bottom wrap "jump").
// Scrolling drifts the cards along the ellipse and squeezes them toward the centre,
// exactly like the reference; each card still curves onto the ring.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildWellnessAtlas } from '../lib/wellnessAtlas.js';

// ── Warm stage ────────────────────────────────────────────────────────────────

const P = {
  bg: '#f7f4ef',          // warm ivory stage
  grid: '#d9d0c5',
  gridOpacity: 0.03,
  knot: '#8f9a82',        // sage core thread
  border: '#c3b49a',      // soft taupe card edge
  corner: '#c9a97d',      // champagne corner accent
};

// The tilted ellipse the cards travel along.
const ELLIPSE = {
  radius: 4.1,            // horizontal semi-axis
  height: 2.7,            // vertical semi-axis (the tilt of the ring)
  scale: 1.02,
  curveK: 0.42,           // visible convex bend on each (camera-facing) card
  planeSegX: 32,
  planeSegY: 12,
};

const MOTION = {
  autoRotate: 0.0015,     // continuous slow drift around the ellipse (rad / frame@60)
  friction: 0.93,
  wheelRotate: 0.00034,
  dragRotate: 0.0015,
  squeezeMax: 0.34,
  squeezeWidth: 3.0,
  camZ: 13.0,             // pulled well back, matching the earlier roomy framing
  fov: 52,
};

// ── Shaders ───────────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  uniform float uRadius;
  uniform float uHeight;
  uniform float uTime;
  uniform float uScale;
  uniform float uCurveK;
  uniform float uRotation;
  uniform float uSqueezeAmount;
  uniform float uSqueezeWidth;

  attribute float aAngleOffset;
  attribute float aTile;

  varying vec2 vUv;
  varying float vTile;
  varying float vFront;
  varying float vWorldY;

  void main() {
    vUv = uv;
    vTile = aTile;

    float angle = aAngleOffset + uRotation;

    // Card CENTRE rides the closed, tilted ellipse: x,z trace a circle while the
    // height follows cos(angle), so front cards sit high & near, back cards low &
    // far. Periodic → the path never jumps.
    float y0 = uHeight * cos(angle);
    float gauss = exp(-(y0 * y0) / (uSqueezeWidth * uSqueezeWidth));
    float sr = uRadius * (1.0 - uSqueezeAmount * gauss);
    float yh = uHeight * (1.0 - uSqueezeAmount * gauss * 0.6) * cos(angle);
    vec3 C = vec3(sin(angle) * sr, yh, cos(angle) * sr);

    // Each card gently faces the camera (so it never goes fully edge-on) and keeps
    // a soft convex bend around its own vertical axis.
    vec3 toCam = normalize(cameraPosition - C);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
    vec3 cup = normalize(cross(toCam, right));

    vec2 lp = position.xy * uScale;
    float a = lp.x * uCurveK;
    vec3 pos = C
      + right * (sin(a) / uCurveK)
      - toCam * ((1.0 - cos(a)) / uCurveK)
      + cup * lp.y
      + cup * (sin(uTime * 0.3 + aAngleOffset) * 0.02);

    vFront = smoothstep(-uRadius, uRadius * 0.65, C.z);
    vWorldY = C.y + lp.y;

    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uCols;
  uniform float uRows;
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
  varying float vFront;
  varying float vWorldY;

  vec2 getTileUV(vec2 local) {
    float idx = floor(vTile + 0.5);
    float col = mod(idx, uCols);
    float row = floor(idx / uCols);
    float u = (col + local.x) / uCols;
    float v = 1.0 - (row + 1.0 - local.y) / uRows;
    return vec2(u, v);
  }

  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  float cornerMask(vec2 uv, float len, float w, float o) {
    float m = 0.0;
    if (uv.x >= o && uv.x < o+len && uv.y >= o && uv.y < o+w) m = 1.0;
    if (uv.x >= o && uv.x < o+w && uv.y >= o && uv.y < o+len) m = 1.0;
    if (uv.x > 1.0-o-len && uv.x <= 1.0-o && uv.y >= o && uv.y < o+w) m = 1.0;
    if (uv.x > 1.0-o-w && uv.x <= 1.0-o && uv.y >= o && uv.y < o+len) m = 1.0;
    if (uv.x >= o && uv.x < o+len && uv.y > 1.0-o-w && uv.y <= 1.0-o) m = 1.0;
    if (uv.x >= o && uv.x < o+w && uv.y > 1.0-o-len && uv.y <= 1.0-o) m = 1.0;
    if (uv.x > 1.0-o-len && uv.x <= 1.0-o && uv.y > 1.0-o-w && uv.y <= 1.0-o) m = 1.0;
    if (uv.x > 1.0-o-w && uv.x <= 1.0-o && uv.y > 1.0-o-len && uv.y <= 1.0-o) m = 1.0;
    return m;
  }

  void main() {
    vec2 uv = vUv;
    if (!gl_FrontFacing) uv.x = 1.0 - uv.x;

    vec2 centered = uv - 0.5;
    float aa = 0.004;

    float imgDist = sdRoundedBox(centered, vec2(0.5), uBorderRadius);
    float imageMask = 1.0 - smoothstep(-aa, aa, imgDist);

    float bDist = sdRoundedBox(centered, vec2(0.5), uBorderRadius);
    float borderMask = clamp(
      (1.0 - smoothstep(-aa, aa, bDist)) - (1.0 - smoothstep(-aa, aa, bDist + uBorderWidth)),
      0.0, 1.0);

    vec2 ca = vec2(uChroma, 0.0);
    float r = texture2D(uAtlas, getTileUV(uv + ca)).r;
    float g = texture2D(uAtlas, getTileUV(uv)).g;
    float b = texture2D(uAtlas, getTileUV(uv - ca)).b;
    vec3 color = vec3(r, g, b);

    // Back-of-ring cards wash toward the ivory stage; front cards stay solid.
    float frontMix = clamp(vFront * 1.7, 0.6, 1.0);
    color = mix(uBg, color, frontMix);

    color = mix(color, uBorder, borderMask);
    float corners = cornerMask(uv, uCornerSize, uCornerWidth, uCornerOffset);
    color = mix(color, uCorner, corners);

    float alpha = max(imageMask, max(borderMask, corners));
    alpha *= clamp(vFront * 1.9, 0.55, 1.0);
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
    const camera = new THREE.PerspectiveCamera(MOTION.fov, 1, 0.1, 60);
    camera.position.set(0, 0, MOTION.camZ);

    const fog = new THREE.Fog(P.bg, 14, 24);
    scene.fog = fog;

    // Faint grids hint at the surrounding space.
    const gridTop = new THREE.GridHelper(90, 64, P.grid, P.grid);
    const gridBottom = new THREE.GridHelper(90, 64, P.grid, P.grid);
    [gridTop, gridBottom].forEach((g) => {
      g.material.transparent = true;
      g.material.opacity = P.gridOpacity;
      g.material.depthWrite = false;
      scene.add(g);
    });
    gridTop.position.y = 6.5;
    gridBottom.position.y = -6.5;

    // Ambient motes.
    const PARTICLES = 200;
    const pPos = new Float32Array(PARTICLES * 3);
    for (let i = 0; i < PARTICLES; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 28;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.03, color: new THREE.Color(P.knot), transparent: true,
      opacity: 0.18, depthWrite: false,
    });
    const particleField = new THREE.Points(particleGeo, particleMat);
    scene.add(particleField);

    // Nearly-invisible thread at the core — a hint of the structure.
    const knotCurve = buildKnotCurve();
    const knotGeo = new THREE.TubeGeometry(knotCurve, 600, 0.006, 8, true);
    const knotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.knot), transparent: true, opacity: 0.06, depthWrite: false });
    const knotGroup = new THREE.Group();
    knotGroup.add(new THREE.Mesh(knotGeo, knotMat));
    knotGroup.scale.setScalar(1.7);
    scene.add(knotGroup);

    // Cards on the ellipse (built once the atlas is ready).
    let cardMesh = null;
    let N = 0;
    let atlasTexture = null;
    let refreshCard = null;
    let rotateTimer = null;
    const hitProxies = [];
    const raycaster = new THREE.Raycaster();
    const uniforms = {
      uAtlas: { value: null },
      uCols: { value: 1 },
      uRows: { value: 1 },
      uTime: { value: 0 },
      uRadius: { value: ELLIPSE.radius },
      uHeight: { value: ELLIPSE.height },
      uScale: { value: ELLIPSE.scale },
      uCurveK: { value: ELLIPSE.curveK },
      uRotation: { value: 0 },
      uSqueezeAmount: { value: 0 },
      uSqueezeWidth: { value: MOTION.squeezeWidth },
      uBg: { value: new THREE.Color(P.bg) },
      uBorder: { value: new THREE.Color(P.border) },
      uCorner: { value: new THREE.Color(P.corner) },
      uBorderWidth: { value: 0.012 },
      uBorderRadius: { value: 0.085 },
      uCornerSize: { value: 0.06 },
      uCornerWidth: { value: 0.008 },
      uCornerOffset: { value: 0.034 },
      uChroma: { value: 0.0012 },
    };

    buildWellnessAtlas().then(({ canvas, cols, rows, entries, tileAspect, refresh }) => {
      if (disposed) return;
      entriesRef.current = entries;
      N = entries.length;
      refreshCard = refresh;

      const atlasTex = new THREE.CanvasTexture(canvas);
      atlasTex.colorSpace = THREE.SRGBColorSpace;
      atlasTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      atlasTex.minFilter = THREE.LinearFilter;
      atlasTex.magFilter = THREE.LinearFilter;
      atlasTexture = atlasTex;
      uniforms.uAtlas.value = atlasTex;
      uniforms.uCols.value = cols;
      uniforms.uRows.value = rows;

      // Keep the living cards alive: rotate Ancient Wisdom + Podcast every ~8.5s.
      rotateTimer = setInterval(() => {
        if (disposed) return;
        const a = refresh('wisdom');
        const b = refresh('podcast');
        if (a || b) atlasTex.needsUpdate = true;
      }, 8500);

      const planeW = 2.5;
      const planeH = planeW / tileAspect;
      const geo = new THREE.InstancedBufferGeometry();
      const plane = new THREE.PlaneGeometry(planeW, planeH, ELLIPSE.planeSegX, ELLIPSE.planeSegY);
      geo.index = plane.index;
      geo.attributes.position = plane.attributes.position;
      geo.attributes.uv = plane.attributes.uv;

      const aAngleOffset = new Float32Array(N);
      const aTile = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        aAngleOffset[i] = i * ((Math.PI * 2) / N);  // evenly spaced around the ellipse
        aTile[i] = entries[i].tileIndex;             // each unique card exactly once
      }
      geo.setAttribute('aAngleOffset', new THREE.InstancedBufferAttribute(aAngleOffset, 1));
      geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(aTile, 1));
      geo.instanceCount = N;

      const mat = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, uniforms,
        transparent: true, side: THREE.DoubleSide, depthWrite: false,
      });
      cardMesh = new THREE.Mesh(geo, mat);
      cardMesh.frustumCulled = false;
      scene.add(cardMesh);

      const hitGeo = new THREE.PlaneGeometry(planeW, planeH);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      for (let i = 0; i < N; i++) {
        const proxy = new THREE.Mesh(hitGeo, hitMat);
        proxy.frustumCulled = false;
        proxy.userData.angleOffset = aAngleOffset[i];
        proxy.userData.entryIndex = i;
        scene.add(proxy);
        hitProxies.push(proxy);
      }
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

    // Interaction: drag / wheel spin the cards around the ellipse.
    const motion = { rotVel: 0, dragging: false, lastX: 0, lastY: 0, moved: 0 };
    const pointerPar = { x: 0, y: 0 };
    let rotation = 0;
    let squeeze = 0;

    const onWheel = (e) => { e.preventDefault(); motion.rotVel += e.deltaY * MOTION.wheelRotate; };
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
      motion.rotVel = (dx + dy) * MOTION.dragRotate;
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
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(hitProxies, false);
      if (hits.length) {
        const entry = entriesRef.current[hits[0].object.userData.entryIndex];
        if (entry) {
          // Clicking a living card also cycles it, then shows the new content.
          if (refreshCard && (entry.id === 'wisdom' || entry.id === 'podcast')) {
            if (refreshCard(entry.id) && atlasTexture) atlasTexture.needsUpdate = true;
          }
          onFocus?.(entry);
        }
      }
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
      const f = dt * 60;

      motion.rotVel *= MOTION.friction;
      const auto = reducedMotion ? 0 : MOTION.autoRotate;
      rotation += (auto + motion.rotVel) * f;

      const targetSqueeze = Math.min(Math.abs(motion.rotVel) * 55, 1) * MOTION.squeezeMax;
      squeeze += (targetSqueeze - squeeze) * 0.08;

      uniforms.uTime.value = t;
      uniforms.uRotation.value = rotation;
      uniforms.uSqueezeAmount.value = squeeze;

      // Track hit proxies along the same ellipse (centre of each card).
      for (const proxy of hitProxies) {
        const angle = proxy.userData.angleOffset + rotation;
        const y0 = ELLIPSE.height * Math.cos(angle);
        const gauss = Math.exp(-(y0 * y0) / (MOTION.squeezeWidth * MOTION.squeezeWidth));
        const sr = ELLIPSE.radius * (1 - squeeze * gauss);
        const yh = ELLIPSE.height * (1 - squeeze * gauss * 0.6) * Math.cos(angle);
        const sx = Math.sin(angle) * sr;
        const sz = Math.cos(angle) * sr;
        const y = yh + Math.sin(t * 0.3 + proxy.userData.angleOffset) * 0.02;
        proxy.position.set(sx, y, sz);
        proxy.lookAt(camera.position);              // billboard, matching the cards
        proxy.scale.set(ELLIPSE.scale, ELLIPSE.scale, 1);
        proxy.visible = sz > -ELLIPSE.radius * 0.35; // only the near arc is clickable
      }

      particleField.rotation.y += dt * 0.005;
      particleMat.opacity = 0.15 + Math.sin(t * 0.34) * 0.03;
      knotGroup.rotation.y += dt * 0.05;
      knotGroup.rotation.x = Math.sin(t * 0.16) * 0.16;

      camera.position.x += (pointerPar.x * 0.4 - camera.position.x) * 0.04;
      camera.position.y += (-pointerPar.y * 0.28 - camera.position.y) * 0.04;
      camera.position.z = MOTION.camZ;
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
      if (rotateTimer) clearInterval(rotateTimer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      if (cardMesh) { cardMesh.geometry.dispose(); cardMesh.material.dispose(); uniforms.uAtlas.value?.dispose(); }
      if (hitProxies.length) { hitProxies[0].geometry.dispose(); hitProxies[0].material.dispose(); }
      knotGeo.dispose(); knotMat.dispose();
      particleGeo.dispose(); particleMat.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [onFocus]);

  return (
    <div className="fixed inset-0 z-0 cursor-grab touch-none select-none active:cursor-grabbing">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Soft ivory core glow easing to a faint warm taupe at the edges. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 76% at 50% 47%, rgba(255,255,255,0.46) 0%, rgba(247,244,239,0.16) 34%, rgba(168,179,159,0.07) 62%, rgba(184,170,154,0.09) 84%, rgba(110,102,94,0.13) 100%)',
        }}
      />
    </div>
  );
}
