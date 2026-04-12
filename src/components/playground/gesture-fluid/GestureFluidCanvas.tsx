"use client";

/**
 * GestureFluidCanvas — Canvas 2D Eulerian fluid simulation based on
 * Jos Stam's Stable Fluids algorithm.
 *
 * Architecture (runs each frame):
 * 1. Input Injection — pointer adds velocity + density to nearby grid cells
 * 2. Diffusion — Jacobi iteration spreads velocity/density (viscosity)
 * 3. Advection — semi-Lagrangian method traces quantities through velocity field
 * 4. Pressure Solve + Projection — make velocity divergence-free (mass-conserving)
 *
 * Grid: 256x256 desktop, 128x128 mobile. All data in Float64Array for precision.
 * Rendering: density field mapped to color via ImageData.
 *
 * Idle mode: density decays, ambient currents create faint wisps of color.
 * Active mode: pointer injects bright fluid trails with vivid turbulence.
 *
 * Respects prefers-reduced-motion: reduces ambient animation intensity.
 */

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type RefObject,
} from "react";
import {
  GestureFluidControlPanel,
  type FluidPaletteId,
  type FluidParams,
} from "./GestureFluidControlPanel";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

/** Grid resolution by device capability. */
const GRID_SIZE_DESKTOP = 256;
const GRID_SIZE_MOBILE = 128;

/** Jacobi iteration counts for each solve step. */
const DIFFUSE_ITERATIONS = 20;
const PROJECT_ITERATIONS = 40;

/** Idle timeout — ms without pointer before switching to idle mode. */
const IDLE_TIMEOUT_MS = 3_000;

/** Ambient current injection interval (ms). */
const AMBIENT_INTERVAL_MS = 800;

/** Parameter lerp speed — fraction per frame toward target. */
const PARAM_LERP_SPEED = 0.04;

/* -------------------------------------------------------------------------- */
/*                              Type definitions                              */
/* -------------------------------------------------------------------------- */

/** Color stop for palette gradient sampling. */
interface ColorStop {
  t: number;
  r: number;
  g: number;
  b: number;
}

/** Mutable fluid simulation state — no React state in hot loop. */
interface FluidState {
  /** Grid resolution (square). */
  N: number;
  /** Total grid cells including boundary (N+2)^2. */
  size: number;
  /** Velocity X field. */
  vx: Float64Array;
  /** Velocity Y field. */
  vy: Float64Array;
  /** Previous velocity X (scratch for solver). */
  vx0: Float64Array;
  /** Previous velocity Y (scratch for solver). */
  vy0: Float64Array;
  /** Density field. */
  density: Float64Array;
  /** Previous density (scratch for solver). */
  density0: Float64Array;
  /** Pressure field for projection. */
  pressure: Float64Array;
  /** Divergence field for projection. */
  divergence: Float64Array;
  /** ImageData for rendering to canvas. */
  imageData: ImageData;
  /** Canvas dimensions in CSS pixels. */
  canvasWidth: number;
  canvasHeight: number;
  /** Pointer state for input injection. */
  pointerX: number;
  pointerY: number;
  pointerPrevX: number;
  pointerPrevY: number;
  pointerDown: boolean;
  /** Interaction timing for idle/active transition. */
  lastInteractionTime: number;
  isActive: boolean;
  /** Last time an ambient current was injected. */
  lastAmbientTime: number;
  /** Interpolated parameters for smooth transitions. */
  currentDensityDecay: number;
  currentVelocityDamping: number;
}

/* -------------------------------------------------------------------------- */
/*                            Color palette helpers                           */
/* -------------------------------------------------------------------------- */

