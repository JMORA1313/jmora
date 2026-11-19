import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Eye, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import type { Locale, MuscleGroup, MuscleSide } from '../types/jmora';
import { buildCompleteSculptedAnatomy } from '../utils/sculptedAnatomy';

interface MuscleScene3DProps {
  muscles: MuscleGroup[];
  selectedMuscleId: string;
  hoveredMuscleId: string | null;
  side: MuscleSide;
  accentColor: string;
  theme: 'light' | 'dark';
  locale: Locale;
  onSelectMuscle: (id: string) => void;
  onHoverMuscle: (id: string | null) => void;
  onSideChange: (side: MuscleSide) => void;
}

type CameraPreset = 'front' | 'back' | 'side' | 'reset';
type RenderMode = 'fibers' | 'sculpture' | 'hologram';

function detectSoftwareGl(gl: WebGLRenderingContext | WebGL2RenderingContext | null): boolean {
  if (!gl) return true;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(renderer);
  } catch {
    return false;
  }
}

interface ProceduralTextures {
  fiberAlbedo: THREE.CanvasTexture;
  fiberBump: THREE.CanvasTexture;
  fiberRoughness: THREE.CanvasTexture;
  sculptureAlbedo: THREE.CanvasTexture;
  pedestalMap: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function buildProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  const size = 512;

  // 1. Striated Muscle Fiber Albedo + Bump + Roughness
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  // Seamless vertical striated muscle-fiber base (zero horizontal tiling bands)
  const baseGrad = aCtx.createLinearGradient(0, 0, size, 0);
  baseGrad.addColorStop(0, '#8d2f27');
  baseGrad.addColorStop(0.25, '#9d3930');
  baseGrad.addColorStop(0.5, '#7f2620');
  baseGrad.addColorStop(0.75, '#99372e');
  baseGrad.addColorStop(1, '#8d2f27');
  aCtx.fillStyle = baseGrad;
  aCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  rCtx.fillStyle = '#9a9a9a';
  rCtx.fillRect(0, 0, size, size);

  // Fine bundled muscle fascicles running vertically with seamless sinusoidal weave
  for (let i = 0; i < 160; i++) {
    const xBase = (i / 160) * size;
    const thickness = 1.1 + (i % 4) * 0.5;
    const isBright = i % 3 === 0;
    const phase = (i * 0.43) % (Math.PI * 2);

    aCtx.beginPath();
    bCtx.beginPath();
    rCtx.beginPath();
    for (let y = 0; y <= size; y += 8) {
      // Exact periodic wave over [0, size] so V-wrapping is 100% seamless
      const wave = Math.sin((y / size) * Math.PI * 4 + phase) * 2.8;
      const x = xBase + wave;
      if (y === 0) {
        aCtx.moveTo(x, y);
        bCtx.moveTo(x, y);
        rCtx.moveTo(x, y);
      } else {
        aCtx.lineTo(x, y);
        bCtx.lineTo(x, y);
        rCtx.lineTo(x, y);
      }
    }

    aCtx.strokeStyle = isBright ? 'rgba(224, 134, 118, 0.32)' : 'rgba(48, 10, 8, 0.42)';
    aCtx.lineWidth = thickness;
    aCtx.stroke();

    bCtx.strokeStyle = isBright ? 'rgba(242, 242, 242, 0.7)' : 'rgba(38, 38, 38, 0.7)';
    bCtx.lineWidth = thickness * 1.1;
    bCtx.stroke();

    rCtx.strokeStyle = isBright ? 'rgba(115, 115, 115, 0.52)' : 'rgba(188, 188, 188, 0.5)';
    rCtx.lineWidth = thickness;
    rCtx.stroke();
  }

