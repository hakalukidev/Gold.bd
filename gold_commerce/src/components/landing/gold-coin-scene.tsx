"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { BANGLADESH_DIVISIONS, BANGLADESH_SVG_HEIGHT, BANGLADESH_SVG_WIDTH } from "./bangladesh-geo";

const FONT_URL = "/fonts/gentilis_bold.typeface.json";

// --- Coin proportions -------------------------------------------------
// Everything below is real geometry (extruded rings, bevels, embossed
// letters, a reeded edge) rather than a flat disc with a painted texture.
// All radii are fractions of the outer ridge radius (1); all depths are
// authored "outward" along local +Z, then the obverse/reverse assemblies
// are placed and mirrored so +Z always points toward whichever camera side
// is looking at that face.

const CORE_DEPTH = 0.3; // overall coin thickness (core drum + ridges)
const RIDGE_OUT = 1.0;
const RIDGE_IN = 0.975;
const RIDGE_COUNT = 90;

const BEVEL_OUT = RIDGE_IN;
const BEVEL_IN = 0.9;
const BEVEL_DEPTH = 0.02;

const RIM_OUT = BEVEL_IN;
const RIM_IN = 0.79;
const RIM_DEPTH = 0.026;

const GROOVE_OUT = RIM_IN;
const GROOVE_IN = 0.745;
const GROOVE_DEPTH = 0.012;
const GROOVE_Z = -0.016;

const RING_OUT = GROOVE_IN;
const RING_IN = 0.66;
const RING_DEPTH = 0.03;

const FACE_R = RING_IN;
const FACE_DEPTH = 0.012;
const FACE_Z = -0.006;
const FACE_TOP = FACE_Z + FACE_DEPTH;

// --- Small geometry builders -------------------------------------------

function makeAnnulusGeometry(
  outerR: number,
  innerR: number,
  depth: number,
  bevel?: { thickness: number; size: number }
) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    curveSegments: 96,
    bevelEnabled: !!bevel,
    bevelThickness: bevel?.thickness ?? 0,
    bevelSize: bevel?.size ?? 0,
    bevelSegments: 2,
  });
}

function makeDiscGeometry(radius: number, depth: number) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  return new THREE.ExtrudeGeometry(shape, { depth, curveSegments: 96, bevelEnabled: false });
}