/** Palette definitions — density concentration mapped to RGB. */
const PALETTES: Record<FluidPaletteId, ColorStop[]> = {
  ink: [
    { t: 0.0, r: 8, g: 12, b: 21 },
    { t: 0.15, r: 10, g: 25, b: 52 },
    { t: 0.3, r: 15, g: 50, b: 90 },
    { t: 0.5, r: 25, g: 85, b: 140 },
    { t: 0.7, r: 50, g: 130, b: 190 },
    { t: 0.85, r: 100, g: 180, b: 220 },
    { t: 1.0, r: 170, g: 220, b: 245 },
  ],
  fire: [
    { t: 0.0, r: 26, g: 29, b: 35 },
    { t: 0.15, r: 60, g: 15, b: 10 },
    { t: 0.3, r: 140, g: 30, b: 10 },
    { t: 0.5, r: 200, g: 60, b: 15 },
    { t: 0.7, r: 240, g: 120, b: 20 },
    { t: 0.85, r: 255, g: 200, b: 60 },
    { t: 1.0, r: 255, g: 240, b: 180 },
  ],
  neon: [
    { t: 0.0, r: 26, g: 29, b: 35 },
    { t: 0.15, r: 10, g: 40, b: 30 },
    { t: 0.3, r: 20, g: 100, b: 60 },
    { t: 0.5, r: 40, g: 180, b: 100 },
    { t: 0.7, r: 80, g: 230, b: 160 },
    { t: 0.85, r: 150, g: 255, b: 200 },
    { t: 1.0, r: 200, g: 255, b: 240 },
  ],
  mono: [
    { t: 0.0, r: 26, g: 29, b: 35 },
    { t: 0.15, r: 45, g: 48, b: 55 },
    { t: 0.3, r: 80, g: 84, b: 92 },
    { t: 0.5, r: 130, g: 135, b: 145 },
    { t: 0.7, r: 180, g: 185, b: 195 },
    { t: 0.85, r: 215, g: 218, b: 225 },
    { t: 1.0, r: 240, g: 242, b: 245 },
  ],
};

/**
 * Sample a color from a palette gradient at concentration t (0-1).
 * Returns [r, g, b] as integers 0-255.
 */
function samplePalette(
  stops: ColorStop[],
  t: number
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  let lo = stops[0]!;
  let hi = stops[stops.length - 1]!;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (clamped >= a.t && clamped <= b.t) {
      lo = a;
      hi = b;
      break;
    }
  }
  const range = hi.t - lo.t;
  const frac = range > 0 ? (clamped - lo.t) / range : 0;
  return [
    Math.round(lo.r + (hi.r - lo.r) * frac),
    Math.round(lo.g + (hi.g - lo.g) * frac),
    Math.round(lo.b + (hi.b - lo.b) * frac),
  ];
}

/* -------------------------------------------------------------------------- */
/*                          Simulation initialization                        */
/* -------------------------------------------------------------------------- */

/** Detect mobile based on viewport width. */
function isMobileDevice(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

/**
 * Index into the 1D flat array for a 2D grid coordinate.
 * Grid uses (N+2) width to include boundary cells on each side.
 */
function IX(N: number, x: number, y: number): number {
  return x + (N + 2) * y;
}

/**
 * Create the initial fluid simulation state with all arrays zeroed.
 */
function createFluidState(
  canvasWidth: number,
  canvasHeight: number
): FluidState {
  const mobile = isMobileDevice();
  const N = mobile ? GRID_SIZE_MOBILE : GRID_SIZE_DESKTOP;
  const size = (N + 2) * (N + 2);

  return {
    N,
    size,
    vx: new Float64Array(size),
    vy: new Float64Array(size),
    vx0: new Float64Array(size),
    vy0: new Float64Array(size),
    density: new Float64Array(size),
    density0: new Float64Array(size),
    pressure: new Float64Array(size),
    divergence: new Float64Array(size),
    imageData: new ImageData(N, N),
    canvasWidth,
    canvasHeight,
    pointerX: -1,
    pointerY: -1,
    pointerPrevX: -1,
    pointerPrevY: -1,
    pointerDown: false,
    lastInteractionTime: 0,
    isActive: false,
    lastAmbientTime: 0,
    currentDensityDecay: 0.99,
    currentVelocityDamping: 0.998,
  };
}

/* -------------------------------------------------------------------------- */
/*                       Boundary condition enforcement                      */
/* -------------------------------------------------------------------------- */

/**
 * Set boundary conditions on the grid edges.
 * b=0: density-like (copy to boundary), b=1: negate X at left/right,
 * b=2: negate Y at top/bottom. This creates no-slip walls.
 */
function setBoundary(N: number, b: number, x: Float64Array): void {
  const n2 = N + 2;

  for (let i = 1; i <= N; i++) {
    /** Left and right walls. */
    x[IX(N, 0, i)] = b === 1 ? -(x[IX(N, 1, i)] ?? 0) : (x[IX(N, 1, i)] ?? 0);
    x[IX(N, N + 1, i)] = b === 1 ? -(x[IX(N, N, i)] ?? 0) : (x[IX(N, N, i)] ?? 0);

    /** Top and bottom walls. */
    x[IX(N, i, 0)] = b === 2 ? -(x[IX(N, i, 1)] ?? 0) : (x[IX(N, i, 1)] ?? 0);
    x[IX(N, i, N + 1)] = b === 2 ? -(x[IX(N, i, N)] ?? 0) : (x[IX(N, i, N)] ?? 0);
  }

  /** Corner cells — average of two adjacent boundary cells. */
  x[0] = 0.5 * ((x[IX(N, 1, 0)] ?? 0) + (x[IX(N, 0, 1)] ?? 0));
  x[IX(N, 0, N + 1)] = 0.5 * ((x[IX(N, 1, N + 1)] ?? 0) + (x[IX(N, 0, N)] ?? 0));
  x[IX(N, N + 1, 0)] = 0.5 * ((x[IX(N, N, 0)] ?? 0) + (x[IX(N, N + 1, 1)] ?? 0));
  x[IX(N, N + 1, N + 1)] = 0.5 * (
    (x[IX(N, N, N + 1)] ?? 0) + (x[IX(N, N + 1, N)] ?? 0)
  );

  void n2;
}

/* -------------------------------------------------------------------------- */
/*                          Fluid solver steps                               */
/* -------------------------------------------------------------------------- */

/**
 * Diffusion step via Jacobi iteration.
 * Spreads quantity x into neighbors based on diffusion rate.
 * x0 holds the source values, x is updated in-place.
 */
function diffuse(
  N: number,
  b: number,
  x: Float64Array,
  x0: Float64Array,
  diff: number,
  dt: number
): void {
  const a = dt * diff * N * N;
  const invDenom = 1 / (1 + 4 * a);

  for (let iter = 0; iter < DIFFUSE_ITERATIONS; iter++) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = IX(N, i, j);
        x[idx] =
          ((x0[idx] ?? 0) +
            a *
              ((x[IX(N, i - 1, j)] ?? 0) +
                (x[IX(N, i + 1, j)] ?? 0) +
                (x[IX(N, i, j - 1)] ?? 0) +
                (x[IX(N, i, j + 1)] ?? 0))) *
          invDenom;
      }
    }
    setBoundary(N, b, x);
  }
}