  // 2. Luxury Architectural Sculpture Albedo (Brushed Obsidian/Alabaster micro-grain)
  const sculpCanvas = document.createElement('canvas');
  sculpCanvas.width = size;
  sculpCanvas.height = size;
  const sCtx = sculpCanvas.getContext('2d')!;
  const sculpGrad = sCtx.createLinearGradient(0, 0, size, size);
  sculpGrad.addColorStop(0, '#c7c5c0');
  sculpGrad.addColorStop(0.5, '#a8a7a3');
  sculpGrad.addColorStop(1, '#d6d4cf');
  sCtx.fillStyle = sculpGrad;
  sCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < 110; i++) {
    const x = (i / 110) * size;
    sCtx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
    sCtx.lineWidth = 1.2;
    sCtx.beginPath();
    sCtx.moveTo(x, 0);
    sCtx.lineTo(x + Math.sin(i) * 8, size);
    sCtx.stroke();
  }

  // 3. Studio Pedestal Radial Architectural Dial Texture
  const pedCanvas = document.createElement('canvas');
  pedCanvas.width = size;
  pedCanvas.height = size;
  const pCtx = pedCanvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const radGrad = pCtx.createRadialGradient(cx, cy, 18, cx, cy, size / 2);
  radGrad.addColorStop(0, '#40404a');
  radGrad.addColorStop(0.68, '#282830');
  radGrad.addColorStop(1, '#1b1b22');
  pCtx.fillStyle = radGrad;
  pCtx.fillRect(0, 0, size, size);

  pCtx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  for (const r of [75, 130, 185, 226]) {
    pCtx.lineWidth = r === 226 ? 2 : 1;
    pCtx.beginPath();
    pCtx.arc(cx, cy, r, 0, Math.PI * 2);
    pCtx.stroke();
  }
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const inner = deg % 45 === 0 ? 198 : 212;
    pCtx.strokeStyle = deg % 90 === 0 ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.16)';
    pCtx.lineWidth = deg % 90 === 0 ? 2 : 1;
    pCtx.beginPath();
    pCtx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
    pCtx.lineTo(cx + Math.cos(rad) * 234, cy + Math.sin(rad) * 234);
    pCtx.stroke();
  }

  // 4. Soft Radial Contact Shadow Texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const shCtx = shadowCanvas.getContext('2d')!;
  const shGrad = shCtx.createRadialGradient(128, 128, 12, 128, 128, 120);
  shGrad.addColorStop(0, 'rgba(0,0,0,0.52)');
  shGrad.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  shGrad.addColorStop(1, 'rgba(0,0,0,0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 256, 256);

  const configureTex = (
    canvas: HTMLCanvasElement,
    isColor: boolean,
    repeatX = 1,
    repeatY = 1
  ): THREE.CanvasTexture => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = Math.min(maxAnisotropy, 8);
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.needsUpdate = true;
    return tex;
  };

  const fiberAlbedo = configureTex(albedoCanvas, true, 1.4, 1);
  const fiberBump = configureTex(bumpCanvas, false, 1.4, 1);
  const fiberRoughness = configureTex(roughCanvas, false, 1.4, 1);
  const sculptureAlbedo = configureTex(sculpCanvas, true, 1.2, 1);
  const pedestalMap = configureTex(pedCanvas, true, 1, 1);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);
  contactShadow.needsUpdate = true;

  return {
    fiberAlbedo,
    fiberBump,
    fiberRoughness,
    sculptureAlbedo,
    pedestalMap,
    contactShadow,
    dispose: () => {
      fiberAlbedo.dispose();
      fiberBump.dispose();
      fiberRoughness.dispose();
      sculptureAlbedo.dispose();
      pedestalMap.dispose();
      contactShadow.dispose();
    },
  };
}

const MUSCLE_FOCUS_HEIGHTS: Record<string, number> = {
  traps: 1.82,
  shoulders: 1.72,
  chest: 1.65,
  lats: 1.54,
  biceps: 1.52,
  triceps: 1.52,
  abs: 1.38,
  'lower-back': 1.32,
  forearms: 1.24,
  glutes: 1.08,
  quads: 0.78,
  hamstrings: 0.78,
  calves: 0.36,
};