// The coin's core + edge in one piece: a filled disc whose perimeter
// zigzags between RIDGE_OUT/RIDGE_IN so the reeded edge is real geometry
// (its facets catch light as the coin turns) instead of a striped texture.
function makeRidgedCoreGeometry(depth: number) {
  const shape = new THREE.Shape();
  const totalPoints = RIDGE_COUNT * 2;
  for (let i = 0; i <= totalPoints; i++) {
    const angle = (i / totalPoints) * Math.PI * 2;
    const r = i % 2 === 0 ? RIDGE_OUT : RIDGE_IN;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return new THREE.ExtrudeGeometry(shape, { depth, curveSegments: 1, bevelEnabled: false });
}

function centerGeometryXY(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  geo.translate(-(box.max.x + box.min.x) / 2, -(box.max.y + box.min.y) / 2, 0);
  return geo;
}

function buildStraightTextMesh(
  font: Font,
  text: string,
  size: number,
  depth: number,
  material: THREE.Material,
  position: [number, number, number]
) {
  const geo = new TextGeometry(text, {
    font,
    size,
    depth,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: depth * 0.35,
    bevelSize: depth * 0.25,
    bevelSegments: 2,
  });
  centerGeometryXY(geo);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(...position);
  return mesh;
}

// Letters are arced along `radius` with their baseline sitting on the
// circle and cap-height pointing outward — the standard minted rim-text
// look, built from real per-letter extruded geometry (not a canvas arc).
function buildArcTextGroup(
  font: Font,
  text: string,
  radius: number,
  size: number,
  depth: number,
  material: THREE.Material,
  letterSpacing: number
) {
  const group = new THREE.Group();
  const chars = [...text];

  const widths = chars.map((c) => {
    if (c === " ") return size * 0.55 + letterSpacing;
    const geo = new TextGeometry(c, { font, size, depth, curveSegments: 6, bevelEnabled: false });
    geo.computeBoundingBox();
    const w = geo.boundingBox!.max.x - geo.boundingBox!.min.x;
    geo.dispose();
    return w + letterSpacing;
  });

  const totalAngle = widths.reduce((sum, w) => sum + w / radius, 0);
  let angle = -totalAngle / 2;

  chars.forEach((c, i) => {
    const charAngle = widths[i] / radius;
    angle += charAngle / 2;
    if (c !== " ") {
      const geo = new TextGeometry(c, {
        font,
        size,
        depth,
        curveSegments: 6,
        bevelEnabled: true,
        bevelThickness: depth * 0.35,
        bevelSize: depth * 0.22,
        bevelSegments: 2,
      });
      geo.computeBoundingBox();
      const box = geo.boundingBox!;
      geo.translate(-(box.max.x + box.min.x) / 2, 0, 0);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(Math.sin(angle) * radius, Math.cos(angle) * radius, 0);
      mesh.rotation.z = -angle;
      group.add(mesh);
    }
    angle += charAngle / 2;
  });

  return group;
}

// Reverse-face decal: the Bangladesh division outlines as a raised gold
// relief, drawn to a transparent canvas and layered as an alpha-masked
// plane in front of the plain reverse face plate (an SVG-accurate map is
// too fine a detail to justify modeling as extruded geometry).
function drawBangladeshDecal() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const scale = (size * 0.62) / BANGLADESH_SVG_HEIGHT;
  const targetWidth = BANGLADESH_SVG_WIDTH * scale;
  const targetHeight = BANGLADESH_SVG_HEIGHT * scale;
  const originX = size / 2 - targetWidth / 2;
  const originY = size / 2 - targetHeight / 2 - size * 0.03;

  const paths = BANGLADESH_DIVISIONS.map(({ d }) => new Path2D(d));

  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(scale, scale);

  ctx.save();
  ctx.translate(2.5 / scale, 2.5 / scale);
  ctx.fillStyle = "rgba(60, 40, 12, 0.55)";
  paths.forEach((p) => ctx.fill(p));
  ctx.restore();

  const gradient = ctx.createLinearGradient(0, 0, BANGLADESH_SVG_WIDTH, BANGLADESH_SVG_HEIGHT);
  gradient.addColorStop(0, "#fdf0c4");
  gradient.addColorStop(0.45, "#e3b969");
  gradient.addColorStop(1, "#8f6c1e");

  paths.forEach((p) => {
    ctx.fillStyle = gradient;
    ctx.fill(p);
    ctx.strokeStyle = "rgba(107, 77, 24, 0.85)";
    ctx.lineWidth = 1.4 / scale;
    ctx.stroke(p);
  });

  ctx.save();
  ctx.translate(-1.2 / scale, -1.2 / scale);
  ctx.strokeStyle = "rgba(255, 247, 217, 0.65)";
  ctx.lineWidth = 1 / scale;
  paths.forEach((p) => ctx.stroke(p));
  ctx.restore();

  ctx.restore();
  return canvas;
}

// --- Materials -----------------------------------------------------------

