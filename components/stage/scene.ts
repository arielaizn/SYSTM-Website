// SYSTM glass stage. Three frosted glass slabs with a cyan filament that traces the S of the mark.
// Everything is authored in code: PMREM studio lights, transmissive MeshPhysicalMaterial (real refraction and
// dispersion), a shader filament with a travelling pulse, additive halos. The DOM drives it through
// data-stage markers (see states.ts); the filament and yaw can additionally be scrubbed by scroll.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { stageBus } from './bus';
import { resolveState, STATE_KEYS, type StageState } from './states';

export type SceneHandle = { rescan(): void; dispose(): void };
type Opts = { onFirstFrame(): void; onLost(): void };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ICE = new THREE.Color(0.675, 0.957, 0.973);

const SLAB = { w: 3.4, h: 0.46, d: 2.3 };
const ANCHOR_X = 1.15;
const UP = new THREE.Vector3(0, 1, 0);

const vert = /* glsl */ `
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;

const coreFrag = /* glsl */ `
  uniform float uTime, uProg, uPulseOn, uGlow; uniform vec2 uRange; uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float s = mix(uRange.x, uRange.y, vUv.y);
    float lit = 1.0 - smoothstep(uProg - 0.015, uProg + 0.015, s);
    float p = fract(uTime * 0.16);
    float d = s - p;
    float pulse = exp(-d * d * 220.0) * uPulseOn * lit;
    float base = mix(0.12, 0.9, lit);
    gl_FragColor = vec4(uColor * (base + pulse * 1.7) * uGlow, 1.0);
  }`;

const haloFrag = /* glsl */ `
  uniform float uTime, uProg, uPulseOn, uGlow; uniform vec2 uRange; uniform vec3 uColor;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    float s = mix(uRange.x, uRange.y, vUv.y);
    float lit = 1.0 - smoothstep(uProg - 0.015, uProg + 0.015, s);
    float p = fract(uTime * 0.16);
    float d = s - p;
    float pulse = exp(-d * d * 120.0) * uPulseOn * lit;
    float f = pow(max(dot(normalize(vN), normalize(vV)), 0.0), 2.4);
    float a = f * (0.05 + 0.34 * lit + pulse * 0.8) * uGlow;
    gl_FragColor = vec4(uColor, a);
  }`;

const glowSphereFrag = /* glsl */ `
  uniform float uGlow, uProg; uniform vec3 uColor; uniform float uAt;
  varying vec3 vN; varying vec3 vV;
  void main() {
    float f = pow(max(dot(normalize(vN), normalize(vV)), 0.0), 2.0);
    float lit = 1.0 - smoothstep(uProg - 0.015, uProg + 0.015, uAt);
    gl_FragColor = vec4(uColor, f * (0.06 + 0.5 * lit) * uGlow);
  }`;

const poolFrag = /* glsl */ `
  uniform float uGlow; uniform vec3 uColor; varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float a = pow(clamp(1.0 - r, 0.0, 1.0), 2.4) * 0.34 * uGlow;
    gl_FragColor = vec4(uColor, a);
  }`;

const streakFrag = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uBg; varying vec2 vUv;
  void main() {
    float fade = smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
    float edge = 1.0 - smoothstep(0.35, 0.5, abs(vUv.x - 0.5));
    gl_FragColor = vec4(mix(uBg, uColor, fade * edge), 1.0);
  }`;

type Marker = { name: string; top: number; height: number; scrub: string[] };