/**
 * Advection step via semi-Lagrangian method.
 * For each cell, trace backward along velocity to find the source,
 * then bilinear interpolate from the source grid d0.
 */
function advect(
  N: number,
  b: number,
  d: Float64Array,
  d0: Float64Array,
  vx: Float64Array,
  vy: Float64Array,
  dt: number
): void {
  const dt0 = dt * N;

  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      const idx = IX(N, i, j);

      /** Trace back through velocity field. */
      let x = i - dt0 * (vx[idx] ?? 0);
      let y = j - dt0 * (vy[idx] ?? 0);

      /** Clamp to grid boundaries. */
      if (x < 0.5) x = 0.5;
      if (x > N + 0.5) x = N + 0.5;
      if (y < 0.5) y = 0.5;
      if (y > N + 0.5) y = N + 0.5;

      /** Bilinear interpolation indices. */
      const i0 = Math.floor(x);
      const i1 = i0 + 1;
      const j0 = Math.floor(y);
      const j1 = j0 + 1;

      /** Interpolation weights. */
      const s1 = x - i0;
      const s0 = 1 - s1;
      const t1 = y - j0;
      const t0 = 1 - t1;

      /** Bilinear sample from source grid. */
      d[idx] =
        s0 * (t0 * (d0[IX(N, i0, j0)] ?? 0) + t1 * (d0[IX(N, i0, j1)] ?? 0)) +
        s1 * (t0 * (d0[IX(N, i1, j0)] ?? 0) + t1 * (d0[IX(N, i1, j1)] ?? 0));
    }
  }
  setBoundary(N, b, d);
}

/**
 * Projection step — makes velocity field divergence-free (mass-conserving).
 * 1. Compute divergence of velocity field.
 * 2. Solve pressure Poisson equation via Jacobi iteration.
 * 3. Subtract pressure gradient from velocity.
 */
