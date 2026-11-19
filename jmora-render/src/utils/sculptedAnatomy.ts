import * as THREE from 'three';

export type AnatomyRegionId =
  | 'base'
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'traps'
  | 'lats'
  | 'lower-back'
  | 'glutes'
  | 'hamstrings'
  | 'calves';

export interface SculptedRegionPart {
  regionId: AnatomyRegionId;
  geometry: THREE.BufferGeometry;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Smooth 1D Gaussian bump centered at `center` with width `sigma` */
function gauss(x: number, center: number, sigma: number): number {
  const d = (x - center) / sigma;
  return Math.exp(-0.5 * d * d);
}

/** Circular angular distance on [-PI, PI] */
function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Given a continuous lofted grid of `(rings x radSegs)` vertices, computes welded
 * smooth normals over the ENTIRE unbroken body surface, then splits triangle
 * indices by `regionId` so adjacent muscles meet with ZERO seams or cracks.
 */
function buildPartitionedLoft(
  rings: number,
  radSegs: number,
  positions: Float32Array,
  uvs: Float32Array,
  aoValues: Float32Array,
  ringCenters: Float32Array,
  classifyTriangle: (i0: number, i1: number, i2: number) => AnatomyRegionId
): SculptedRegionPart[] {
  const stride = radSegs + 1;

  // Automatically detect whether (a, b, c) or (a, c, b) faces outward from the ring centerline
  const midR = Math.floor(rings * 0.45);
  const sampleA = midR * stride;
  const sampleB = sampleA + 1;
  const sampleC = (midR + 1) * stride;
  const ax = positions[sampleA * 3];
  const ay = positions[sampleA * 3 + 1];
  const az = positions[sampleA * 3 + 2];
  const bx = positions[sampleB * 3] - ax;
  const by = positions[sampleB * 3 + 1] - ay;
  const bz = positions[sampleB * 3 + 2] - az;
  const cx = positions[sampleC * 3] - ax;
  const cy = positions[sampleC * 3 + 1] - ay;
  const cz = positions[sampleC * 3 + 2] - az;
  // Cross product (b - a) x (c - a)
  const fnx = by * cz - bz * cy;
  const fny = bz * cx - bx * cz;
  const fnz = bx * cy - by * cx;
  const outX = ax - ringCenters[midR * 3];
  const outY = ay - ringCenters[midR * 3 + 1];
  const outZ = az - ringCenters[midR * 3 + 2];
  const useABC = fnx * outX + fny * outY + fnz * outZ >= 0;

  const fullIndices: number[] = [];
  for (let r = 0; r < rings - 1; r++) {
    for (let s = 0; s < radSegs; s++) {
      const a = r * stride + s;
      const b = a + 1;
      const c = (r + 1) * stride + s;
      const d = c + 1;
      if (useABC) {
        fullIndices.push(a, b, c);
        fullIndices.push(b, d, c);
      } else {
        fullIndices.push(a, c, b);
        fullIndices.push(b, c, d);
      }
    }
  }

  // Compute unbroken smooth vertex normals across the whole continuous mesh
  const fullGeo = new THREE.BufferGeometry();
  fullGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  fullGeo.setIndex(fullIndices);
  fullGeo.computeVertexNormals();
  const fullNormals = fullGeo.getAttribute('normal').array as Float32Array;

  // Weld seam normals where s === 0 and s === radSegs so there is zero lighting crease
  for (let r = 0; r < rings; r++) {
    const iStart = (r * stride) * 3;
    const iEnd = (r * stride + radSegs) * 3;
    const nx = fullNormals[iStart] + fullNormals[iEnd];
    const ny = fullNormals[iStart + 1] + fullNormals[iEnd + 1];
    const nz = fullNormals[iStart + 2] + fullNormals[iEnd + 2];
    const len = Math.hypot(nx, ny, nz) || 1;
    fullNormals[iStart] = fullNormals[iEnd] = nx / len;
    fullNormals[iStart + 1] = fullNormals[iEnd + 1] = ny / len;
    fullNormals[iStart + 2] = fullNormals[iEnd + 2] = nz / len;
  }

  // Partition triangles into region buckets while reusing exact welded normals/positions
  const buckets = new Map<AnatomyRegionId, number[]>();
  for (let t = 0; t < fullIndices.length; t += 3) {
    const i0 = fullIndices[t];
    const i1 = fullIndices[t + 1];
    const i2 = fullIndices[t + 2];
    const region = classifyTriangle(i0, i1, i2);
    let list = buckets.get(region);
    if (!list) {
      list = [];
      buckets.set(region, list);
    }
    list.push(i0, i1, i2);
  }

  fullGeo.dispose();

  const parts: SculptedRegionPart[] = [];
  for (const [regionId, triIndices] of buckets.entries()) {
    if (triIndices.length === 0) continue;
    // Remap only used vertices per region so bounding spheres & raycasts stay tight
    const remap = new Map<number, number>();
    const newPos: number[] = [];
    const newNorm: number[] = [];
    const newUv: number[] = [];
    const newCol: number[] = [];
    const newIdx: number[] = [];

    for (const oldIdx of triIndices) {
      let mapped = remap.get(oldIdx);
      if (mapped === undefined) {
        mapped = newPos.length / 3;
        remap.set(oldIdx, mapped);
        newPos.push(positions[oldIdx * 3], positions[oldIdx * 3 + 1], positions[oldIdx * 3 + 2]);
        newNorm.push(fullNormals[oldIdx * 3], fullNormals[oldIdx * 3 + 1], fullNormals[oldIdx * 3 + 2]);
        newUv.push(uvs[oldIdx * 2], uvs[oldIdx * 2 + 1]);
        const ao = aoValues[oldIdx];
        newCol.push(ao, ao, ao);
      }
      newIdx.push(mapped);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(newNorm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(newUv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(newCol, 3));
    geo.setIndex(newIdx);
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    parts.push({ regionId, geometry: geo });
  }

  return parts;
}

/**
 * 1. SEAMLESS SCULPTED TRUNK: Pelvis -> Glutes -> Waist/Abs/Lower-Back ->
 * Ribcage/Chest/Lats -> Trapezius -> Neck -> Sculpted Head (ZERO seams!)
 *
 * Angle convention:
 *   theta = 0       -> Front centerline (+Z)
 *   theta = +PI/2   -> Left side (+X)
 *   theta = +/-PI   -> Back centerline (-Z)
 *   theta = -PI/2   -> Right side (-X)
 */
function buildSculptedTrunk(): SculptedRegionPart[] {
  const rings = 112;
  const radSegs = 72;
  const stride = radSegs + 1;
  const vertCount = rings * stride;

  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const aoValues = new Float32Array(vertCount);
  const ringCenters = new Float32Array(rings * 3);

  const yMin = 0.94;
  const yMax = 2.18;

  for (let r = 0; r < rings; r++) {
    const vNorm = r / (rings - 1);
    const y = yMin + vNorm * (yMax - yMin);

    // Base athletic torso width (rx), depth (rz), and sagittal spine curve (zOff)
    let rx = 0.16;
    let rz = 0.115;
    let zOff = 0;

    if (y < 1.80) {
      // Pelvis (0.94..1.16) -> Athletic V-taper waist (1.28) -> Broad ribcage/shoulders (1.72)
      const pelvisCap = smoothstep(0.94, 1.02, y);
      const hipW = 0.175;
      const waistPinch = -0.028 * gauss(y, 1.29, 0.095);
      const latFlare = 0.068 * gauss(y, 1.65, 0.155);
      const shoulderShelf = 0.048 * gauss(y, 1.74, 0.068);
      const neckTaper = 1 - 0.64 * smoothstep(1.74, 1.84, y);

      rx = (hipW + waistPinch + latFlare + shoulderShelf) * pelvisCap * neckTaper;
      rz =
        (0.114 - 0.012 * gauss(y, 1.28, 0.11) + 0.024 * gauss(y, 1.63, 0.14)) *
        pelvisCap *
        (1 - 0.42 * smoothstep(1.74, 1.84, y));

      // Natural human S-curve posture (lumbar lordosis + thoracic kyphosis)
      zOff =
        -0.012 * gauss(y, 1.08, 0.12) +
        0.014 * gauss(y, 1.32, 0.11) -
        0.01 * gauss(y, 1.62, 0.12);
    } else if (y < 1.96) {
      // Smooth trapezius-to-neck transition (zero neck ring!)
      const t = (y - 1.80) / 0.16;
      const trapBase = 0.072 * (1 - smoothstep(0, 0.46, t));
      rx = 0.056 + trapBase;
      rz = 0.06 + 0.02 * (1 - smoothstep(0, 0.42, t));
      zOff = -0.008 + 0.018 * smoothstep(0, 1, t);
    } else {
      // Sculpted athletic head (jaw -> cheekbones -> cranium crown)
      const hT = (y - 1.96) / (yMax - 1.96); // 0..1
      const crownSphere = Math.sin(clamp(hT, 0.01, 0.995) * Math.PI);
      const jawFill = 0.026 * gauss(hT, 0.18, 0.14);
      const craniumWide = 0.094 * Math.pow(crownSphere, 0.62);
      rx = Math.max(0.004, craniumWide + jawFill * 0.45);
      rz = Math.max(0.004, 0.11 * Math.pow(crownSphere, 0.6) + jawFill * 0.65);
      zOff = 0.01 + 0.016 * gauss(hT, 0.25, 0.2) - 0.014 * gauss(hT, 0.72, 0.22);
    }

    ringCenters[r * 3] = 0;
    ringCenters[r * 3 + 1] = y;
    ringCenters[r * 3 + 2] = zOff;

    // Pinch very bottom of pelvis and top of cranium cleanly closed
    if (r === 0) {
      rx = 0.002;
      rz = 0.002;
    } else if (r === rings - 1) {
      rx = 0.002;
      rz = 0.002;
    }

    for (let s = 0; s <= radSegs; s++) {
      const uNorm = s / radSegs;
      const theta = (uNorm - 0.5) * Math.PI * 2; // -PI (back) .. 0 (front) .. +PI (back)
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const absSin = Math.abs(sinT);
      const backFactor = smoothstep(-0.05, -0.45, cosT);
      const frontFactor = smoothstep(0.05, 0.45, cosT);

      // Squared athletic cross-section factor for chest/back (avoids tube look)
      const superExp = y > 1.15 && y < 1.80 ? 0.92 : 1.0;
      let px = Math.sign(sinT) * Math.pow(absSin, superExp) * rx;
      let pz = Math.sign(cosT) * Math.pow(Math.abs(cosT), superExp) * rz + zOff;

      let relief = 0;
      let ao = 1.0;

      // ---------- FRONT ANATOMICAL RELIEF ----------
      if (frontFactor > 0.01 && y < 1.86) {
        // PECTORALS: broad twin sculpted chest plates with sternal cleft & lower pec fold
        const pecY = gauss(y, 1.655, 0.068) * smoothstep(1.52, 1.59, y) * (1 - smoothstep(1.76, 1.83, y));
        const pecX = smoothstep(0.06, 0.28, absSin) * (1 - smoothstep(0.76, 0.96, absSin));
        const pecSculpt = 0.028 * pecY * pecX * frontFactor;
        relief += pecSculpt;

        // Sternal cleft (center chest groove)
        const sternalGroove = 0.01 * gauss(absSin, 0, 0.085) * pecY * frontFactor;
        relief -= sternalGroove;
        ao -= 0.16 * gauss(absSin, 0, 0.075) * pecY * frontFactor;

        // Inframammary lower chest crease
        const underPecCrease = gauss(y, 1.555, 0.016) * pecX * frontFactor;
        relief -= 0.008 * underPecCrease;
        ao -= 0.2 * underPecCrease;

        // Clavicle subtle ridge at y = 1.78
        const clav = gauss(y, 1.78, 0.015) * smoothstep(0.12, 0.35, absSin) * (1 - smoothstep(0.78, 0.95, absSin)) * frontFactor;
        relief += 0.008 * clav;

        // RECTUS ABDOMINIS: sculpted 6-pack + linea alba + obliques
        const abBand = smoothstep(1.16, 1.24, y) * (1 - smoothstep(1.48, 1.55, y));
        const abCoreX = smoothstep(0.04, 0.16, absSin) * (1 - smoothstep(0.38, 0.54, absSin));
        const abRows =
          gauss(y, 1.465, 0.025) +
          0.95 * gauss(y, 1.385, 0.025) +
          0.9 * gauss(y, 1.305, 0.025) +
          0.72 * gauss(y, 1.225, 0.028);
        relief += 0.014 * abRows * abCoreX * frontFactor;

        // Vertical linea alba & semilunaris creases
        const lineaAlba = gauss(absSin, 0, 0.055) * abBand * frontFactor;
        const semilunaris = gauss(absSin, 0.46, 0.065) * abBand * frontFactor;
        relief -= 0.006 * (lineaAlba + semilunaris * 0.7);
        ao -= 0.17 * (lineaAlba + semilunaris * 0.75);

        // Horizontal tendinous intersections between ab blocks
        const abSplits =
          (gauss(y, 1.425, 0.009) + gauss(y, 1.345, 0.009) + gauss(y, 1.265, 0.009)) *
          abCoreX *
          frontFactor;
        ao -= 0.14 * abSplits;

        // Athletic external obliques along waist flanks
        const obliques = gauss(y, 1.32, 0.095) * gauss(absSin, 0.78, 0.16) * smoothstep(-0.2, 0.3, cosT);
        relief += 0.013 * obliques;
      }

      // ---------- BACK ANATOMICAL RELIEF (COMPLETELY RE-SCULPTED!) ----------
      if (backFactor > 0.01 && y < 1.94) {
        // Central spinal furrow from lower back up through thoracic spine
        const spineBand = smoothstep(1.16, 1.26, y) * (1 - smoothstep(1.76, 1.86, y));
        const spineFurrow = gauss(absSin, 0, 0.08) * spineBand * backFactor;
        relief -= 0.014 * spineFurrow;
        ao -= 0.24 * spineFurrow;

        // TRAPEZIUS: smooth organic kite hood flowing from mid-back up the neck!
        const trapWidthAtY =
          y > 1.76
            ? 0.24 + 0.34 * (1 - smoothstep(1.76, 1.90, y))
            : 0.12 + 0.56 * smoothstep(1.52, 1.76, y);
        const trapY = smoothstep(1.50, 1.60, y) * (1 - smoothstep(1.86, 1.93, y));
        const trapMask = (1 - smoothstep(trapWidthAtY * 0.72, trapWidthAtY + 0.1, absSin)) * trapY * backFactor;
        const trapTwin = 0.65 + 0.35 * smoothstep(0.05, 0.22, absSin);
        relief += 0.022 * trapMask * trapTwin;

        // LATISSIMUS DORSI: wide sweeping athletic V-taper wings
        const latY = smoothstep(1.33, 1.46, y) * (1 - smoothstep(1.68, 1.76, y));
        const latX = smoothstep(0.24, 0.46, absSin) * (1 - smoothstep(0.88, 1.0, absSin));
        const latSweep = 0.028 * latY * latX * smoothstep(0.15, -0.35, cosT);
        relief += latSweep;
        // Subtle lateral flare outward on X for genuine V-taper silhouette
        px += Math.sign(sinT) * 0.024 * latY * smoothstep(0.45, 0.85, absSin) * smoothstep(0.1, -0.3, cosT);

        // LOWER BACK: twin vertical erector spinae columns
        const erectorY = smoothstep(1.17, 1.24, y) * (1 - smoothstep(1.40, 1.47, y));
        const erectorX = gauss(absSin, 0.22, 0.11);
        relief += 0.016 * erectorY * erectorX * backFactor;

        // GLUTES: organically sculpted athletic gluteus maximus + upper medius shelf
        const gluteY = gauss(y, 1.065, 0.068) * smoothstep(0.95, 1.01, y) * (1 - smoothstep(1.16, 1.23, y));
        const gluteLobe = smoothstep(0.05, 0.26, absSin) * (1 - smoothstep(0.76, 0.96, absSin));
        relief += 0.044 * gluteY * gluteLobe * backFactor;
        // Crisp gluteal cleft & lower gluteal fold
        const gluteCleft = gauss(absSin, 0, 0.085) * gluteY * backFactor;
        relief -= 0.024 * gluteCleft;
        ao -= 0.28 * gluteCleft;
        const gluteFold = gauss(y, 0.985, 0.016) * gluteLobe * backFactor;
        ao -= 0.2 * gluteFold;
      }

      // ---------- SCULPTED HEAD FEATURES ----------
      if (y >= 1.96) {
        const hT = (y - 1.96) / (yMax - 1.96);
        // Defined jawline & chin contour
        const chin = gauss(hT, 0.18, 0.08) * gauss(angleDiff(theta, 0), 0, 0.45);
        relief += 0.014 * chin;
        // Subtle brow ridge & nose bridge plane
        const brow = gauss(hT, 0.56, 0.06) * gauss(angleDiff(theta, 0), 0, 0.55);
        relief += 0.008 * brow;
        // Subtle eye socket depression for realistic sculptural read
        const eyeSocket =
          gauss(hT, 0.47, 0.05) *
          (gauss(angleDiff(theta, 0.34), 0, 0.18) + gauss(angleDiff(theta, -0.34), 0, 0.18));
        relief -= 0.006 * eyeSocket;
        ao -= 0.15 * eyeSocket;
      }

      // Apply radial anatomical relief outward along horizontal surface direction
      const radLen = Math.hypot(px, pz - zOff) || 1;
      const dirX = px / radLen;
      const dirZ = (pz - zOff) / radLen;
      px += dirX * relief;
      pz += dirZ * relief;

      const idx = r * stride + s;
      positions[idx * 3] = px;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = pz;

      // Fiber-aligned UVs
      uvs[idx * 2] = uNorm * 3.5;
      uvs[idx * 2 + 1] = (y - yMin) * 2.1;

      aoValues[idx] = clamp(ao, 0.64, 1.0);
    }
  }

  // Classify every triangle on the continuous trunk into its exact anatomical muscle ID
  const classifyTrunk = (i0: number, i1: number, i2: number): AnatomyRegionId => {
    const cx = (positions[i0 * 3] + positions[i1 * 3] + positions[i2 * 3]) / 3;
    const cy = (positions[i0 * 3 + 1] + positions[i1 * 3 + 1] + positions[i2 * 3 + 1]) / 3;
    const cz = (positions[i0 * 3 + 2] + positions[i1 * 3 + 2] + positions[i2 * 3 + 2]) / 3;
    const absX = Math.abs(cx);
    const theta = Math.atan2(cx, cz); // 0 = front, +/-PI = back
    const isFront = Math.cos(theta) > 0.08;
    const isBack = Math.cos(theta) < -0.05;

    if (cy > 1.92) return 'base'; // Head & upper neck

    if (isFront) {
      if (cy >= 1.54 && cy <= 1.77 && absX <= 0.215) return 'chest';
      if (cy >= 1.15 && cy < 1.54 && absX <= 0.195) return 'abs';
      return 'base';
    }

    if (isBack) {
      // Smooth kite-shaped trapezius on upper back & back of neck
      const trapHalfW = cy > 1.75 ? 0.16 * (1 - clamp((cy - 1.75) / 0.17, 0, 0.65)) : 0.03 + 0.165 * clamp((cy - 1.50) / 0.25, 0, 1);
      if (cy >= 1.50 && cy <= 1.91 && absX <= trapHalfW) return 'traps';

      // Broad V-taper lats flanking the trapezius
      if (cy >= 1.35 && cy <= 1.74 && absX > Math.max(0.055, trapHalfW - 0.015)) return 'lats';

      // Lower back erector columns
      if (cy >= 1.19 && cy < 1.44 && absX <= 0.135) return 'lower-back';

      // Sculpted glutes
      if (cy >= 0.96 && cy < 1.19 && absX <= 0.19) return 'glutes';
    }

    // Side obliques / lats wrap
    if (cy >= 1.39 && cy <= 1.70 && cz <= 0.035) return 'lats';
    if (cy >= 1.18 && cy < 1.42 && cz > -0.02) return 'abs';

    return 'base';
  };

  return buildPartitionedLoft(rings, radSegs, positions, uvs, aoValues, ringCenters, classifyTrunk);
}

/**
 * 2. SEAMLESS SCULPTED ARM: Deep Shoulder Socket -> 3-Head Deltoid Cap ->
 * Biceps / Triceps -> Elbow -> Forearm -> Wrist -> Sculpted Hand
 */
function buildSculptedArm(side: -1 | 1): SculptedRegionPart[] {
  const rings = 76;
  const radSegs = 40;
  const stride = radSegs + 1;
  const vertCount = rings * stride;

  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const aoValues = new Float32Array(vertCount);
  const ringCenters = new Float32Array(rings * 3);

  // Natural relaxed athletic arm curve anchored seamlessly inside torso shoulder
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.155, 1.715, -0.006), // Deep inside shoulder socket
    new THREE.Vector3(side * 0.248, 1.705, -0.008), // Deltoid cap apex
    new THREE.Vector3(side * 0.292, 1.535, -0.01),  // Mid upper arm (biceps/triceps)
    new THREE.Vector3(side * 0.322, 1.375, -0.012), // Natural elbow bend
    new THREE.Vector3(side * 0.35, 1.215, 0.018),   // Mid forearm
    new THREE.Vector3(side * 0.372, 1.085, 0.044),  // Wrist
    new THREE.Vector3(side * 0.382, 0.965, 0.056),  // Fingertips
  ]);