export function createScene(canvas: HTMLCanvasElement, opts: Opts): SceneHandle {
  const html = document.documentElement;
  const mobileMq = matchMedia('(max-width: 800px)');
  // ?snap skips springs and the intro. Used by QA, where a software renderer runs at a few fps.
  const snap = location.search.includes('snap');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  const dprCap = mobileMq.matches ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  renderer.setClearColor(0x080c0e, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  (renderer as unknown as { transmissionResolutionScale: number }).transmissionResolutionScale = mobileMq.matches ? 0.5 : 0.85;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  // Studio environment: black room with soft strips. This is what the glass edges reflect and bend.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x04070a);
  const strip = (w: number, h: number, pos: [number, number, number], color: number, power: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    envScene.add(m);
  };
  strip(9, 0.8, [0, 7, 3], 0xffffff, 2.6);
  strip(0.6, 9, [-8, 0, 2], 0xaef6fa, 7);
  strip(0.6, 9, [8, 1, -1], 0xffffff, 8);
  strip(8, 3, [0, -4, 7], 0xaef6fa, 0.8);
  strip(10, 1.6, [0, 2, -9], 0xffffff, 4);
  scene.environment = pmrem.fromScene(envScene, 0.035).texture;
  envScene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    (m.material as THREE.Material | undefined)?.dispose();
  });

  const key = new THREE.DirectionalLight(0xffffff, 0.55);
  key.position.set(5, 7, 6);
  scene.add(key);
  const fill = new THREE.PointLight(0xacf4f8, 14, 12, 2);
  scene.add(fill);

  // The rig holds everything that moves together.
  const rig = new THREE.Group();
  scene.add(rig);

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0.62, 0.7, 0.72),
    emissiveIntensity: 0.02,
    metalness: 0,
    roughness: 0.22,
    transmission: 1,
    thickness: 0.6,
    ior: 1.45,
    attenuationColor: new THREE.Color(0xf2fdfe),
    attenuationDistance: 12,
    specularIntensity: 0.9,
    envMapIntensity: 0.55,
    clearcoat: 0.3,
    clearcoatRoughness: 0.18,
    sheen: 0.2,
    sheenColor: new THREE.Color(0xacf4f8),
    sheenRoughness: 0.35,
  });
  if (!mobileMq.matches) (glass as unknown as { dispersion: number }).dispersion = 0.25;
  // Fresnel rim: bevels and grazing silhouettes catch light, the way the edges of the brand render do.
  glass.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float fres = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 5.0);
      vec3 wn = inverseTransformDirection(normal, viewMatrix);
      float side = 1.0 - abs(wn.y);
      totalEmissiveRadiance += vec3(0.72, 0.97, 1.0) * fres * 2.6;
      totalEmissiveRadiance += vec3(0.30, 0.42, 0.45) * pow(side, 2.6) * 0.16;`,
    );
  };

  const slabGeo = new RoundedBoxGeometry(SLAB.w, SLAB.h, SLAB.d, 6, 0.05);
  const slabs = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(slabGeo, glass);
    m.matrixAutoUpdate = true;
    rig.add(m);
    return m;
  });

  // Light streaks behind the slabs so the glass has something bright to bend.
  const streakMat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: streakFrag,
    uniforms: { uColor: { value: new THREE.Color(0.06, 0.11, 0.125) }, uBg: { value: new THREE.Color(0.031, 0.047, 0.055) } },
  });
  const streaks = new THREE.Group();
  [-3.4, 0.2, 3.6].forEach((x, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(i % 2 ? 0.05 : 0.1, 9), streakMat);
    m.position.set(x, 0.2, -2.6 - (i % 3) * 0.4);
    streaks.add(m);
  });
  rig.add(streaks);

  // Filament ------------------------------------------------------------------
  const shared = {
    uTime: { value: 0 },
    uProg: { value: 1 },
    uPulseOn: { value: 1 },
    uGlow: { value: 1 },
    uColor: { value: ICE.clone() },
  };
  const segGeo = new THREE.CylinderGeometry(0.017, 0.017, 1, 10, 1, false);
  const haloGeo = new THREE.CylinderGeometry(0.075, 0.075, 1, 18, 1, true);
  const makeMat = (frag: string, transparent: boolean) =>
    new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: { ...shared, uRange: { value: new THREE.Vector2(0, 1) } },
      transparent,
      depthWrite: !transparent,
      blending: transparent ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

  type Seg = { core: THREE.Mesh; halo: THREE.Mesh };
  const segs: Seg[] = [0, 1, 2, 3].map(() => {
    const core = new THREE.Mesh(segGeo, makeMat(coreFrag, false));
    const halo = new THREE.Mesh(haloGeo, makeMat(haloFrag, true));
    halo.renderOrder = 5;
    rig.add(core, halo);
    return { core, halo };
  });

  const jointGeo = new THREE.SphereGeometry(0.03, 14, 10);
  const jointMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1, 1) });
  const glowGeo = new THREE.SphereGeometry(0.1, 18, 12);
  const joints: THREE.Mesh[] = [];
  const glowSpheres: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial }[] = [];
  for (let i = 0; i < 5; i++) {
    const j = new THREE.Mesh(jointGeo, jointMat);
    rig.add(j);
    joints.push(j);
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: glowSphereFrag,
      uniforms: { uGlow: shared.uGlow, uProg: shared.uProg, uColor: shared.uColor, uAt: { value: i / 4 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const g = new THREE.Mesh(glowGeo, mat);
    g.renderOrder = 6;
    rig.add(g);
    glowSpheres.push({ mesh: g, mat });
  }

  // Pool of light under the stack, and floating dust for depth.
  const poolMat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: poolFrag,
    uniforms: { uGlow: shared.uGlow, uColor: shared.uColor },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.renderOrder = 1;
  rig.add(pool);

  const dustN = mobileMq.matches ? 60 : 140;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 14;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 8;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 7;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: ICE, size: 0.035, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // DOM-driven pose ---------------------------------------------------------------
  let markers: Marker[] = [];
  const rescan = () => {
    const sy = scrollY;
    markers = [...document.querySelectorAll<HTMLElement>('[data-stage]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { name: el.dataset.stage ?? 'quiet', top: r.top + sy, height: r.height, scrub: (el.dataset.stageScrub ?? '').split(',').filter(Boolean) };
    });
  };

  const zero = (): StageState => ({ x: 0, y: 0, size: 0, yaw: 0, pitch: 0, roll: 0, explode: 0, gap: 0, glow: 0, filament: 0, dim: 0 });
  const target = (mobile: boolean): StageState => {
    const vh = innerHeight;
    const center = scrollY + vh / 2;
    if (!markers.length) {
      stageBus.hero = 0;
      return resolveState('quiet', mobile);
    }
    const out = zero();
    let sum = 0;
    let heroW = 0;
    for (const m of markers) {
      const bottom = m.top + m.height;
      const d = center < m.top ? m.top - center : center > bottom ? center - bottom : 0;
      const w = Math.exp(-Math.pow(d / (vh * 0.3), 2));
      if (w < 0.003) continue;
      const st = { ...resolveState(m.name, mobile) };
      if (m.scrub.length) {
        const p = clamp((center - m.top) / Math.max(1, m.height));
        if (m.scrub.includes('filament')) st.filament = p;
        if (m.scrub.includes('yaw')) st.yaw += (p - 0.5) * 1.4;
      }
      for (const k of STATE_KEYS) out[k] += st[k] * w;
      sum += w;
      if (m.name === 'hero') heroW += w;
    }
    if (sum < 0.003) {
      stageBus.hero = 0;
      return resolveState('quiet', mobile);
    }
    for (const k of STATE_KEYS) out[k] /= sum;
    stageBus.hero = clamp(heroW / sum);
    return out;
  };

  // Start from an "assembling" pose so the first seconds read as an intro, then spring to the real target.
  rescan();
  const start = { ...target(mobileMq.matches) };
  start.explode += 1.3;
  start.filament = 0;
  start.dim = 0.12;
  start.size *= 0.78;
  start.yaw += 0.9;
  const cur: StageState = start;
  let introUntil = performance.now() + 3200;
  if (snap) Object.assign(window, { __stage: { cur, rig, camera, slabs, stageBus, renderer } });

  // Input, size, loop ----------------------------------------------------------------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
  };
  addEventListener('pointermove', onPointer, { passive: true });

  let cw = 0;
  let ch = 0;
  let resized = true;
  const resize = () => {
    cw = innerWidth;
    ch = innerHeight;
    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
    resized = true;
    rescan();
  };
  resize();
  addEventListener('resize', resize);
  const ro = new ResizeObserver(() => rescan());
  ro.observe(document.body);
  document.fonts?.ready.then(rescan);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    opts.onLost();
  });

  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpC = new THREE.Vector3();
  const anchor = (slab: THREE.Mesh, x: number, out: THREE.Vector3) => out.set(x, SLAB.h / 2 + 0.004, 0).applyMatrix4(slab.matrix);
  const pts = { A0: new THREE.Vector3(), A1: new THREE.Vector3(), B0: new THREE.Vector3(), B1: new THREE.Vector3(), C: new THREE.Vector3() };
  const spreadX = [1.0, -0.4, 0.8];
  const spreadZ = [-0.9, 0.7, -0.4];
  const spreadYaw = [0.38, -0.28, 0.22];

  let raf = 0;
  let last = performance.now();
  let first = false;
  let lastSig = '';

  const place = (seg: Seg, a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number) => {
    tmpC.subVectors(b, a);
    const len = Math.max(0.0001, tmpC.length());
    tmpB.copy(a).addScaledVector(tmpC, 0.5);
    tmpC.normalize();
    for (const m of [seg.core, seg.halo]) {
      m.position.copy(tmpB);
      m.quaternion.setFromUnitVectors(UP, tmpC);
      m.scale.set(1, len, 1);
      ((m.material as THREE.ShaderMaterial).uniforms.uRange.value as THREE.Vector2).set(r0, r1);
    }
    return len;
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (document.hidden) {
      last = now;
      return;
    }
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    const reduced = html.classList.contains('motion-off');
    const mobile = mobileMq.matches;
    const t = now / 1000;

    const tgt = target(mobile);
    const dv = stageBus.drive;
    if (dv.filament >= 0) tgt.filament = dv.filament;
    tgt.glow += dv.glow;
    tgt.dim = Math.max(0, tgt.dim + dv.dim);
    tgt.yaw += dv.kick;
    const k = reduced || snap ? 1000 : now < introUntil ? 2.4 : 5.5;
    const f = 1 - Math.exp(-dt * k);
    for (const key of STATE_KEYS) cur[key] += (tgt[key] - cur[key]) * f;

    pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 4));
    pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 4));
    const px = reduced ? 0 : pointer.x;
    const py = reduced ? 0 : pointer.y;

    const sig = [cur.x, cur.y, cur.size, cur.yaw, cur.pitch, cur.explode, cur.gap, cur.glow, cur.filament, cur.dim, px, py].map((v) => v.toFixed(3)).join();
    if (reduced && !resized && sig === lastSig && first) return;
    lastSig = sig;
    resized = false;

    // Slabs
    const gapUnit = 1.18 * cur.gap;
    const e = cur.explode;
    slabs.forEach((s, i) => {
      const bob = reduced ? 0 : Math.sin(t * 0.7 + i * 1.7) * 0.05;
      s.position.set(spreadX[i] * e, (1 - i) * gapUnit + bob, spreadZ[i] * e);
      s.rotation.set(0, spreadYaw[i] * e + (reduced ? 0 : Math.sin(t * 0.4 + i) * 0.03), 0);
      s.updateMatrix();
    });

    // Filament geometry follows the slabs.
    anchor(slabs[0], -ANCHOR_X, pts.A0);
    anchor(slabs[1], -ANCHOR_X, pts.A1);
    anchor(slabs[1], ANCHOR_X, pts.B0);
    anchor(slabs[2], ANCHOR_X, pts.B1);
    anchor(slabs[2], -ANCHOR_X, pts.C);
    const lens = [pts.A0.distanceTo(pts.A1), pts.A1.distanceTo(pts.B0), pts.B0.distanceTo(pts.B1), pts.B1.distanceTo(pts.C)];
    const total = lens[0] + lens[1] + lens[2] + lens[3];
    let acc = 0;
    const edgesFrom = [pts.A0, pts.A1, pts.B0, pts.B1];
    const edgesTo = [pts.A1, pts.B0, pts.B1, pts.C];
    const fr = [0];
    segs.forEach((seg, i) => {
      const r0 = acc / total;
      acc += lens[i];
      const r1 = acc / total;
      fr.push(r1);
      place(seg, edgesFrom[i], edgesTo[i], r0, r1);
    });
    [pts.A0, pts.A1, pts.B0, pts.B1, pts.C].forEach((p, i) => {
      joints[i].position.copy(p);
      glowSpheres[i].mesh.position.copy(p);
      const at = i === 0 ? 0 : i === 1 ? fr[1] : i === 2 ? fr[2] : i === 3 ? fr[3] : 1;
      glowSpheres[i].mat.uniforms.uAt.value = at;
    });

    shared.uTime.value = reduced ? 0.55 / 0.16 : t;
    shared.uPulseOn.value = reduced ? 0 : 1;
    shared.uProg.value = cur.filament * 1.04;
    shared.uGlow.value = cur.glow * (0.45 + 0.55 * cur.dim);

    pool.position.set(0, -(gapUnit + SLAB.h / 2 + 0.55), 0);
    (poolMat.uniforms.uGlow as { value: number }).value = cur.glow * cur.dim;

    // Rig pose from NDC
    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const viewW = viewH * camera.aspect;
    const ref = Math.min(viewH, viewW * 1.6);
    rig.scale.setScalar(Math.max(0.05, cur.size) * (ref / 7.2));
    const idle = reduced ? 0 : Math.sin(t * 0.5) * 0.04;
    rig.position.set(cur.x * (viewW / 2), cur.y * (viewH / 2) + idle, 0);
    rig.rotation.set(cur.pitch - py * 0.1, cur.yaw + px * 0.22, cur.roll + (reduced ? 0 : Math.sin(t * 0.3) * 0.012), 'YXZ');
    rig.updateMatrixWorld(true);

    fill.position.copy(tmpA.set(0, 0.2, 1.4).applyMatrix4(rig.matrixWorld));
    fill.intensity = 16 * cur.glow * cur.dim;
    key.position.set(5 + px * 3, 7 - py * 2, 6);
    dust.rotation.y = reduced ? 0.3 : t * 0.012;
    dust.position.set(-px * 0.25, py * 0.15, 0);
    dustMat.opacity = 0.18 + 0.4 * cur.dim;
    renderer.toneMappingExposure = 0.28 + 0.9 * cur.dim;

    // Publish screen anchors for DOM overlays
    for (let i = 0; i < 3; i++) {
      tmpA.set(i === 0 ? ANCHOR_X : i === 1 ? -ANCHOR_X : ANCHOR_X, SLAB.h / 2, SLAB.d * 0.3);
      tmpA.applyMatrix4(slabs[i].matrix).applyMatrix4(rig.matrixWorld).project(camera);
      stageBus.anchors[i * 2] = (tmpA.x * 0.5 + 0.5) * cw;
      stageBus.anchors[i * 2 + 1] = (-tmpA.y * 0.5 + 0.5) * ch;
    }

    renderer.render(scene, camera);
    if (!first) {
      first = true;
      stageBus.ready = true;
      opts.onFirstFrame();
    }
  };
  raf = requestAnimationFrame(tick);

  return {
    rescan,
    dispose() {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onPointer);
      removeEventListener('resize', resize);
      ro.disconnect();
      stageBus.ready = false;
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      (scene.environment as THREE.Texture | null)?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