function project(
  N: number,
  vx: Float64Array,
  vy: Float64Array,
  pressure: Float64Array,
  divergence: Float64Array
): void {
  const h = 1.0 / N;

  /** Step 1: Compute divergence. */
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      const idx = IX(N, i, j);
      divergence[idx] =
        -0.5 *
        h *
        ((vx[IX(N, i + 1, j)] ?? 0) -
          (vx[IX(N, i - 1, j)] ?? 0) +
          (vy[IX(N, i, j + 1)] ?? 0) -
          (vy[IX(N, i, j - 1)] ?? 0));
      pressure[idx] = 0;
    }
  }
  setBoundary(N, 0, divergence);
  setBoundary(N, 0, pressure);

  /** Step 2: Solve pressure via Jacobi iteration. */
  for (let iter = 0; iter < PROJECT_ITERATIONS; iter++) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = IX(N, i, j);
        pressure[idx] =
          ((divergence[idx] ?? 0) +
            (pressure[IX(N, i - 1, j)] ?? 0) +
            (pressure[IX(N, i + 1, j)] ?? 0) +
            (pressure[IX(N, i, j - 1)] ?? 0) +
            (pressure[IX(N, i, j + 1)] ?? 0)) /
          4;
      }
    }
    setBoundary(N, 0, pressure);
  }

  /** Step 3: Subtract pressure gradient from velocity. */
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      const idx = IX(N, i, j);
      vx[idx] =
        (vx[idx] ?? 0) -
        0.5 * N * ((pressure[IX(N, i + 1, j)] ?? 0) - (pressure[IX(N, i - 1, j)] ?? 0));
      vy[idx] =
        (vy[idx] ?? 0) -
        0.5 * N * ((pressure[IX(N, i, j + 1)] ?? 0) - (pressure[IX(N, i, j - 1)] ?? 0));
    }
  }
  setBoundary(N, 1, vx);
  setBoundary(N, 2, vy);
}

/* -------------------------------------------------------------------------- */
/*                       Full timestep: velocity + density                   */
/* -------------------------------------------------------------------------- */

/**
 * Step the velocity field: diffuse, project, advect, project.
 * The double projection (before and after advection) is from Stam's
 * original algorithm and ensures divergence-free velocity at both stages.
 */
function velocityStep(
  state: FluidState,
  visc: number,
  dt: number
): void {
  const { N, vx, vy, vx0, vy0, pressure, divergence } = state;

  /** Diffuse velocity. */
  diffuse(N, 1, vx0, vx, visc, dt);
  diffuse(N, 2, vy0, vy, visc, dt);

  /** Project to make diffused velocity divergence-free. */
  project(N, vx0, vy0, pressure, divergence);

  /** Advect velocity through the divergence-free field. */
  advect(N, 1, vx, vx0, vx0, vy0, dt);
  advect(N, 2, vy, vy0, vx0, vy0, dt);

  /** Final projection after advection. */
  project(N, vx, vy, pressure, divergence);
}

/**
 * Step the density field: diffuse, then advect through the velocity field.
 */
function densityStep(
  state: FluidState,
  diff: number,
  dt: number
): void {
  const { N, density, density0, vx, vy } = state;

  /** Diffuse density (viscous spreading). */
  diffuse(N, 0, density0, density, diff, dt);

  /** Advect density through velocity field. */
  advect(N, 0, density, density0, vx, vy, dt);
}

/* -------------------------------------------------------------------------- */
/*                          Input injection                                  */
/* -------------------------------------------------------------------------- */

/**
 * Inject velocity and density from pointer movement into the fluid grid.
 * Uses a radial smoothstep falloff centered on the pointer position.
 */
function injectFromPointer(
  state: FluidState,
  densityAmount: number,
  velocityScale: number
): void {
  const { N, vx, vy, density, pointerX, pointerY, pointerPrevX, pointerPrevY } = state;

  /** Convert canvas coordinates to grid coordinates (1..N range). */
  const gx = (pointerX / state.canvasWidth) * N + 1;
  const gy = (pointerY / state.canvasHeight) * N + 1;

  /** Pointer velocity in grid space. */
  const dvx = ((pointerX - pointerPrevX) / state.canvasWidth) * N;
  const dvy = ((pointerY - pointerPrevY) / state.canvasHeight) * N;

  /** Skip injection if pointer hasn't moved or is off-canvas. */
  if (pointerX < 0 || pointerY < 0) return;
  if (Math.abs(dvx) < 0.001 && Math.abs(dvy) < 0.001) return;

  /** Injection radius in grid cells. */
  const radius = Math.max(3, N * 0.04);
  const radiusSq = radius * radius;

  /** Iterate over cells within the bounding box of the injection radius. */
  const iMin = Math.max(1, Math.floor(gx - radius));
  const iMax = Math.min(N, Math.ceil(gx + radius));
  const jMin = Math.max(1, Math.floor(gy - radius));
  const jMax = Math.min(N, Math.ceil(gy + radius));

  for (let j = jMin; j <= jMax; j++) {
    for (let i = iMin; i <= iMax; i++) {
      const dx = i - gx;
      const dy = j - gy;
      const distSq = dx * dx + dy * dy;

      if (distSq > radiusSq) continue;

      /** Smoothstep falloff: 1 at center, 0 at edge. */
      const dist = Math.sqrt(distSq);
      const t = dist / radius;
      const falloff = 1 - t * t * (3 - 2 * t);

      const idx = IX(N, i, j);
      vx[idx] = (vx[idx] ?? 0) + dvx * velocityScale * falloff;
      vy[idx] = (vy[idx] ?? 0) + dvy * velocityScale * falloff;
      density[idx] = (density[idx] ?? 0) + densityAmount * falloff * 0.1;
    }
  }
}