function useCoinMaterials() {
  return useMemo(() => {
    // Metalness stays under 1 on every part: there's no env map to reflect
    // (see the Canvas comment below on why <Environment> is avoided), and a
    // pure metal with no environment reads pure black wherever it isn't
    // catching a direct specular hit — which, once the coin is real bevelled
    // geometry instead of one flat disc, is most of its surface.
    const bevel = new THREE.MeshStandardMaterial({ color: "#f4c75a", metalness: 0.88, roughness: 0.18, side: THREE.DoubleSide });
    const rim = new THREE.MeshStandardMaterial({ color: "#f7d072", metalness: 0.85, roughness: 0.15, side: THREE.DoubleSide });
    const groove = new THREE.MeshStandardMaterial({ color: "#8e6415", metalness: 0.85, roughness: 0.4, side: THREE.DoubleSide });
    const innerRing = new THREE.MeshStandardMaterial({ color: "#f2c24e", metalness: 0.88, roughness: 0.17, side: THREE.DoubleSide });
    const face = new THREE.MeshStandardMaterial({ color: "#caa23a", metalness: 0.78, roughness: 0.28, side: THREE.DoubleSide });
    const text = new THREE.MeshStandardMaterial({ color: "#fff2c9", metalness: 0.82, roughness: 0.2, side: THREE.DoubleSide });
    const core = new THREE.MeshStandardMaterial({ color: "#d6a62a", metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide });

    const decalTexture = new THREE.CanvasTexture(drawBangladeshDecal());
    decalTexture.colorSpace = THREE.SRGBColorSpace;
    decalTexture.anisotropy = 8;
    const decal = new THREE.MeshStandardMaterial({
      map: decalTexture,
      transparent: true,
      alphaTest: 0.08,
      metalness: 0.78,
      roughness: 0.28,
      side: THREE.DoubleSide,
    });

    return { bevel, rim, groove, innerRing, face, text, core, decal };
  }, []);
}

// --- Face assembly (shared by obverse and reverse) ------------------------

type CoinMaterials = ReturnType<typeof useCoinMaterials>;

function buildRingSet(materials: CoinMaterials) {
  const group = new THREE.Group();

  const bevelMesh = new THREE.Mesh(
    makeAnnulusGeometry(BEVEL_OUT, BEVEL_IN, BEVEL_DEPTH, { thickness: 0.006, size: 0.006 }),
    materials.bevel
  );
  group.add(bevelMesh);

  const rimMesh = new THREE.Mesh(makeAnnulusGeometry(RIM_OUT, RIM_IN, RIM_DEPTH), materials.rim);
  group.add(rimMesh);

  const grooveMesh = new THREE.Mesh(makeAnnulusGeometry(GROOVE_OUT, GROOVE_IN, GROOVE_DEPTH), materials.groove);
  grooveMesh.position.z = GROOVE_Z;
  group.add(grooveMesh);

  const ringMesh = new THREE.Mesh(
    makeAnnulusGeometry(RING_OUT, RING_IN, RING_DEPTH, { thickness: 0.007, size: 0.007 }),
    materials.innerRing
  );
  group.add(ringMesh);

  const faceMesh = new THREE.Mesh(makeDiscGeometry(FACE_R, FACE_DEPTH), materials.face);
  faceMesh.position.z = FACE_Z;
  group.add(faceMesh);

  return group;
}

function buildObverse(font: Font, materials: CoinMaterials) {
  const group = buildRingSet(materials);

  const arc = buildArcTextGroup(font, "PURE GOLD", 0.565, 0.078, 0.018, materials.text, 0.012);
  arc.position.z = FACE_TOP;
  group.add(arc);

  group.add(buildStraightTextMesh(font, "24K", 0.3, 0.026, materials.text, [0, 0.09, FACE_TOP]));
  group.add(buildStraightTextMesh(font, "GOLD", 0.13, 0.02, materials.text, [0, -0.16, FACE_TOP]));
  group.add(buildStraightTextMesh(font, "999.9", 0.065, 0.016, materials.text, [0, -0.32, FACE_TOP]));

  return group;
}

function buildReverse(font: Font, materials: CoinMaterials) {
  const group = buildRingSet(materials);

  const decal = new THREE.Mesh(new THREE.PlaneGeometry(FACE_R * 2, FACE_R * 2), materials.decal);
  decal.position.z = FACE_TOP + 0.001;
  group.add(decal);

  group.add(buildStraightTextMesh(font, "BANGLADESH", 0.072, 0.016, materials.text, [0, -0.42, FACE_TOP]));

  return group;
}

