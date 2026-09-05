/**
 * scene.ts — engine, câmera fixa isométrica, luzes, materiais e malhas.
 * O mundo gira; a câmera nunca. Sem plugin de física: a cena apenas
 * espelha o estado de GiralataWorld a cada quadro.
 */
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateTube } from "@babylonjs/core/Meshes/Builders/tubeBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";

import { COLORS, CONFIG } from "./config";
import { len, type Vec2 } from "./math";
import { bumperAngle, bumperPosition, coinAngle, coinPosition, portAngle, portPosition, ringAngle } from "./physics";
import type { GiralataWorld } from "./world";

export interface GiralataScene {
  /** projeta coordenadas de tela no plano da arena (y = 0) */
  screenToWorld(clientX: number, clientY: number): Vec2 | null;
  dispose(): void;
}

export interface SceneOptions {
  shadows?: boolean;
  onReady?: () => void;
}

const CAM_DISTANCE = 15.6;
const CAM_ELEVATION = (50 * Math.PI) / 180;
const CAM_TARGET = new Vector3(0, 0, 0.9);
const FOV_LANDSCAPE = 0.66;
const FOV_PORTRAIT = 0.98;

export function createGiralataScene(canvas: HTMLCanvasElement, world: GiralataWorld, opts: SceneOptions = {}): GiralataScene {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: false,
    antialias: true,
    adaptToDeviceRatio: false,
    powerPreference: "high-performance",
  });
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  engine.setHardwareScalingLevel(1 / Math.min(dpr, 2));

  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString(COLORS.ceu + "FF");
  scene.ambientColor = new Color3(0.35, 0.35, 0.4);

  // ------------------------------------------------------------ câmera fixa
  const camera = new TargetCamera("giralata-camera", new Vector3(0, 10, -10), scene);
  camera.minZ = 0.5;
  camera.maxZ = 120;
  const fitCamera = (): void => {
    const w = engine.getRenderWidth();
    const h = engine.getRenderHeight();
    const portrait = w < h;
    camera.fovMode = portrait ? Camera.FOVMODE_HORIZONTAL_FIXED : Camera.FOVMODE_VERTICAL_FIXED;
    camera.fov = portrait ? FOV_PORTRAIT : FOV_LANDSCAPE;
    const target = portrait ? new Vector3(0, 0, 1.0) : CAM_TARGET;
    camera.position = target.add(new Vector3(0, Math.sin(CAM_ELEVATION) * CAM_DISTANCE, -Math.cos(CAM_ELEVATION) * CAM_DISTANCE));
    camera.setTarget(target);
  };
  fitCamera();

  // ------------------------------------------------------------ luzes
  const hemi = new HemisphericLight("hemi", new Vector3(0.2, 1, -0.3), scene);
  hemi.intensity = 0.72;
  hemi.diffuse = new Color3(1, 0.98, 0.94);
  hemi.groundColor = new Color3(0.55, 0.6, 0.7);
  hemi.specular = new Color3(0.2, 0.2, 0.2);

  const sun = new DirectionalLight("sun", new Vector3(-0.45, -1, 0.55).normalize(), scene);
  sun.position = new Vector3(8, 16, -9);
  sun.intensity = 0.95;
  sun.diffuse = new Color3(1, 0.96, 0.88);
  sun.specular = new Color3(0.35, 0.33, 0.3);

  const useShadows = opts.shadows ?? true;
  let shadow: ShadowGenerator | null = null;
  if (useShadows) {
    shadow = new ShadowGenerator(1024, sun);
    shadow.usePercentageCloserFiltering = true;
    shadow.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
    shadow.bias = 0.0025;
    shadow.normalBias = 0.02;
    shadow.setDarkness(0.45);
  }
  const cast = (m: Mesh): void => {
    shadow?.addShadowCaster(m, false);
  };

  // ------------------------------------------------------------ materiais
  const materials = new Map<string, StandardMaterial>();
  const mat = (hex: string, options: { spec?: number; emissive?: number; power?: number } = {}): StandardMaterial => {
    const key = `${hex}|${options.spec ?? 0.3}|${options.emissive ?? 0.05}|${options.power ?? 48}`;
    const cached = materials.get(key);
    if (cached) return cached;
    const m = new StandardMaterial(`mat-${key}`, scene);
    const c = Color3.FromHexString(hex);
    m.diffuseColor = c;
    m.specularColor = new Color3(options.spec ?? 0.3, options.spec ?? 0.3, options.spec ?? 0.3);
    m.specularPower = options.power ?? 48;
    m.emissiveColor = c.scale(options.emissive ?? 0.05);
    m.ambientColor = c.scale(0.5);
    materials.set(key, m);
    return m;
  };

  // ------------------------------------------------------------ paisagem
  // o parque em miniatura fica atrás da arena; à frente e abaixo, só céu ciano
  const grass = CreateBox("grass", { width: 160, height: 0.1, depth: 80 }, scene);
  grass.position.set(0, -0.72, 4 + 40);
  grass.material = mat(COLORS.grama, { spec: 0.02 });
  grass.receiveShadows = true;

  const SAND_Z = 3.2;
  const sand = CreateDisc("sand", { radius: 9.6, tessellation: 96 }, scene);
  sand.rotation.x = Math.PI / 2;
  sand.position.set(0, -0.66, SAND_Z);
  sand.material = mat(COLORS.areia, { spec: 0.04 });
  sand.receiveShadows = true;

  const brickPath: Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = 0.1 + ((Math.PI - 0.2) * i) / 64;
    brickPath.push(new Vector3(9.9 * Math.cos(a), 0, SAND_Z + 9.9 * Math.sin(a)));
  }
  const brick = CreateTube("brick", { path: brickPath, radius: 0.28, tessellation: 8, cap: Mesh.CAP_ALL }, scene);
  brick.position.y = -0.64;
  brick.material = mat("#D89A6A", { spec: 0.05 });

  const scenery = new TransformNode("scenery", scene);
  const treeMat = mat(COLORS.verdeEscuro, { spec: 0.05 });
  const crownMat = mat("#6CC24A", { spec: 0.05 });
  const trunkMat = mat(COLORS.tronco, { spec: 0.05 });
  const treeSpots: Array<[number, number, number]> = [
    [11.5, 0.35, 0], [13.2, 0.75, 1], [12.4, 1.15, 0], [14.0, 1.5, 1], [12.0, 1.85, 0], [13.4, 2.25, 1], [11.6, 2.7, 0],
    [15.5, 0.1, 1], [15.8, 3.05, 1], [18, 1.0, 0], [18.5, 2.2, 0],
  ];
  treeSpots.forEach(([r, a, kind], i) => {
    const x = r * Math.cos(a);
    const z = r * Math.sin(a);
    const trunk = CreateCylinder(`trunk${i}`, { diameter: 0.5, height: 1.6, tessellation: 10 }, scene);
    trunk.position.set(x, 0.1, z);
    trunk.material = trunkMat;
    trunk.parent = scenery;
    if (kind === 0) {
      const crown = CreateSphere(`crown${i}`, { diameter: 2.6, segments: 12 }, scene);
      crown.position.set(x, 1.8, z);
      crown.material = crownMat;
      crown.parent = scenery;
    } else {
      const cone = CreateCylinder(`cone${i}`, { diameterTop: 0, diameterBottom: 2.3, height: 3.4, tessellation: 12 }, scene);
      cone.position.set(x, 2.2, z);
      cone.material = treeMat;
      cone.parent = scenery;
    }
  });

  // postes listrados e blocos cinéticos em cores primárias
  const poleSpots = [0.55, 1.25, 1.9, 2.6];
  poleSpots.forEach((a, i) => {
    const x = 9.3 * Math.cos(a);
    const z = 9.3 * Math.sin(a);
    for (let s = 0; s < 6; s++) {
      const seg = CreateCylinder(`pole${i}-${s}`, { diameter: 0.26, height: 0.5, tessellation: 10 }, scene);
      seg.position.set(x, -0.4 + s * 0.5, z);
      seg.material = mat(s % 2 === 0 ? COLORS.branco : COLORS.vermelho, { spec: 0.15 });
      seg.parent = scenery;
    }
    const ball = CreateSphere(`poleBall${i}`, { diameter: 0.5, segments: 10 }, scene);
    ball.position.set(x, 2.85, z);
    ball.material = mat(COLORS.amarelo, { spec: 0.3 });
    ball.parent = scenery;
  });

  const blocks: Array<[number, number, string, string]> = [
    [-10.5, 4.2, COLORS.vermelho, COLORS.azul],
    [10.5, 4.2, COLORS.azul, COLORS.vermelho],
    [-8.5, 9.5, COLORS.amarelo, COLORS.coral],
    [8.5, 9.5, COLORS.coral, COLORS.amarelo],
  ];
  blocks.forEach(([x, z, boxColor, ballColor], i) => {
    const base = CreateBox(`blockBase${i}`, { width: 2.4, height: 0.6, depth: 2.4 }, scene);
    base.position.set(x, -0.35, z);
    base.material = mat(COLORS.cremeEscuro, { spec: 0.1 });
    base.parent = scenery;
    const box = CreateBox(`block${i}`, { width: 1.6, height: 1.2, depth: 1.6 }, scene);
    box.position.set(x, 0.55, z);
    box.material = mat(boxColor, { spec: 0.25 });
    box.parent = scenery;
    const ball = CreateSphere(`blockBall${i}`, { diameter: 1.3, segments: 12 }, scene);
    ball.position.set(x, 1.8, z);
    ball.material = mat(ballColor, { spec: 0.35 });
    ball.parent = scenery;
  });

  // ------------------------------------------------------------ arena (tampa de lata gigante)
  const arena = CreateCylinder("arena", { diameter: CONFIG.physics.EDGE_RADIUS * 2 + 0.3, height: 0.62, tessellation: 128 }, scene);
  arena.position.y = -0.31;
  arena.material = mat("#FFFDF6", { spec: 0.12, emissive: 0.12, power: 64 });
  arena.receiveShadows = true;

  const rim = CreateTorus("rim", { diameter: CONFIG.physics.EDGE_RADIUS * 2 + 0.3, thickness: 0.16, tessellation: 128 }, scene);
  rim.position.y = 0.0;
  rim.material = mat(COLORS.cremeEscuro, { spec: 0.2 });

  const pedestal = CreateCylinder("pedestal", { diameter: 1.1, height: 0.26, tessellation: 48 }, scene);
  pedestal.position.y = 0.13;
  pedestal.material = mat(COLORS.rosa, { spec: 0.35 });
  cast(pedestal);

  // ------------------------------------------------------------ anéis contrarrotativos
  const ringNodes: TransformNode[] = CONFIG.rings.map((ring, r) => {
    const node = new TransformNode(`ring${r}`, scene);
    const m = mat(ring.color, { spec: 0.45, power: 64 });
    ring.arcs.forEach(([start, length], a) => {
      const full = length >= Math.PI * 2 - 1e-6;
      const segs = Math.max(8, Math.round((length / (Math.PI * 2)) * 96));
      const path: Vector3[] = [];
      for (let i = 0; i <= segs; i++) {
        const ang = start + (length * i) / segs;
        path.push(new Vector3(ring.radius * Math.cos(ang), 0, ring.radius * Math.sin(ang)));
      }
      const tube = CreateTube(`ring${r}-arc${a}`, { path, radius: ring.tube, tessellation: 14, cap: full ? Mesh.NO_CAP : Mesh.CAP_ALL }, scene);
      tube.position.y = ring.tube;
      tube.material = m;
      tube.parent = node;
      cast(tube);
    });
    return node;
  });

  // ------------------------------------------------------------ latas-bumper (sem rosto, sem marca)
  const bumperNodes: TransformNode[] = CONFIG.bumpers.map((b, i) => {
    const node = new TransformNode(`bumper${i}`, scene);
    const baseColor = b.color === "amarelo" ? COLORS.amarelo : COLORS.turquesa;
    const canColor = b.color === "amarelo" ? COLORS.amareloEscuro : COLORS.amarelo;
    const base = CreateCylinder(`bumper${i}-base`, { diameter: b.radius * 2, height: 0.9, tessellation: 40 }, scene);
    base.position.y = 0.45;
    base.material = mat(baseColor, { spec: 0.35 });
    base.parent = node;
    cast(base);
    const can = CreateCylinder(`bumper${i}-can`, { diameter: 0.66, height: 0.56, tessellation: 32 }, scene);
    can.position.y = 0.9 + 0.28;
    can.material = mat(canColor, { spec: 0.5, power: 80 });
    can.parent = node;
    cast(can);
    const band = CreateCylinder(`bumper${i}-band`, { diameter: 0.7, height: 0.12, tessellation: 32 }, scene);
    band.position.y = 0.9 + 0.28;
    band.material = mat(COLORS.azul, { spec: 0.4 });
    band.parent = node;
    const lid = CreateCylinder(`bumper${i}-lid`, { diameter: 0.6, height: 0.05, tessellation: 32 }, scene);
    lid.position.y = 0.9 + 0.56 + 0.02;
    lid.material = mat(COLORS.creme, { spec: 0.5 });
    lid.parent = node;
    const rivet = CreateSphere(`bumper${i}-rivet`, { diameter: 0.14, segments: 8 }, scene);
    rivet.position.set(0.3, 0.9 + 0.28, 0);
    rivet.material = mat(COLORS.vermelho, { spec: 0.4 });
    rivet.parent = node;
    return node;
  });

  // ------------------------------------------------------------ portos
  const portNodes: TransformNode[] = CONFIG.ports.map((p, i) => {
    const node = new TransformNode(`port${i}`, scene);
    const base = CreateCylinder(`port${i}-base`, { diameter: 1.7, height: 0.16, tessellation: 48 }, scene);
    base.position.y = 0.08;
    base.material = mat(p.color, { spec: 0.3 });
    base.parent = node;
    cast(base);
    const outer = CreateTorus(`port${i}-outer`, { diameter: 1.05, thickness: 0.17, tessellation: 40 }, scene);
    outer.position.y = 0.17;
    outer.material = mat(COLORS.laranja, { spec: 0.45 });
    outer.parent = node;
    const inner = CreateTorus(`port${i}-inner`, { diameter: 0.68, thickness: 0.13, tessellation: 32 }, scene);
    inner.position.y = 0.19;
    inner.material = mat(COLORS.azul, { spec: 0.45 });
    inner.parent = node;
    const core = CreateCylinder(`port${i}-core`, { diameter: 0.44, height: 0.24, tessellation: 24 }, scene);
    core.position.y = 0.2;
    core.material = mat(COLORS.amarelo, { spec: 0.5, emissive: 0.25 });
    core.parent = node;
    for (let k = 0; k < 6; k++) {
      const riv = CreateSphere(`port${i}-riv${k}`, { diameter: 0.1, segments: 6 }, scene);
      const a = (k / 6) * Math.PI * 2;
      riv.position.set(0.7 * Math.cos(a), 0.18, 0.7 * Math.sin(a));
      riv.material = mat(COLORS.creme, { spec: 0.5 });
      riv.parent = node;
    }
    const pole = CreateCylinder(`port${i}-pole`, { diameter: 0.06, height: 0.75, tessellation: 8 }, scene);
    pole.position.set(0.55, 0.45, 0.35);
    pole.material = mat(COLORS.navy, { spec: 0.2 });
    pole.parent = node;
    const flag = CreatePlane(`port${i}-flag`, { width: 0.34, height: 0.22, sideOrientation: Mesh.DOUBLESIDE }, scene);
    flag.position.set(0.72, 0.72, 0.35);
    flag.material = mat(COLORS.coral, { spec: 0.1, emissive: 0.15 });
    flag.parent = node;
    return node;
  });

  const halo = CreateTorus("halo", { diameter: 2.1, thickness: 0.14, tessellation: 48 }, scene);
  halo.position.y = 0.07;
  halo.material = mat(COLORS.lima, { spec: 0.2, emissive: 0.7 });
  const haloDisc = CreateDisc("halo-disc", { radius: 1.2, tessellation: 48 }, scene);
  haloDisc.rotation.x = Math.PI / 2;
  haloDisc.position.y = 0.015;
  const haloDiscMat = mat(COLORS.lima, { spec: 0.05, emissive: 0.5 });
  haloDiscMat.alpha = 0.6;
  haloDisc.material = haloDiscMat;

  // ------------------------------------------------------------ HopiCoins
  const coinNodes: TransformNode[] = CONFIG.coins.map((_, i) => {
    const node = new TransformNode(`coin${i}`, scene);
    const disc = CreateCylinder(`coin${i}-disc`, { diameter: CONFIG.COIN_RADIUS * 2, height: 0.1, tessellation: 24 }, scene);
    disc.material = mat(COLORS.laranja, { spec: 0.55, emissive: 0.15, power: 80 });
    disc.parent = node;
    cast(disc);
    const inset = CreateCylinder(`coin${i}-inset`, { diameter: 0.26, height: 0.11, tessellation: 20 }, scene);
    inset.material = mat(COLORS.azul, { spec: 0.5 });
    inset.parent = node;
    const spark = CreateSphere(`coin${i}-spark`, { diameter: 0.07, segments: 6 }, scene);
    spark.position.set(0.14, 0.06, 0.1);
    spark.material = mat(COLORS.lima, { spec: 0.3, emissive: 0.6 });
    spark.parent = node;
    return node;
  });

  // ------------------------------------------------------------ tampinha
  const capNode = new TransformNode("cap", scene);
  const capBody = CreateCylinder("cap-body", { diameter: CONFIG.physics.CAP_RADIUS * 2, height: 0.18, tessellation: 24 }, scene);
  capBody.position.y = 0.09;
  capBody.material = mat(COLORS.vermelho, { spec: 0.55, emissive: 0.1, power: 80 });
  capBody.parent = capNode;
  cast(capBody);
  const capRim = CreateCylinder("cap-rim", { diameter: CONFIG.physics.CAP_RADIUS * 2 + 0.08, height: 0.07, tessellation: 22 }, scene);
  capRim.position.y = 0.035;
  capRim.material = mat(COLORS.creme, { spec: 0.4 });
  capRim.parent = capNode;
  const capStar = CreateCylinder("cap-star", { diameter: 0.28, height: 0.03, tessellation: 5 }, scene);
  capStar.position.y = 0.19;
  capStar.material = mat(COLORS.lima, { spec: 0.3, emissive: 0.4 });
  capStar.parent = capNode;

  // seta luminosa de mira
  const arrowNode = new TransformNode("arrow", scene);
  const arrowShaft = CreateBox("arrow-shaft", { width: 0.1, height: 0.05, depth: 1 }, scene);
  arrowShaft.position.set(0, 0.05, 0.5);
  arrowShaft.material = mat(COLORS.lima, { spec: 0.1, emissive: 0.7 });
  arrowShaft.parent = arrowNode;
  const arrowHead = CreateCylinder("arrow-head", { diameterTop: 0, diameterBottom: 0.34, height: 0.32, tessellation: 12 }, scene);
  arrowHead.rotation.x = Math.PI / 2;
  arrowHead.position.set(0, 0.05, 1.12);
  arrowHead.material = mat(COLORS.lima, { spec: 0.1, emissive: 0.7 });
  arrowHead.parent = arrowNode;
  arrowNode.setEnabled(false);

  // linha pontilhada de previsão
  const dots: Mesh[] = [];
  for (let i = 0; i < CONFIG.launch.PREVIEW_DOTS; i++) {
    const d = CreateSphere(`dot${i}`, { diameter: 0.15, segments: 8 }, scene);
    d.material = mat(COLORS.navy, { spec: 0.1, emissive: 0.35 });
    d.setEnabled(false);
    dots.push(d);
  }

  // ------------------------------------------------------------ sincronização por quadro
  let spin = 0;
  let lastSpeed = 0;
  const sync = (dt: number): void => {
    const t = world.arenaT;
    ringNodes.forEach((node, r) => {
      node.rotation.y = -ringAngle(r, t);
    });
    CONFIG.bumpers.forEach((b, i) => {
      const p = bumperPosition(b, t);
      bumperNodes[i].position.set(p.x, 0, p.z);
      bumperNodes[i].rotation.y = -bumperAngle(b, t);
    });
    CONFIG.ports.forEach((_, i) => {
      const p = portPosition(i, t);
      portNodes[i].position.set(p.x, 0, p.z);
      portNodes[i].rotation.y = -portAngle(i, t);
    });
    CONFIG.coins.forEach((c, i) => {
      const active = world.coinCollectedAt[i] === null;
      coinNodes[i].setEnabled(active);
      if (!active) return;
      const p = coinPosition(c, t);
      coinNodes[i].position.set(p.x, 0.2 + 0.05 * Math.sin(t * 3 + i), p.z);
      coinNodes[i].rotation.y = -coinAngle(c, t) + t * 2.2;
    });

    const inMatch = world.phase === "playing" || world.phase === "paused" || world.phase === "help";
    halo.setEnabled(inMatch && world.phase !== "help");
    haloDisc.setEnabled(inMatch && world.phase !== "help");
    if (inMatch) {
      const p = portPosition(world.requestedPortIndex(), t);
      halo.position.x = p.x;
      halo.position.z = p.z;
      haloDisc.position.x = p.x;
      haloDisc.position.z = p.z;
      const pulse = 1 + 0.06 * Math.sin(world.clock * 6);
      halo.scaling.set(pulse, 1, pulse);
    }

    const cp = world.displayCapPosition();
    capNode.position.set(cp.x, 0.26 + world.capY, cp.z);
    const power = world.aim?.power ?? 0;
    const s = 1 + 0.3 * power;
    capNode.scaling.set(s, s, s);
    if (world.capState === "moving") {
      lastSpeed = len(world.cap.vel);
      spin += lastSpeed * dt * 1.6;
    } else if (world.capState === "aiming") {
      spin += dt * 1.2;
    }
    capNode.rotation.y = spin;

    const aiming = world.capState === "aiming" && !!world.aim?.valid;
    arrowNode.setEnabled(aiming);
    if (aiming && world.aim) {
      arrowNode.position.set(cp.x, 0.2, cp.z);
      arrowNode.rotation.y = Math.atan2(world.aim.dir.x, world.aim.dir.z);
      const l = 0.7 + 1.5 * world.aim.power;
      arrowShaft.scaling.z = l;
      arrowShaft.position.z = l / 2;
      arrowHead.position.z = l + 0.12;
    }
    for (let i = 0; i < dots.length; i++) {
      const p = world.preview[i];
      const on = aiming && !!p;
      dots[i].setEnabled(on);
      if (on && p) dots[i].position.set(p.x, 0.16, p.z);
    }
  };

  const loop = (): void => {
    const dt = engine.getDeltaTime() / 1000;
    world.update(dt);
    sync(Math.min(dt, 0.25));
    scene.render();
  };

  const onResize = (): void => {
    engine.resize();
    fitCamera();
  };
  window.addEventListener("resize", onResize);
  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(onResize);
    ro.observe(canvas);
  }

  scene.executeWhenReady(() => {
    sync(0);
    opts.onReady?.();
  });
  engine.runRenderLoop(loop);

  const screenToWorld = (clientX: number, clientY: number): Vec2 | null => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const sx = ((clientX - rect.left) / rect.width) * engine.getRenderWidth();
    const sy = ((clientY - rect.top) / rect.height) * engine.getRenderHeight();
    const view = scene.getViewMatrix();
    const proj = scene.getProjectionMatrix();
    const near = Vector3.Unproject(new Vector3(sx, sy, 0), engine.getRenderWidth(), engine.getRenderHeight(), Matrix.Identity(), view, proj);
    const far = Vector3.Unproject(new Vector3(sx, sy, 1), engine.getRenderWidth(), engine.getRenderHeight(), Matrix.Identity(), view, proj);
    const dir = far.subtract(near);
    if (Math.abs(dir.y) < 1e-6) return null;
    const k = (0.2 - near.y) / dir.y; // plano da tampinha (ligeiramente acima do chão)
    if (k < 0) return null;
    return { x: near.x + dir.x * k, z: near.z + dir.z * k };
  };

  const dispose = (): void => {
    window.removeEventListener("resize", onResize);
    ro?.disconnect();
    engine.stopRenderLoop(loop);
    shadow?.dispose();
    scene.dispose();
    engine.dispose();
  };

  return { screenToWorld, dispose };
}