/**
 * Inject subtle ambient currents during idle mode to keep the fluid
 * visually alive with faint drifting wisps.
 */
function injectAmbientCurrents(state: FluidState, reducedMotion: boolean): void {
  const { N, vx, vy, density } = state;
  const now = performance.now();

  if (now - state.lastAmbientTime < AMBIENT_INTERVAL_MS) return;
  state.lastAmbientTime = now;

  /** Inject 2-4 small ambient forces at random positions. */
  const count = reducedMotion ? 1 : 2 + Math.floor(Math.random() * 3);
  const strength = reducedMotion ? 0.1 : 0.3;
  const densityStr = reducedMotion ? 1 : 3;

  for (let n = 0; n < count; n++) {
    const cx = 1 + Math.floor(Math.random() * N);
    const cy = 1 + Math.floor(Math.random() * N);
    const angle = Math.random() * Math.PI * 2;
    const vel = strength * (0.5 + Math.random() * 0.5);
    const avx = Math.cos(angle) * vel;
    const avy = Math.sin(angle) * vel;

    /** Small radius ambient injection. */
    const r = Math.max(2, N * 0.02);
    const rSq = r * r;
    const iMin = Math.max(1, Math.floor(cx - r));
    const iMax = Math.min(N, Math.ceil(cx + r));
    const jMin = Math.max(1, Math.floor(cy - r));
    const jMax = Math.min(N, Math.ceil(cy + r));

    for (let j = jMin; j <= jMax; j++) {
      for (let i = iMin; i <= iMax; i++) {
        const dx = i - cx;
        const dy = j - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq > rSq) continue;

        const dist = Math.sqrt(distSq);
        const t = dist / r;
        const falloff = 1 - t * t * (3 - 2 * t);
        const idx = IX(N, i, j);

        vx[idx] = (vx[idx] ?? 0) + avx * falloff;
        vy[idx] = (vy[idx] ?? 0) + avy * falloff;
        density[idx] = (density[idx] ?? 0) + densityStr * falloff * 0.05;
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                          Rendering                                        */
/* -------------------------------------------------------------------------- */

/**
 * Render the density field to canvas via ImageData.
 * Maps density values through the selected color palette.
 */
function render(
  ctx: CanvasRenderingContext2D,
  state: FluidState,
  paletteStops: ColorStop[]
): void {
  const { N, density, imageData, canvasWidth, canvasHeight } = state;
  const data = imageData.data;

  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      /** Map interior grid cells (offset by 1 for boundary) to image pixels. */
      const d = density[IX(N, i + 1, j + 1)] ?? 0;

      /** Clamp density to 0-1 for palette sampling. */
      const clamped = Math.min(1, Math.max(0, d));
      const [r, g, b] = samplePalette(paletteStops, clamped);

      const pi = (j * N + i) * 4;
      data[pi] = r;
      data[pi + 1] = g;
      data[pi + 2] = b;
      data[pi + 3] = 255;
    }
  }

  /** Write ImageData at grid resolution, then scale up to canvas size. */
  ctx.putImageData(imageData, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(ctx.canvas, 0, 0, N, N, 0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/*                      Decay and damping helpers                            */
/* -------------------------------------------------------------------------- */

/**
 * Apply global density decay and velocity damping.
 * Idle mode decays faster for the fading-out effect; active mode
 * preserves density longer for vivid trails.
 */
function applyDecay(state: FluidState): void {
  const { size, density, vx, vy, currentDensityDecay, currentVelocityDamping } = state;

  for (let i = 0; i < size; i++) {
    density[i] = (density[i] ?? 0) * currentDensityDecay;
    vx[i] = (vx[i] ?? 0) * currentVelocityDamping;
    vy[i] = (vy[i] ?? 0) * currentVelocityDamping;
  }
}

/**
 * Interpolate decay/damping parameters toward idle or active targets
 * based on interaction state.
 */
function lerpDecayParams(state: FluidState): void {
  const now = performance.now();
  const timeSinceInteraction = now - state.lastInteractionTime;
  const shouldBeActive = timeSinceInteraction < IDLE_TIMEOUT_MS;

  state.isActive = shouldBeActive;

  /** Active: density persists longer, less velocity damping.
   *  Idle: density fades quickly, velocity damps strongly. */
  const targetDecay = shouldBeActive ? 0.998 : 0.985;
  const targetDamping = shouldBeActive ? 0.999 : 0.995;

  state.currentDensityDecay +=
    (targetDecay - state.currentDensityDecay) * PARAM_LERP_SPEED;
  state.currentVelocityDamping +=
    (targetDamping - state.currentVelocityDamping) * PARAM_LERP_SPEED;
}

/* -------------------------------------------------------------------------- */
/*                             Main component                                 */
/* -------------------------------------------------------------------------- */

export function GestureFluidCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<FluidState | null>(null);
  const animationFrameRef = useRef<number>(0);

  /** Control panel state. */
  const [params, setParams] = useState<FluidParams>({
    viscosity: 0.0005,
    diffusion: 0.0002,
    densityInjection: 200,
    velocityScale: 5,
    palette: "ink",
  });
  const [fps, setFps] = useState(0);
  const [gridSizeDisplay, setGridSizeDisplay] = useState(0);
  const [isActiveDisplay, setIsActiveDisplay] = useState(false);

  /** Ref to current params for the animation loop (avoids stale closures). */
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  /** FPS tracking. */
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(0);

  /** Detect prefers-reduced-motion. */
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mql.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  /** Mark interaction for idle/active transition. */
  const markInteraction = useCallback(() => {
    const fluid = fluidRef.current;
    if (fluid) {
      fluid.lastInteractionTime = performance.now();
    }
  }, []);

  /** Handle pointer movement over canvas — track position for injection. */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      markInteraction();
      const fluid = fluidRef.current;
      const canvas = canvasRef.current;
      if (!fluid || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * fluid.canvasWidth;
      const y = ((e.clientY - rect.top) / rect.height) * fluid.canvasHeight;

      fluid.pointerPrevX = fluid.pointerX;
      fluid.pointerPrevY = fluid.pointerY;
      fluid.pointerX = x;
      fluid.pointerY = y;
    },
    [markInteraction]
  );

  /** Handle pointer entering the canvas. */
  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      markInteraction();
      const fluid = fluidRef.current;
      const canvas = canvasRef.current;
      if (!fluid || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * fluid.canvasWidth;
      const y = ((e.clientY - rect.top) / rect.height) * fluid.canvasHeight;

      /** Set both current and previous to the same point to avoid
       *  a velocity spike from the off-screen initial position. */
      fluid.pointerX = x;
      fluid.pointerY = y;
      fluid.pointerPrevX = x;
      fluid.pointerPrevY = y;
      fluid.pointerDown = true;
    },
    [markInteraction]
  );

  /** Handle pointer leaving the canvas. */
  const handlePointerLeave = useCallback(() => {
    const fluid = fluidRef.current;
    if (fluid) {
      fluid.pointerDown = false;
      fluid.pointerX = -1;
      fluid.pointerY = -1;
    }
  }, []);

  /** Handle touch events for mobile — convert first touch to pointer coords. */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      markInteraction();
      const fluid = fluidRef.current;
      const canvas = canvasRef.current;
      const touch = e.touches[0];
      if (!fluid || !canvas || !touch) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * fluid.canvasWidth;
      const y = ((touch.clientY - rect.top) / rect.height) * fluid.canvasHeight;

      fluid.pointerPrevX = fluid.pointerX;
      fluid.pointerPrevY = fluid.pointerY;
      fluid.pointerX = x;
      fluid.pointerY = y;
    },
    [markInteraction]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      markInteraction();
      const fluid = fluidRef.current;
      const canvas = canvasRef.current;
      const touch = e.touches[0];
      if (!fluid || !canvas || !touch) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * fluid.canvasWidth;
      const y = ((touch.clientY - rect.top) / rect.height) * fluid.canvasHeight;

      fluid.pointerX = x;
      fluid.pointerY = y;
      fluid.pointerPrevX = x;
      fluid.pointerPrevY = y;
      fluid.pointerDown = true;
    },
    [markInteraction]
  );

  const handleTouchEnd = useCallback(() => {
    const fluid = fluidRef.current;
    if (fluid) {
      fluid.pointerDown = false;
      fluid.pointerX = -1;
      fluid.pointerY = -1;
    }
  }, []);

  /** Main animation loop — stored in a ref to avoid temporal dead zone. */
  const animateRef = useRef<() => void>(() => {});

  /** Update the animation callback ref. Wrapped in useEffect to satisfy
   *  the react-hooks/refs rule (no ref writes during render). */
  useEffect(() => {
    animateRef.current = () => {
      const fluid = fluidRef.current;
      const canvas = canvasRef.current;
      if (!fluid || !canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const currentParams = paramsRef.current;
      const reducedMotion = reducedMotionRef.current;

      /** Fixed timestep for simulation stability. */
      const dt = 0.1;

      /** Lerp decay parameters for idle/active transition. */
      lerpDecayParams(fluid);

      /** Inject fluid from pointer if it's on the canvas. */
      if (fluid.pointerDown && fluid.pointerX >= 0) {
        injectFromPointer(
          fluid,
          currentParams.densityInjection,
          currentParams.velocityScale
        );
      }

      /** Inject ambient currents during idle mode. */
      if (!fluid.isActive) {
        injectAmbientCurrents(fluid, reducedMotion);
      }

      /** Run the fluid simulation steps. */
      velocityStep(fluid, currentParams.viscosity, dt);
      densityStep(fluid, currentParams.diffusion, dt);

      /** Apply global decay and damping. */
      applyDecay(fluid);

      /** Render density field to canvas. */
      const paletteStops = PALETTES[currentParams.palette];
      render(ctx, fluid, paletteStops);

      /** FPS counter — update once per second. */
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        setIsActiveDisplay(fluid.isActive);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(() => animateRef.current());
    };
  });

  /** Initialize simulation on mount. */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    /** Set canvas resolution to match container. */
    canvas.width = width;
    canvas.height = height;

    const fluid = createFluidState(width, height);
    fluidRef.current = fluid;
    setGridSizeDisplay(fluid.N);

    lastFpsTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(() => animateRef.current());

    /** Handle container resize. */
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: w, height: h } = entry.contentRect;
      if (w > 0 && h > 0) {
        canvas.width = w;
        canvas.height = h;
        fluid.canvasWidth = w;
        fluid.canvasHeight = h;
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameRef.current);
      fluidRef.current = null;
    };
  }, []);

  /** Handle control panel parameter changes. */
  const handleParamChange = useCallback(
    (key: keyof FluidParams, value: number | string) => {
      markInteraction();
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    [markInteraction]
  );

  /** Clear the simulation — zero all fields. */
  const handleClear = useCallback(() => {
    markInteraction();
    const fluid = fluidRef.current;
    if (!fluid) return;

    fluid.vx.fill(0);
    fluid.vy.fill(0);
    fluid.vx0.fill(0);
    fluid.vy0.fill(0);
    fluid.density.fill(0);
    fluid.density0.fill(0);
    fluid.pressure.fill(0);
    fluid.divergence.fill(0);
  }, [markInteraction]);

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      style={{
        width: "100%",
        height: "clamp(300px, 70vh, 800px)",
        position: "relative",
        background: "var(--exp-canvas-bg)",
        overflow: "hidden",
      }}
      role="img"
      aria-label="Gesture Fluid Wall — interactive Eulerian fluid simulation. Move your pointer over the canvas to inject fluid and create flowing ink-like trails."
    >
      <canvas
        ref={canvasRef as RefObject<HTMLCanvasElement>}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          touchAction: "none",
        }}
        aria-hidden="true"
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      <GestureFluidControlPanel
        params={params}
        onParamChange={handleParamChange}
        onClear={handleClear}
        gridSize={gridSizeDisplay}
        fps={fps}
        isActive={isActiveDisplay}
      />
    </div>
  );
}