  const frames = curve.computeFrenetFrames(rings - 1, false);
  const upRef = new THREE.Vector3(0, 0, 1);
  const lateralVec = new THREE.Vector3();
  const forwardVec = new THREE.Vector3();
  const pt = new THREE.Vector3();

  for (let r = 0; r < rings; r++) {
    const t = r / (rings - 1);
    curve.getPointAt(t, pt);
    ringCenters[r * 3] = pt.x;
    ringCenters[r * 3 + 1] = pt.y;
    ringCenters[r * 3 + 2] = pt.z;
    const tangent = frames.tangents[r];

    // Build stable orthonormal frame where `forwardVec` points anterior (+Z) and `lateralVec` points outward
    lateralVec.crossVectors(upRef, tangent).normalize();
    if (lateralVec.x * side < 0) lateralVec.negate();
    forwardVec.crossVectors(tangent, lateralVec).normalize();
    if (forwardVec.z < 0) forwardVec.negate();

    // Realistic anatomical arm radius profile along t = 0..1
    let radLat = 0.054;
    let radFwd = 0.056;

    if (t < 0.04) {
      // Closed cap tucked cleanly inside torso shoulder
      const cap = smoothstep(0, 0.04, t);
      radLat = 0.068 * cap + 0.002;
      radFwd = 0.068 * cap + 0.002;
    } else if (t < 0.24) {
      // Sculpted Deltoid cap (broadest at t = 0.13)
      const deltBell = gauss(t, 0.125, 0.075);
      radLat = 0.056 + 0.028 * deltBell;
      radFwd = 0.058 + 0.025 * deltBell;
    } else if (t < 0.50) {
      // Upper arm (biceps + triceps fullness tapering slightly toward elbow)
      const midArm = gauss(t, 0.35, 0.095);
      const elbowPinch = -0.009 * gauss(t, 0.50, 0.045);
      radLat = 0.048 + 0.01 * midArm + elbowPinch;
      radFwd = 0.052 + 0.014 * midArm + elbowPinch;
    } else if (t < 0.85) {
      // Forearm (strong brachioradialis high near elbow -> crisp taper to wrist)
      const fT = (t - 0.50) / 0.35;
      const belly = 0.015 * gauss(fT, 0.24, 0.24);
      radLat = 0.046 * (1 - 0.42 * fT) + belly;
      radFwd = 0.048 * (1 - 0.46 * fT) + belly * 0.9;
    } else {
      // Sculpted sleek athletic hand (palm -> tapered fingers)
      const hT = (t - 0.85) / 0.15;
      const tipClose = Math.sin(clamp(1 - hT, 0.01, 1) * (Math.PI / 2));
      radLat = Math.max(0.002, (0.018 + 0.006 * gauss(hT, 0.35, 0.25)) * tipClose);
      radFwd = Math.max(0.002, (0.042 + 0.008 * gauss(hT, 0.32, 0.25)) * tipClose);
    }

    if (r === 0 || r === rings - 1) {
      radLat = 0.002;
      radFwd = 0.002;
    }

    for (let s = 0; s <= radSegs; s++) {
      const uNorm = s / radSegs;
      const phi = uNorm * Math.PI * 2; // 0 = forward (+Z), PI/2 = outward lateral, PI = back (-Z)
      const cosP = Math.cos(phi); // +1 anterior (biceps), -1 posterior (triceps)
      const sinP = Math.sin(phi); // +1 outer lateral (deltoid cap / lateral triceps)

      let relief = 0;
      let ao = 1.0;

      // Deltoid 3-head teardrop cap relief
      if (t >= 0.06 && t <= 0.26) {
        const dY = gauss(t, 0.14, 0.055);
        const outerCap = smoothstep(-0.2, 0.7, sinP);
        relief += 0.012 * dY * outerCap;
        // Subtle deltoid-biceps border crease
        const deltCrease = gauss(t, 0.245, 0.016) * outerCap;
        ao -= 0.16 * deltCrease;
      }

      // Biceps peak (anterior upper arm)
      if (t >= 0.23 && t <= 0.48 && cosP > 0) {
        const bi = gauss(t, 0.355, 0.075) * smoothstep(0.15, 0.75, cosP);
        relief += 0.013 * bi;
      }

      // Triceps horseshoe (posterior upper arm)
      if (t >= 0.22 && t <= 0.48 && cosP < 0) {
        const triY = gauss(t, 0.34, 0.08);
        const triBack = smoothstep(-0.1, -0.65, cosP);
        const horseshoe = 0.7 + 0.3 * Math.abs(sinP);
        relief += 0.013 * triY * triBack * horseshoe;
        // Subtle furrow between biceps & triceps on lateral side
        const armGroove = gauss(cosP, 0, 0.16) * smoothstep(0.3, 0.9, sinP) * triY;
        ao -= 0.16 * armGroove;
      }

      // Forearm brachioradialis sweep
      if (t >= 0.52 && t <= 0.80) {
        const fore = gauss(t, 0.62, 0.085) * smoothstep(-0.4, 0.8, sinP);
        relief += 0.008 * fore;
      }

      const vx =
        pt.x +
        forwardVec.x * (cosP * (radFwd + relief)) +
        lateralVec.x * (sinP * (radLat + relief));
      const vy =
        pt.y +
        forwardVec.y * (cosP * (radFwd + relief)) +
        lateralVec.y * (sinP * (radLat + relief));
      const vz =
        pt.z +
        forwardVec.z * (cosP * (radFwd + relief)) +
        lateralVec.z * (sinP * (radLat + relief));

      const idx = r * stride + s;
      positions[idx * 3] = vx;
      positions[idx * 3 + 1] = vy;
      positions[idx * 3 + 2] = vz;
      uvs[idx * 2] = uNorm * 2.0;
      uvs[idx * 2 + 1] = t * 3.0;
      aoValues[idx] = clamp(ao, 0.68, 1.0);
    }
  }