function buildCoinGroup(font: Font, materials: CoinMaterials) {
  const root = new THREE.Group();

  const core = new THREE.Mesh(makeRidgedCoreGeometry(CORE_DEPTH), materials.core);
  core.position.z = -CORE_DEPTH / 2;
  root.add(core);

  const obverse = buildObverse(font, materials);
  obverse.position.z = CORE_DEPTH / 2;
  root.add(obverse);

  const reverse = buildReverse(font, materials);
  reverse.position.z = -CORE_DEPTH / 2;
  reverse.rotation.y = Math.PI;
  root.add(reverse);

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return root;
}

// Resting pose the coin holds from the first frame: leaned back on the X
// axis so the reeded edge reads clearly along the bottom-left rim, while it
// continuously spins about the Y axis (the visible motion of a Y-axis spin
// reads as travel along X, sweeping the obverse/reverse faces into view).
const BASE_TILT_X = -0.62;
const BASE_TILT_Z = -0.18;
const SPIN_SPEED_INITIAL = 6; // radians / second, on first appearance
const SPIN_SPEED_SETTLED = 0.6; // radians / second, once it's settled down
const SPIN_SETTLE_RATE = 0.6; // how quickly the initial burst decays toward settled speed
const MAX_FRAME_DELTA = 0.1; // clamp so a slow first frame (font/asset load) can't jump-cut the spin

const DRAG_SPIN_SPEED = 0.012; // radians of Y rotation per pixel of horizontal drag
const DRAG_TILT_SPEED = 0.006; // radians of X tilt offset per pixel of vertical drag
const DRAG_TILT_LIMIT = 1.1; // clamp on how far vertical drag can tip the coin from its base lean

export type DragState = {
  dragging: boolean;
  deltaX: number;
  deltaY: number;
};

function Coin({
  hovered,
  scrollProgress,
  drag,
}: {
  hovered: boolean;
  scrollProgress: { current: number };
  drag: RefObject<DragState>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const scaleRef = useRef(1);
  const spinSpeedRef = useRef(SPIN_SPEED_INITIAL);
  const mountTimeRef = useRef<number | null>(null);
  const dragTiltOffsetRef = useRef(0);
  const materials = useCoinMaterials();
  const font = useLoader(FontLoader, FONT_URL);
  const coin = useMemo(() => buildCoinGroup(font, materials), [font, materials]);
  const pointer = useThree((state) => state.pointer);

  useEffect(() => {
    return () => {
      coin.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
    };
  }, [coin]);

  // react-three-fiber's useFrame runs a per-frame imperative animation loop
  // outside React's render cycle, so mutating the shared drag ref here is
  // the intended pattern (see the pointer handlers below, which write to
  // the same ref). The React Compiler lint doesn't model useFrame's
  // semantics and flags it as a render-time prop mutation.
  // eslint-disable-next-line react-hooks/immutability
  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Drag input is collected off-frame (DOM pointer events) as raw pixel
    // deltas; consume and clear it here so it reads as one frame's worth of
    // motion regardless of how many pointermove events fired in between.
    const dragState = drag.current;
    const dragDeltaX = dragState?.deltaX ?? 0;
    const dragDeltaY = dragState?.deltaY ?? 0;
    if (dragState) {
      // eslint-disable-next-line react-hooks/immutability -- see note above
      dragState.deltaX = 0;
      dragState.deltaY = 0;
    }
    dragTiltOffsetRef.current = THREE.MathUtils.clamp(
      dragTiltOffsetRef.current + dragDeltaY * DRAG_TILT_SPEED,
      -DRAG_TILT_LIMIT,
      DRAG_TILT_LIMIT
    );

    // Coin holds its lean, nudged further by the cursor and by any vertical
    // drag the user has applied — X axis only.
    const targetTiltX =
      BASE_TILT_X + THREE.MathUtils.clamp(-pointer.y, -1, 1) * 0.12 + dragTiltOffsetRef.current;
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, targetTiltX, 0.06);

    // Continuous spin about the Y axis — starts fast on first appearance,
    // then eases down to its settled speed. Timed off elapsed-since-mount
    // (not raw delta) because the first frame after Suspense/font load can
    // report a large delta and would otherwise skip the fast-spin intro.
    if (mountTimeRef.current === null) mountTimeRef.current = state.clock.elapsedTime;
    const sinceMount = state.clock.elapsedTime - mountTimeRef.current;
    spinSpeedRef.current =
      SPIN_SPEED_SETTLED + (SPIN_SPEED_INITIAL - SPIN_SPEED_SETTLED) * Math.exp(-SPIN_SETTLE_RATE * sinceMount);

    if (dragState?.dragging) {
      // While dragging, horizontal movement drives rotation directly instead
      // of the ambient auto-spin.
      group.rotation.y += dragDeltaX * DRAG_SPIN_SPEED;
    } else {
      group.rotation.y += Math.min(delta, MAX_FRAME_DELTA) * spinSpeedRef.current;
    }

    // Hover bump.
    scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, hovered ? 1.1 : 1, 0.1);
    group.scale.setScalar(scaleRef.current);

    // A gentle continuous float, plus the scroll-away drift (still X-axis only).
    const floatBob = Math.sin(state.clock.elapsedTime * 1.3) * 0.09;
    const progress = scrollProgress.current;
    group.position.y = THREE.MathUtils.lerp(group.position.y, progress * 1.4 + floatBob, 0.08);
    group.rotation.x += progress * 0.3;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} rotation={[BASE_TILT_X, 0, BASE_TILT_Z]}>
      <primitive object={coin} />
    </group>
  );
}