export function MuscleScene3D({
  muscles,
  selectedMuscleId,
  hoveredMuscleId,
  side,
  accentColor,
  theme,
  locale,
  onSelectMuscle,
  onHoverMuscle,
  onSideChange,
}: MuscleScene3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef(selectedMuscleId);
  const hoveredRef = useRef(hoveredMuscleId);
  const accentRef = useRef(accentColor);
  const themeRef = useRef(theme);
  const modeRef = useRef<RenderMode>('fibers');
  const autoRotateRef = useRef<boolean>(false);
  const scanTriggerTimeRef = useRef<number>(0);
  const targetCameraPos = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const onSelectRef = useRef(onSelectMuscle);
  const onHoverRef = useRef(onHoverMuscle);

  const [renderMode, setRenderMode] = useState<RenderMode>('fibers');
  const [autoRotate, setAutoRotate] = useState(false);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [webglError, setWebglError] = useState(false);

  selectedRef.current = selectedMuscleId;
  hoveredRef.current = hoveredMuscleId;
  accentRef.current = accentColor;
  themeRef.current = theme;
  modeRef.current = renderMode;
  autoRotateRef.current = autoRotate;
  onSelectRef.current = onSelectMuscle;
  onHoverRef.current = onHoverMuscle;

  // Trigger bio-scan ring sweep whenever muscle selection changes
  useEffect(() => {
    scanTriggerTimeRef.current = performance.now();
  }, [selectedMuscleId]);

  // Smooth camera glide when front/back prop changes
  useEffect(() => {
    const focusY = MUSCLE_FOCUS_HEIGHTS[selectedMuscleId] ?? 1.12;
    const camY = THREE.MathUtils.clamp(focusY + 0.06, 0.96, 1.42);
    if (side === 'front') {
      targetCameraPos.current = {
        pos: new THREE.Vector3(0.22, camY, 4.35),
        target: new THREE.Vector3(0, 1.0, 0),
      };
    } else {
      targetCameraPos.current = {
        pos: new THREE.Vector3(-0.22, camY, -4.35),
        target: new THREE.Vector3(0, 1.0, 0),
      };
    }
  }, [side, selectedMuscleId]);

  const setPreset = (preset: CameraPreset) => {
    setAutoRotate(false);
    if (preset === 'front' || preset === 'reset') {
      onSideChange('front');
      targetCameraPos.current = {
        pos: new THREE.Vector3(0.22, 1.24, 4.35),
        target: new THREE.Vector3(0, 1.0, 0),
      };
    } else if (preset === 'back') {
      onSideChange('back');
      targetCameraPos.current = {
        pos: new THREE.Vector3(-0.22, 1.24, -4.35),
        target: new THREE.Vector3(0, 1.0, 0),
      };
    } else if (preset === 'side') {
      targetCameraPos.current = {
        pos: new THREE.Vector3(3.95, 1.24, 1.45),
        target: new THREE.Vector3(0, 1.0, 0),
      };
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      const probeCanvas = document.createElement('canvas');
      const glProbe = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!glProbe) {
        setWebglError(true);
        return;
      }
      const isSoftwareGl = detectSoftwareGl(glProbe);

      const width = Math.max(container.clientWidth, 300);
      const height = Math.max(container.clientHeight, 480);

      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: isSoftwareGl ? 'default' : 'high-performance',
      });
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = !isSoftwareGl;
      if (!isSoftwareGl) {
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();

      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;

      const textures = buildProceduralTextures(renderer.capabilities.getMaxAnisotropy());

      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 35);
      camera.position.set(0.22, 1.24, 4.35);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 1.0, 0);
      controls.enablePan = false;
      controls.minDistance = 2.4;
      controls.maxDistance = 6.2;
      controls.minPolarAngle = 0.45;
      controls.maxPolarAngle = Math.PI - 0.34;
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.075;

      // Cancel camera preset glide as soon as user interacts
      const handleControlsStart = () => {
        targetCameraPos.current = null;
      };
      controls.addEventListener('start', handleControlsStart);

      // Dramatic 4-Point Dark-Studio Anatomical Lighting
      const hemi = new THREE.HemisphereLight(0xf8fafc, 0x0f172a, 0.58);
      scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.7);
      keyLight.position.set(2.9, 4.5, 3.4);
      if (!isSoftwareGl) {
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.bias = -0.0004;
      }
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xbfdbfe, 1.05);
      fillLight.position.set(-3.4, 2.3, 2.4);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0x60a5fa, 2.0);
      rimLight.position.set(-2.5, 3.2, -3.5);
      scene.add(rimLight);

      const accentUnderLight = new THREE.PointLight(
        new THREE.Color(accentRef.current || '#EA580C'),
        1.45,
        4.8
      );
      accentUnderLight.position.set(0, 0.28, 0.85);
      scene.add(accentUnderLight);

      // Architectural Tiered Studio Stage & Machined Pedestal
      const stageGroup = new THREE.Group();
      scene.add(stageGroup);

      const lowerPlinth = new THREE.Mesh(
        new THREE.CylinderGeometry(1.08, 1.16, 0.05, 64),
        new THREE.MeshStandardMaterial({
          color: 0x1a1a22,
          roughness: 0.42,
          metalness: 0.62,
        })
      );
      lowerPlinth.position.y = -0.065;
      stageGroup.add(lowerPlinth);

      const upperPlinthMat = new THREE.MeshStandardMaterial({
        map: textures.pedestalMap,
        roughness: 0.48,
        metalness: 0.35,
      });
      const upperPlinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.92, 0.98, 0.05, 64),
        upperPlinthMat
      );
      upperPlinth.position.y = -0.025;
      upperPlinth.receiveShadow = !isSoftwareGl;
      stageGroup.add(upperPlinth);

      const glowRingMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(accentRef.current || '#EA580C'),
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
      });
      const glowRing = new THREE.Mesh(new THREE.RingGeometry(0.925, 0.96, 72), glowRingMat);
      glowRing.rotation.x = -Math.PI / 2;
      glowRing.position.y = 0.004;
      stageGroup.add(glowRing);

      const outerTechRing = new THREE.Mesh(
        new THREE.RingGeometry(1.06, 1.075, 72),
        new THREE.MeshBasicMaterial({
          color: 0x94a3b8,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
        })
      );
      outerTechRing.rotation.x = -Math.PI / 2;
      outerTechRing.position.y = -0.038;
      stageGroup.add(outerTechRing);

      // Contact shadow disc under feet
      const contactDisc = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 0.95),
        new THREE.MeshBasicMaterial({
          map: textures.contactShadow,
          transparent: true,
          depthWrite: false,
          opacity: 0.85,
        })
      );
      contactDisc.rotation.x = -Math.PI / 2;
      contactDisc.position.y = 0.006;
      stageGroup.add(contactDisc);

      // Animated Holographic Bio-Scan Ring
      const scanRingMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(accentRef.current || '#EA580C'),
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const scanRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.008, 12, 64), scanRingMat);
      scanRing.rotation.x = Math.PI / 2;
      scanRing.position.y = 1.2;
      scene.add(scanRing);

      // Subtle Ambient Studio Dust / Energy Particles
      const particleCount = 65;
      const pPositions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 * 3;
        const radius = 0.72 + (i % 7) * 0.14;
        pPositions[i * 3] = Math.cos(angle) * radius;
        pPositions[i * 3 + 1] = 0.15 + ((i * 0.19) % 2.15);
        pPositions[i * 3 + 2] = Math.sin(angle) * radius;
      }
      const particlesGeo = new THREE.BufferGeometry();
      particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
      const particlesMat = new THREE.PointsMaterial({
        color: new THREE.Color(accentRef.current || '#EA580C'),
        size: 0.022,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      });
      const particles = new THREE.Points(particlesGeo, particlesMat);
      scene.add(particles);

      // ================= SEAMLESS SCULPTED ANATOMICAL 3D FIGURE =================
      const bodyGroup = new THREE.Group();
      scene.add(bodyGroup);

      const coreMat = new THREE.MeshPhysicalMaterial({
        color: 0x3a3f4d,
        map: textures.sculptureAlbedo,
        roughness: 0.44,
        metalness: 0.18,
        clearcoat: 0.22,
        clearcoatRoughness: 0.42,
        vertexColors: true,
      });

      const clickableMuscles: THREE.Mesh[] = [];
      const muscleMaterialMap = new Map<string, THREE.MeshPhysicalMaterial>();

      const getMuscleMaterial = (muscleId: string) => {
        const existing = muscleMaterialMap.get(muscleId);
        if (existing) return existing;
        const mat = new THREE.MeshPhysicalMaterial({
          color: 0xd4766c,
          map: textures.fiberAlbedo,
          bumpMap: textures.fiberBump,
          bumpScale: 0.022,
          roughnessMap: textures.fiberRoughness,
          roughness: 0.45,
          metalness: 0.14,
          clearcoat: 0.26,
          clearcoatRoughness: 0.36,
          vertexColors: true,
          emissive: new THREE.Color(0x000000),
          emissiveIntensity: 0,
        });
        muscleMaterialMap.set(muscleId, mat);
        return mat;
      };

      const sculptedParts = buildCompleteSculptedAnatomy();
      for (const part of sculptedParts) {
        const isBase = part.regionId === 'base';
        const mat = isBase ? coreMat : getMuscleMaterial(part.regionId);
        const mesh = new THREE.Mesh(part.geometry, mat);
        mesh.castShadow = !isSoftwareGl;
        mesh.receiveShadow = !isSoftwareGl;
        if (!isBase) {
          mesh.userData.muscleId = part.regionId;
          clickableMuscles.push(mesh);
        }
        bodyGroup.add(mesh);
      }

      // Pointer Raycasting (Click vs Drag threshold)
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let downPos = { x: 0, y: 0 };

      const getNdc = (clientX: number, clientY: number) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      };

      const handlePointerDown = (e: PointerEvent) => {
        downPos = { x: e.clientX, y: e.clientY };
      };

      const handlePointerMove = (e: PointerEvent) => {
        getNdc(e.clientX, e.clientY);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(clickableMuscles, false);
        if (hits.length > 0) {
          const hitId = String(hits[0].object.userData.muscleId || '');
          renderer.domElement.style.cursor = 'pointer';
          if (hitId && hoveredRef.current !== hitId) {
            onHoverRef.current(hitId);
          }
        } else {
          renderer.domElement.style.cursor = 'grab';
          if (hoveredRef.current !== null) {
            onHoverRef.current(null);
          }
        }
      };

      const handlePointerUp = (e: PointerEvent) => {
        const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        if (dist > 6) return;
        getNdc(e.clientX, e.clientY);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(clickableMuscles, false);
        if (hits.length > 0) {
          const hitId = String(hits[0].object.userData.muscleId || '');
          if (hitId) onSelectRef.current(hitId);
        }
      };

      renderer.domElement.addEventListener('pointerdown', handlePointerDown);
      renderer.domElement.addEventListener('pointermove', handlePointerMove);
      renderer.domElement.addEventListener('pointerup', handlePointerUp);

      const handleResize = () => {
        if (!container) return;
        const w = Math.max(container.clientWidth, 280);
        const h = Math.max(container.clientHeight, 440);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      let rafId = 0;
      let softwareTimer: number | null = null;
      const startTimeMs = performance.now();
      let lastTimeMs = startTimeMs;
      let destroyed = false;

      // Software-GL fenceSync pacing helper
      const rawGl = renderer.getContext();
      const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && rawGl instanceof WebGL2RenderingContext;
      const afterDraw = (cb: () => void) => {
        if (!isSoftwareGl) {
          rafId = requestAnimationFrame(cb);
          return;
        }
        if (isWebGL2) {
          const sync = rawGl.fenceSync(rawGl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          if (sync) {
            rawGl.flush();
            const poll = () => {
              if (destroyed) {
                rawGl.deleteSync(sync);
                return;
              }
              const res = rawGl.clientWaitSync(sync, 0, 0);
              if (res === rawGl.WAIT_FAILED || res === rawGl.ALREADY_SIGNALED || res === rawGl.CONDITION_SATISFIED) {
                rawGl.deleteSync(sync);
                softwareTimer = window.setTimeout(() => {
                  if (!destroyed) rafId = requestAnimationFrame(cb);
                }, 70);
              } else {
                softwareTimer = window.setTimeout(poll, 16);
              }
            };
            poll();
            return;
          }
        }
        softwareTimer = window.setTimeout(() => {
          if (!destroyed) rafId = requestAnimationFrame(cb);
        }, 75);
      };

      const holoCyan = new THREE.Color('#22d3ee');
      const whiteColor = new THREE.Color('#ffffff');
      const accentColorScratch = new THREE.Color('#EA580C');

      const renderFrame = () => {
        if (destroyed) return;
        const now = performance.now();
        const elapsed = (now - startTimeMs) / 1000;
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTimeMs) / 1000));
        lastTimeMs = now;

        const isDark = themeRef.current === 'dark';
        const mode = modeRef.current;
        accentColorScratch.set(accentRef.current || '#EA580C');
        const accent = accentColorScratch;

        // Dynamic stage & lighting accents
        glowRingMat.color.copy(mode === 'hologram' ? holoCyan : accent);
        accentUnderLight.color.copy(mode === 'hologram' ? holoCyan : accent);
        particlesMat.color.copy(mode === 'hologram' ? holoCyan : accent);

        // Update seamless base-body material per visual mode
        if (mode === 'hologram') {
          coreMat.color.setHex(0x0f2a3d);
          coreMat.wireframe = true;
          coreMat.transparent = true;
          coreMat.opacity = 0.32;
          coreMat.emissive.copy(holoCyan);
          coreMat.emissiveIntensity = 0.28;
        } else if (mode === 'sculpture') {
          coreMat.color.setHex(0x525766);
          coreMat.wireframe = false;
          coreMat.transparent = false;
          coreMat.opacity = 1;
          coreMat.emissive.setHex(0x000000);
          coreMat.emissiveIntensity = 0;
        } else {
          // Realistic dark-studio anatomical body base (head, knees, hands, feet, tendons)
          coreMat.color.setHex(isDark ? 0x323644 : 0x3a3f4f);
          coreMat.wireframe = false;
          coreMat.transparent = false;
          coreMat.opacity = 1;
          coreMat.emissive.setHex(0x000000);
          coreMat.emissiveIntensity = 0;
        }

        // Smooth whole-body studio breathing, turntable rotation, and floating particles
        const breathScale = 1 + Math.sin(elapsed * 2.0) * 0.004;
        bodyGroup.scale.set(breathScale, 1, breathScale);
        bodyGroup.position.y = Math.sin(elapsed * 1.1) * 0.003;
        if (autoRotateRef.current) {
          bodyGroup.rotation.y += dt * 0.55;
        } else {
          bodyGroup.rotation.y = THREE.MathUtils.damp(
            bodyGroup.rotation.y,
            Math.sin(elapsed * 0.55) * 0.045,
            4,
            dt
          );
        }
        particles.rotation.y = elapsed * 0.08;

        // Holographic bio-scan ring sweep triggered on muscle change
        const scanAge = (now - scanTriggerTimeRef.current) / 1000;
        if (scanAge < 1.35) {
          const progress = scanAge / 1.35;
          scanRing.position.y = 0.1 + progress * 2.05;
          scanRingMat.color.copy(mode === 'hologram' ? holoCyan : accent);
          scanRingMat.opacity = Math.sin(progress * Math.PI) * 0.82;
          const ringScale = 0.85 + Math.sin(progress * Math.PI) * 0.22;
          scanRing.scale.set(ringScale, ringScale, 1);
        } else {
          scanRingMat.opacity = 0;
        }

        // Update seamless muscle region PBR material per Visual Mode & Selection
        const pulse = 0.42 + Math.sin(elapsed * 4.2) * 0.2;
        for (const m of muscles) {
          const mat = muscleMaterialMap.get(m.id);
          if (!mat) continue;
          const isSelected = selectedRef.current === m.id;
          const isHovered = hoveredRef.current === m.id;

          if (mode === 'hologram') {
            mat.map = null;
            mat.bumpMap = null;
            mat.wireframe = !isSelected;
            mat.transparent = true;
            mat.opacity = isSelected ? 0.92 : isHovered ? 0.65 : 0.34;
            if (isSelected) {
              mat.color.copy(accent);
              mat.emissive.copy(accent);
              mat.emissiveIntensity = pulse + 0.35;
            } else if (isHovered) {
              mat.color.copy(holoCyan);
              mat.emissive.copy(holoCyan);
              mat.emissiveIntensity = 0.55;
            } else {
              mat.color.copy(holoCyan);
              mat.emissive.copy(holoCyan);
              mat.emissiveIntensity = 0.22;
            }
          } else if (mode === 'sculpture') {
            mat.map = textures.sculptureAlbedo;
            mat.bumpMap = textures.fiberBump;
            mat.bumpScale = 0.008;
            mat.wireframe = false;
            mat.transparent = false;
            mat.opacity = 1;
            mat.roughness = 0.34;
            mat.metalness = 0.42;
            if (isSelected) {
              mat.color.copy(accent);
              mat.emissive.copy(accent);
              mat.emissiveIntensity = pulse * 0.85;
            } else if (isHovered) {
              mat.color.copy(accent).lerp(whiteColor, 0.28);
              mat.emissive.copy(accent);
              mat.emissiveIntensity = 0.22;
            } else {
              mat.color.setHex(0x767a8a);
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0;
            }
          } else {
            // 'fibers' — ultra-graphic realistic anatomical muscle fascicles
            mat.map = textures.fiberAlbedo;
            mat.bumpMap = textures.fiberBump;
            mat.bumpScale = 0.024;
            mat.wireframe = false;
            mat.transparent = false;
            mat.opacity = 1;
            mat.roughness = 0.48;
            mat.metalness = 0.14;
            if (isSelected) {
              mat.color.copy(accent).lerp(whiteColor, 0.18);
              mat.emissive.copy(accent);
              mat.emissiveIntensity = pulse * 0.95;
            } else if (isHovered) {
              mat.color.copy(accent).lerp(whiteColor, 0.3);
              mat.emissive.copy(accent);
              mat.emissiveIntensity = 0.28;
            } else {
              mat.color.setHex(0xb85c52);
              mat.emissive.setHex(0x200503);
              mat.emissiveIntensity = 0.12;
            }
          }
        }

        // Smooth damped camera glide
        if (targetCameraPos.current) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCameraPos.current.pos.x, 6, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCameraPos.current.pos.y, 6, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCameraPos.current.pos.z, 6, dt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, targetCameraPos.current.target.x, 6, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, targetCameraPos.current.target.y, 6, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, targetCameraPos.current.target.z, 6, dt);
          if (camera.position.distanceTo(targetCameraPos.current.pos) < 0.03) {
            targetCameraPos.current = null;
          }
        }

        controls.update();
        renderer.render(scene, camera);
        afterDraw(renderFrame);
      };

      rafId = requestAnimationFrame(renderFrame);

      return () => {
        destroyed = true;
        cancelAnimationFrame(rafId);
        if (softwareTimer !== null) window.clearTimeout(softwareTimer);
        window.removeEventListener('resize', handleResize);
        controls.removeEventListener('start', handleControlsStart);
        renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
        renderer.domElement.removeEventListener('pointermove', handlePointerMove);
        renderer.domElement.removeEventListener('pointerup', handlePointerUp);
        controls.dispose();
        pmrem.dispose();
        envTex.dispose();
        textures.dispose();
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material?.dispose();
          }
        });
        renderer.dispose();
      };
    } catch {
      setWebglError(true);
    }
  }, [muscles]);

  const hoveredObj = hoveredMuscleId ? muscles.find((m) => m.id === hoveredMuscleId) : null;
  const selectedObj = muscles.find((m) => m.id === selectedMuscleId);

  return (
    <div
      data-testid="muscle-3d-stage"
      data-render-mode={renderMode}
      className="relative h-[520px] sm:h-[600px] w-full overflow-hidden rounded-[var(--jmora-card-radius)] border border-black/15 dark:border-white/12 bg-[#0B0D14] bg-gradient-to-b from-[#1F2433] via-[#11141D] to-[#07080C] shadow-xl"
    >
      {/* Top Status Strip (no backdrop-blur over WebGL) */}
      <div className="pointer-events-none absolute top-3 inset-x-3 z-10 flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#12141C]/92 px-2.5 py-1 font-medium text-white border border-white/15 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-[var(--jmora-accent)]" />
          <span>
            {locale === 'fa'
              ? 'استودیو ۳D آناتومی (چرخش ۳۶۰°)'
              : '3D Anatomy Studio (Drag to Orbit)'}
          </span>
        </span>
        <span className="rounded-lg bg-[var(--jmora-accent)] px-2.5 py-1 font-semibold text-white shadow-sm">
          {(hoveredObj || selectedObj)?.name[locale]}
        </span>
      </div>

      {webglError ? (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[#A1A1AA]">
          {locale === 'fa'
            ? 'مرورگر شما WebGL را پشتیبانی نمی‌کند؛ می‌توانید از لیست عضلات زیر انتخاب کنید.'
            : 'WebGL is unavailable in this browser; please select muscles from the list below.'}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-full w-full touch-none"
          aria-label="3D Realistic Muscle Anatomy Canvas"
        />
      )}

      {/* Collapsible Bottom Dock — Sleek Dark Studio HUD (never clips pedestal) */}
      <div className="absolute bottom-2.5 inset-x-0 z-10 flex flex-col items-center px-2.5 pointer-events-none">
        {hudCollapsed ? (
          <button
            type="button"
            onClick={() => setHudCollapsed(false)}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg bg-[#12141C]/92 text-white border border-white/15 px-3 py-1.5 text-[11px] font-medium shadow-md cursor-pointer"
          >
            <ChevronUp className="h-3.5 w-3.5" />
            <span>{locale === 'fa' ? 'کنترل استودیو ۳D' : '3D Studio Controls'}</span>
          </button>
        ) : (
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 max-w-full">
            {/* Render Mode Switcher */}
            <div className="flex items-center gap-0.5 rounded-xl bg-[#12141C]/92 text-white border border-white/15 p-1 shadow-lg">
              <span className="hidden sm:inline-flex items-center gap-1 px-1 text-[10px] font-medium text-white/60">
                <Eye className="h-3 w-3" />
              </span>
              {(
                [
                  { id: 'fibers', fa: 'فیبر آناتومی', en: 'Fibers' },
                  { id: 'sculpture', fa: 'مجسمه استودیو', en: 'Sculpture' },
                  { id: 'hologram', fa: 'اسکن هولوگرام', en: 'Hologram' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setRenderMode(m.id)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                    renderMode === m.id
                      ? 'bg-[var(--jmora-accent)] text-white'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {m[locale]}
                </button>
              ))}
            </div>

            {/* Camera & Turntable Strip */}
            <div className="flex items-center gap-0.5 rounded-xl bg-[#12141C]/92 text-white border border-white/15 p-1 shadow-lg">
              <button
                type="button"
                onClick={() => setPreset('front')}
                className={`rounded-lg px-2 py-1 text-[11px] font-medium cursor-pointer transition-colors ${
                  side === 'front' && !autoRotate
                    ? 'bg-white text-[#111111]'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {locale === 'fa' ? 'جلو' : 'Front'}
              </button>
              <button
                type="button"
                onClick={() => setPreset('back')}
                className={`rounded-lg px-2 py-1 text-[11px] font-medium cursor-pointer transition-colors ${
                  side === 'back' && !autoRotate
                    ? 'bg-white text-[#111111]'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {locale === 'fa' ? 'پشت' : 'Back'}
              </button>
              <button
                type="button"
                onClick={() => setPreset('side')}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                {locale === 'fa' ? 'نیم‌رخ' : 'Side'}
              </button>
              <button
                type="button"
                onClick={() => setAutoRotate((v) => !v)}
                aria-label={locale === 'fa' ? 'چرخش خودکار ۳۶۰ درجه' : 'Toggle 360 turntable'}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium cursor-pointer transition-colors ${
                  autoRotate
                    ? 'bg-[var(--jmora-accent)] text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {autoRotate ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                <span>۳۶۰°</span>
              </button>
              <button
                type="button"
                onClick={() => setPreset('reset')}
                aria-label="Reset camera"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setHudCollapsed(true)}
                aria-label="Collapse camera dock"
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