  const classifyArm = (i0: number, i1: number, i2: number): AnatomyRegionId => {
    const rAvg = (Math.floor(i0 / stride) + Math.floor(i1 / stride) + Math.floor(i2 / stride)) / 3;
    const t = rAvg / (rings - 1);
    if (t < 0.05 || t > 0.83) return 'base';
    if (t <= 0.245) return 'shoulders';
    if (t >= 0.525 && t <= 0.83) return 'forearms';
    if (t > 0.485 && t < 0.525) return 'base'; // Crisp elbow joint ring

    // Upper arm split cleanly between anterior Biceps & posterior Triceps
    const s0 = i0 % stride;
    const s1 = i1 % stride;
    const s2 = i2 % stride;
    const cosAvg =
      (Math.cos((s0 / radSegs) * Math.PI * 2) +
        Math.cos((s1 / radSegs) * Math.PI * 2) +
        Math.cos((s2 / radSegs) * Math.PI * 2)) /
      3;
    return cosAvg >= 0.02 ? 'biceps' : 'triceps';
  };

  return buildPartitionedLoft(rings, radSegs, positions, uvs, aoValues, ringCenters, classifyArm);
}

/**
 * 3. SEAMLESS SCULPTED LEG: Deep Pelvis/Hip Anchor -> Sweeping Quads & Twin Hamstrings ->
 * Patella Knee -> Sculpted Diamond Gastrocnemius Calves -> Achilles -> Grounded Foot
 */