function useScrollProgress(containerRef: React.RefObject<HTMLDivElement | null>) {
  const progress = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      // 0 while the hero is on screen, ramping to 1 as it scrolls past the top.
      const raw = -rect.top / Math.max(rect.height, 1);
      progress.current = THREE.MathUtils.clamp(raw, 0, 1.5);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  return progress;
}

export default function GoldCoinScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollProgress = useScrollProgress(containerRef);
  const dragRef = useRef<DragState>({ dragging: false, deltaX: 0, deltaY: 0 });
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current.dragging = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging || !lastPointerRef.current) return;
    dragRef.current.deltaX += e.clientX - lastPointerRef.current.x;
    dragRef.current.deltaY += e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current.dragging = false;
    lastPointerRef.current = null;
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto aspect-square w-full select-none touch-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={(e) => {
        setHovered(false);
        endDrag(e);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <Canvas
        camera={{ position: [0, 0, 4.3], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        {/* No drei <Environment>: its PMREM step crashes on software-rendered GPUs and fetches an HDR from a CDN. */}
        <ambientLight intensity={1.35} color="#6b5426" />
        <directionalLight position={[3, 4, 3]} intensity={2.9} color="#fff2d2" />
        <directionalLight position={[-3, 1, 2]} intensity={1.4} color="#ffe9b8" />
        <directionalLight position={[-2, -3, -2]} intensity={0.6} color="#4a3b1f" />
        {/* Fill light from below — the coin's steep lean exposes the underside of
            its reeded edge, which every other light in this rig sits above. Without
            this it renders pure black and reads as if the coin's been clipped. */}
        <directionalLight position={[0, -4, 2.5]} intensity={1.7} color="#c99a3f" />
        <pointLight position={[0, 0, 3]} intensity={0.7} color="#fff6dd" />
        {/* Tight hot highlight riding the upper-right rim — this is what reads as the "flare" streak on the coin's edge. */}
        <pointLight position={[1.8, 1.6, 2.2]} intensity={3.6} distance={6} decay={2} color="#fff9e6" />
        <spotLight
          position={[2.4, 2.2, 2.6]}
          angle={0.35}
          penumbra={0.6}
          intensity={4}
          distance={8}
          color="#ffe9a8"
        />
        <Suspense fallback={null}>
          <Coin hovered={hovered} scrollProgress={scrollProgress} drag={dragRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
