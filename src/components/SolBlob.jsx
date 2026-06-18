import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Ashima/IQ 3D simplex noise, the standard GLSL implementation
const noiseGLSL = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

const vertexShader = /* glsl */ `
  ${noiseGLSL}
  uniform float uTime;
  uniform float uAmp;
  varying vec3 vNormal;

  vec3 displace(vec3 p) {
    float n = snoise(p * 0.9 + vec3(uTime * 0.001, uTime, uTime * 0.6));
    return p * (1.0 + n * uAmp);
  }

  void main() {
    vec3 p = normalize(position);
    vec3 displaced = displace(p);
    // recompute the normal from two displaced neighbours on the sphere
    vec3 t = normalize(cross(p, vec3(0.0, 1.0, 0.001)));
    vec3 b = cross(p, t);
    float e = 0.07;
    vec3 d1 = displace(normalize(p + t * e));
    vec3 d2 = displace(normalize(p + b * e));
    vNormal = normalize(cross(d1 - displaced, d2 - displaced));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vNormal;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(vec3(0.45, 0.75, 0.65));
    vec3 V = vec3(0.0, 0.0, 1.0);
    float diff = max(dot(N, L), 0.0);
    // porcelain palette: soft warm-grey shadows rising to pure white
    vec3 base = mix(vec3(0.8, 0.77, 0.71), vec3(1.0), diff);
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 60.0) * 0.35;
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 color = base + spec + fresnel * vec3(0.95, 0.9, 0.8) * 0.35;
    gl_FragColor = vec4(color, 1.0);
  }
`;

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
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 10);
    camera.position.z = 3.1;

    const geometry = new THREE.IcosahedronGeometry(1, 48);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 0.14 },
      },
    });
    const blob = new THREE.Mesh(geometry, material);
    scene.add(blob);

    let frame = 0;
    let running = true;
    let noiseTime = 0;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      const dt = clock.getDelta();
      const speed = thinkingRef.current ? 0.85 : 0.3;
      noiseTime += dt * speed;
      const targetAmp = thinkingRef.current ? 0.13 : 0.07;
      material.uniforms.uAmp.value += (targetAmp - material.uniforms.uAmp.value) * 0.05;
      material.uniforms.uTime.value = noiseTime;
      blob.rotation.y += dt * 0.25;
      blob.rotation.x = Math.sin(noiseTime * 0.4) * 0.15;
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
        background: 'radial-gradient(circle at 38% 32%, rgba(214,186,131,0.32), rgba(214,186,131,0.1) 58%, transparent 78%)',
      }}
      aria-hidden="true"
    />
  );
}