function buildSculptedLeg(side: -1 | 1): SculptedRegionPart[] {
  const rings = 92;
  const radSegs = 48;
  const stride = radSegs + 1;
  const vertCount = rings * stride;

  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const aoValues = new Float32Array(vertCount);
  const ringCenters = new Float32Array(rings * 3);

  const yTop = 1.07; // Anchored seamlessly inside hip/glute
  const yBot = 0.0;  // Grounded flush on studio pedestal

  for (let r = 0; r < rings; r++) {
    const vNorm = r / (rings - 1); // 0 = foot sole, 1 = upper hip
    const y = yBot + vNorm * (yTop - yBot);

    // Subtle natural anatomical centerline (hip slightly narrower than athletic stance foot)
    const cx =
      side *
      (0.112 +
        0.024 * (1 - smoothstep(0.15, 0.92, vNorm)) +
        0.008 * gauss(y, 0.78, 0.14));
    let cz =
      0.006 * gauss(y, 0.76, 0.16) -
      0.012 * gauss(y, 0.38, 0.12) -
      0.008 * smoothstep(0.08, 0.0, y);

    ringCenters[r * 3] = cx;
    ringCenters[r * 3 + 1] = y;
    ringCenters[r * 3 + 2] = cz;

    let rx = 0.06;
    let rz = 0.06;

    if (y >= 0.54) {
      // THIGH (knee 0.54 -> athletic quads/hamstrings -> hip 1.07)
      const thT = (y - 0.54) / (yTop - 0.54); // 0..1
      const hipCap = 1 - 0.35 * smoothstep(0.88, 1.0, thT);
      rx = (0.064 + 0.036 * Math.pow(thT, 0.65) + 0.014 * gauss(thT, 0.55, 0.28)) * hipCap;
      rz = (0.066 + 0.034 * Math.pow(thT, 0.65) + 0.014 * gauss(thT, 0.52, 0.3)) * hipCap;
    } else if (y >= 0.095) {
      // LOWER LEG (ankle 0.095 -> sculpted calf -> knee 0.54)
      const shT = (y - 0.095) / (0.54 - 0.095); // 0..1
      const calfFull = gauss(shT, 0.68, 0.22);
      const kneeJoin = smoothstep(0.82, 1.0, shT);
      rx = 0.042 + 0.026 * calfFull + 0.018 * kneeJoin;
      rz = 0.046 + 0.03 * calfFull + 0.016 * kneeJoin;
    } else {
      // GROUNDED ATHLETIC FOOT (y = 0.00 .. 0.095)
      const fT = y / 0.095; // 0 = sole on floor, 1 = ankle
      const soleFlat = smoothstep(0.0, 0.22, fT);
      const footLen = 1 - smoothstep(0.25, 0.92, fT);
      rx = (0.044 + 0.012 * footLen) * (0.65 + 0.35 * soleFlat);
      rz = (0.048 + 0.068 * footLen) * (0.7 + 0.3 * soleFlat);
      cz += 0.056 * footLen; // Extend forefoot cleanly toward +Z
    }

    if (r === 0 || r === rings - 1) {
      rx = 0.002;
      rz = 0.002;
    }

    for (let s = 0; s <= radSegs; s++) {
      const uNorm = s / radSegs;
      const theta = (uNorm - 0.5) * Math.PI * 2; // 0 = front (+Z), +/-PI = back (-Z)
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const isOuter = sinT * side > 0;

      let px = cx + sinT * rx;
      let pz = cz + cosT * rz;
      let relief = 0;
      let ao = 1.0;

      // ---------- QUADRICEPS (Front & Outer Sweep + Teardrop VMO) ----------
      if (y >= 0.56 && y <= 0.99 && cosT > -0.15) {
        const quadY = smoothstep(0.56, 0.64, y) * (1 - smoothstep(0.93, 1.0, y));
        // Rectus femoris central ridge
        const rectus = gauss(sinT, 0, 0.32) * smoothstep(0.25, 0.85, cosT);
        // Vastus lateralis outer athletic sweep
        const latSweep = isOuter ? gauss(Math.abs(sinT), 0.72, 0.24) * smoothstep(-0.15, 0.55, cosT) : 0;
        // Vastus medialis teardrop right above inner knee
        const vmo = !isOuter ? gauss(y, 0.635, 0.045) * gauss(Math.abs(sinT), 0.48, 0.24) * smoothstep(0.1, 0.7, cosT) : 0;

        relief += (0.016 * rectus + 0.018 * latSweep) * quadY + 0.014 * vmo;
        // Subtle separation crease between rectus & vastus lateralis
        const quadCrease = isOuter ? gauss(Math.abs(sinT), 0.42, 0.09) * quadY * smoothstep(0.2, 0.8, cosT) : 0;
        ao -= 0.14 * quadCrease;
      }

      // ---------- HAMSTRINGS (Twin Posterior Thigh Columns) ----------
      if (y >= 0.56 && y <= 0.96 && cosT < -0.1) {
        const hamY = smoothstep(0.56, 0.65, y) * (1 - smoothstep(0.90, 0.97, y));
        const backF = smoothstep(-0.1, -0.55, cosT);
        const twinHead = smoothstep(0.06, 0.28, Math.abs(sinT)) * (1 - smoothstep(0.75, 0.95, Math.abs(sinT)));
        relief += 0.016 * hamY * backF * twinHead;
        // Subtle midline separation between biceps femoris & semitendinosus
        const hamLine = gauss(sinT, 0, 0.12) * hamY * backF;
        relief -= 0.005 * hamLine;
        ao -= 0.16 * hamLine;
      }

      // ---------- KNEE / PATELLA ----------
      if (y >= 0.49 && y <= 0.58 && cosT > 0.3) {
        const patella = gauss(y, 0.535, 0.024) * gauss(sinT, 0, 0.32);
        relief += 0.01 * patella;
      }

      // ---------- CALVES (Sculpted Diamond Gastrocnemius + Tapered Achilles) ----------
      if (y >= 0.14 && y <= 0.50 && cosT < 0.05) {
        const backF = smoothstep(0.05, -0.45, cosT);
        // High twin diamond gastrocnemius heads (medial slightly lower than lateral!)
        const headPeakY = isOuter ? 0.395 : 0.375;
        const gastro = gauss(y, headPeakY, 0.065) * smoothstep(0.05, 0.32, Math.abs(sinT)) * (1 - smoothstep(0.78, 0.98, Math.abs(sinT)));
        // Crisp narrow Achilles tendon below y = 0.29
        const achilles = smoothstep(0.30, 0.18, y) * gauss(sinT, 0, 0.24) * backF;
        relief += 0.022 * gastro * backF + 0.007 * achilles;
        // Sculpted gastroc central vertical furrow
        const calfSplit = gauss(sinT, 0, 0.11) * gauss(y, 0.385, 0.065) * backF;
        relief -= 0.006 * calfSplit;
        ao -= 0.2 * calfSplit;
      }

      px += sinT * relief;
      pz += cosT * relief;

      const idx = r * stride + s;
      positions[idx * 3] = px;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = pz;
      uvs[idx * 2] = uNorm * 2.2;
      uvs[idx * 2 + 1] = y * 2.4;
      aoValues[idx] = clamp(ao, 0.66, 1.0);
    }
  }

  const classifyLeg = (i0: number, i1: number, i2: number): AnatomyRegionId => {
    const cy = (positions[i0 * 3 + 1] + positions[i1 * 3 + 1] + positions[i2 * 3 + 1]) / 3;
    const s0 = i0 % stride;
    const s1 = i1 % stride;
    const s2 = i2 % stride;
    const thetaAvg =
      (((s0 / radSegs) - 0.5) * Math.PI * 2 +
        ((s1 / radSegs) - 0.5) * Math.PI * 2 +
        ((s2 / radSegs) - 0.5) * Math.PI * 2) /
      3;
    const cosA = Math.cos(thetaAvg);

    // Thigh muscles
    if (cy >= 0.57 && cy <= 0.98) {
      return cosA >= -0.06 ? 'quads' : 'hamstrings';
    }
    // Lower leg calves (posterior gastrocnemius + soleus)
    if (cy >= 0.21 && cy <= 0.48 && cosA < 0.06) {
      return 'calves';
    }
    return 'base';
  };

  return buildPartitionedLoft(rings, radSegs, positions, uvs, aoValues, ringCenters, classifyLeg);
}

/**
 * Builds the entire seamless sculpted 3D human anatomy figure as partitioned,
 * normal-welded geometries ready to bind to per-muscle PBR materials.
 */
export function buildCompleteSculptedAnatomy(): SculptedRegionPart[] {
  return [
    ...buildSculptedTrunk(),
    ...buildSculptedArm(-1),
    ...buildSculptedArm(1),
    ...buildSculptedLeg(-1),
    ...buildSculptedLeg(1),
  ];
}
