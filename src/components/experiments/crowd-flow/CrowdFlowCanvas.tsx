"use client";

/**
 * CrowdFlowCanvas — Canvas 2D crowd simulation with Boids flocking,
 * trail density mapping, and Gray-Scott reaction-diffusion.
 *
 * Architecture (4 systems per frame):
 * 1. Boids Agent Simulation (CPU) — grid-based spatial hash for O(n*k) neighbor search
 * 2. Trail System — agents stamp density, grid decays + diffuses each frame
 * 3. Reaction-Diffusion (Gray-Scott) — trail density seeds chemical B, RD pattern is the visualization
 * 4. Rendering (Canvas 2D) — ImageData for RD grid, dots for agents
 *
 * Idle mode: gentle wandering, trails fade fast, RD dormant, dark ambient.
 * Active mode: dynamic flocking, trails persist, RD blooms with organic coral patterns.
 * Transition: parameters lerp over ~2s on interaction start, ramp back after ~5s idle.
 *
 * Respects prefers-reduced-motion: reduces agent speed and disables RD blooming.
 */

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type RefObject,
} from "react";
import { CrowdFlowControlPanel } from "./CrowdFlowControlPanel";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

/** Agent counts by device capability. */
const AGENT_COUNT_DESKTOP = 5_000;
const AGENT_COUNT_MOBILE = 2_000;

/** Grid resolution for trail and RD systems. */
const GRID_SIZE_DESKTOP = 512;
const GRID_SIZE_MOBILE = 256;

/** RD steps per frame by device. */
const RD_STEPS_DESKTOP = 4;
const RD_STEPS_MOBILE = 2;

/** Spatial hash cell size in world units. */
const HASH_CELL_SIZE = 20;

/** Obstacle radius in world units. */
const OBSTACLE_RADIUS = 30;

/** Max obstacles allowed. */
const MAX_OBSTACLES = 20;

/** Interaction timeout before returning to idle (ms). */
const IDLE_TIMEOUT_MS = 5_000;

/** Parameter lerp speed — fraction per frame toward target. */
const PARAM_LERP_SPEED = 0.03;

/* -------------------------------------------------------------------------- */
/*                              Type definitions                              */
/* -------------------------------------------------------------------------- */

/** Color palette mapping — each maps chemical B concentration to RGB. */
type PaletteId = "coral" | "ocean" | "acid" | "mono";

/** An obstacle placed by the user on the canvas. */
interface Obstacle {
  x: number;
  y: number;
  radius: number;
}

/** All simulation parameters that can be controlled via the panel. */
interface SimParams {
  agentCount: number;
  agentSpeed: number;
  rdFeedRate: number;
  rdKillRate: number;
  trailPersistence: number;
  showAgents: boolean;
  palette: PaletteId;
}

/** Runtime simulation state — mutable for performance (no React state in hot loop). */
interface SimState {
  /** Canvas dimensions in CSS pixels. */
  width: number;
  height: number;
  /** Grid resolution (square). */
  gridSize: number;
  /** RD steps per frame. */
  rdSteps: number;
  /** Agent position X array. */
  posX: Float32Array;
  /** Agent position Y array. */
  posY: Float32Array;
  /** Agent velocity X array. */
  velX: Float32Array;
  /** Agent velocity Y array. */
  velY: Float32Array;
  /** Trail density grid (single channel, 0-1). */
  trailGrid: Float32Array;
  /** Trail grid scratch buffer for diffusion. */
  trailGridB: Float32Array;
  /** RD chemical A grid. */
  rdA: Float32Array;
  /** RD chemical B grid. */
  rdB: Float32Array;
  /** RD scratch A for ping-pong. */
  rdA2: Float32Array;
  /** RD scratch B for ping-pong. */
  rdB2: Float32Array;
  /** ImageData for rendering RD grid to canvas. */
  imageData: ImageData;
  /** Spatial hash: cell start indices. */
  cellStart: Int32Array;
  /** Spatial hash: cell counts. */
  cellCount: Int32Array;
  /** Agent-to-cell mapping (sorted order). */
  agentOrder: Int32Array;
  /** Hash grid dimensions. */
  hashCols: number;
  hashRows: number;
  /** User-placed obstacles. */
  obstacles: Obstacle[];
  /** Active agent count (may differ from array length if user adjusts). */
  activeAgentCount: number;
  /** Current interpolated parameters (lerp toward target). */
  currentParams: {
    agentSpeed: number;
    rdFeedRate: number;
    rdKillRate: number;
    trailPersistence: number;
    trailDecayIdle: number;
    rdFeedIdle: number;
  };
  /** Interaction state for idle/active transition. */
  lastInteractionTime: number;
  isActive: boolean;
  /** Animation frame elapsed time tracking. */
  lastFrameTime: number;
}

/* -------------------------------------------------------------------------- */
/*                            Color palette helpers                           */
/* -------------------------------------------------------------------------- */

/** Color stop: concentration threshold and RGB values. */
interface ColorStop {
  t: number;
  r: number;
  g: number;
  b: number;
}

/** Palette definitions — each is a gradient from low to high chemical B concentration. */
const PALETTES: Record<PaletteId, ColorStop[]> = {
  coral: [
    { t: 0.0, r: 26, g: 29, b: 35 },
    { t: 0.2, r: 80, g: 30, b: 20 },
    { t: 0.4, r: 180, g: 60, b: 20 },
    { t: 0.6, r: 230, g: 120, b: 40 },
    { t: 0.8, r: 255, g: 200, b: 80 },
    { t: 1.0, r: 255, g: 240, b: 200 },
  ],
  ocean: [
    { t: 0.0, r: 26, g: 29, b: 35 },
    { t: 0.2, r: 10, g: 30, b: 80 },
    { t: 0.4, r: 20, g: 80, b: 160 },
    { t: 0.6, r: 40, g: 160, b: 200 },
    { t: 0.8, r: 100, g: 220, b: 240 },
    { t: 1.0, r: 200, g: 245, b: 255 },
  ],
  acid: [
    { t: 0.0, r: 26, g: 29, b: 35 },
    { t: 0.2, r: 10, g: 50, b: 10 },
    { t: 0.4, r: 40, g: 120, b: 20 },
    { t: 0.6, r: 100, g: 200, b: 0 },
    { t: 0.8, r: 180, g: 240, b: 40 },
    { t: 1.0, r: 220, g: 255, b: 150 },
  ],
  mono: [
    { t: 0.0, r: 26, g: 29, b: 35 },
    { t: 0.2, r: 50, g: 52, b: 58 },
    { t: 0.4, r: 100, g: 104, b: 112 },
    { t: 0.6, r: 160, g: 165, b: 175 },
    { t: 0.8, r: 210, g: 215, b: 220 },
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
  /** Find the two stops bracketing t. */
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
 * Create the initial simulation state with allocated typed arrays.
 * Agents start in random positions with small random velocities.
 */
function createSimState(
  width: number,
  height: number,
  params: SimParams
): SimState {
  const mobile = isMobileDevice();
  const gridSize = mobile ? GRID_SIZE_MOBILE : GRID_SIZE_DESKTOP;
  const rdSteps = mobile ? RD_STEPS_MOBILE : RD_STEPS_DESKTOP;
  const maxAgents = mobile ? AGENT_COUNT_MOBILE : AGENT_COUNT_DESKTOP;
  const agentCount = Math.min(params.agentCount, maxAgents);

  /** Allocate agent arrays at max capacity so slider changes don't reallocate. */
  const posX = new Float32Array(maxAgents);
  const posY = new Float32Array(maxAgents);
  const velX = new Float32Array(maxAgents);
  const velY = new Float32Array(maxAgents);

  /** Initialize agents at random positions with small random velocities. */
  for (let i = 0; i < maxAgents; i++) {
    posX[i] = Math.random() * width;
    posY[i] = Math.random() * height;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.5;
    velX[i] = Math.cos(angle) * speed;
    velY[i] = Math.sin(angle) * speed;
  }

  /** Allocate grids. */
  const gridLen = gridSize * gridSize;
  const trailGrid = new Float32Array(gridLen);
  const trailGridB = new Float32Array(gridLen);
  const rdA = new Float32Array(gridLen);
  const rdB = new Float32Array(gridLen);
  const rdA2 = new Float32Array(gridLen);
  const rdB2 = new Float32Array(gridLen);

  /** Initialize RD: chemical A starts at 1.0 everywhere, B at 0.0. */
  rdA.fill(1.0);
  rdA2.fill(1.0);

  /** Spatial hash dimensions. */
  const hashCols = Math.ceil(width / HASH_CELL_SIZE);
  const hashRows = Math.ceil(height / HASH_CELL_SIZE);
  const totalCells = hashCols * hashRows;
  const cellStart = new Int32Array(totalCells);
  const cellCount = new Int32Array(totalCells);
  const agentOrder = new Int32Array(maxAgents);

  /** ImageData for rendering. */
  const imageData = new ImageData(gridSize, gridSize);

  return {
    width,
    height,
    gridSize,
    rdSteps,
    posX,
    posY,
    velX,
    velY,
    trailGrid,
    trailGridB,
    rdA,
    rdB,
    rdA2,
    rdB2,
    imageData,
    cellStart,
    cellCount,
    agentOrder,
    hashCols,
    hashRows,
    obstacles: [],
    activeAgentCount: agentCount,
    currentParams: {
      agentSpeed: 0.3,
      rdFeedRate: 0.01,
      rdKillRate: 0.062,
      trailPersistence: 0.92,
      trailDecayIdle: 0.92,
      rdFeedIdle: 0.01,
    },
    lastInteractionTime: 0,
    isActive: false,
    lastFrameTime: performance.now(),
  };
}

/* -------------------------------------------------------------------------- */
/*                     Spatial hash for Boids neighbor search                 */
/* -------------------------------------------------------------------------- */

/**
 * Build the spatial hash from current agent positions.
 * Counting sort: count agents per cell, compute prefix sums, then place agents.
 */
function buildSpatialHash(state: SimState): void {
  const {
    posX,
    posY,
    activeAgentCount,
    hashCols,
    hashRows,
    cellStart,
    cellCount,
    agentOrder,
  } = state;
  const totalCells = hashCols * hashRows;

  /** Reset cell counts. */
  cellCount.fill(0);

  /** Count agents per cell. */
  for (let i = 0; i < activeAgentCount; i++) {
    const cx = Math.min(
      Math.max(0, Math.floor((posX[i] ?? 0) / HASH_CELL_SIZE)),
      hashCols - 1
    );
    const cy = Math.min(
      Math.max(0, Math.floor((posY[i] ?? 0) / HASH_CELL_SIZE)),
      hashRows - 1
    );
    const cellIdx = cy * hashCols + cx;
    cellCount[cellIdx] = (cellCount[cellIdx] ?? 0) + 1;
  }

  /** Prefix sum to get cell start indices. */
  cellStart[0] = 0;
  for (let i = 1; i < totalCells; i++) {
    cellStart[i] = (cellStart[i - 1] ?? 0) + (cellCount[i - 1] ?? 0);
  }

  /** Create a working copy of cellStart for placement. */
  const cellOffset = new Int32Array(totalCells);
  cellOffset.set(cellStart);

  /** Place agents into sorted order. */
  for (let i = 0; i < activeAgentCount; i++) {
    const cx = Math.min(
      Math.max(0, Math.floor((posX[i] ?? 0) / HASH_CELL_SIZE)),
      hashCols - 1
    );
    const cy = Math.min(
      Math.max(0, Math.floor((posY[i] ?? 0) / HASH_CELL_SIZE)),
      hashRows - 1
    );
    const cellIdx = cy * hashCols + cx;
    const slot = cellOffset[cellIdx] ?? 0;
    agentOrder[slot] = i;
    cellOffset[cellIdx] = slot + 1;
  }
}

/* -------------------------------------------------------------------------- */
/*                          Boids agent simulation                           */
/* -------------------------------------------------------------------------- */

/** Boids perception radius for neighbor detection. */
const BOIDS_RADIUS = 25;
const BOIDS_RADIUS_SQ = BOIDS_RADIUS * BOIDS_RADIUS;

/** Boids force weights. */
const SEPARATION_WEIGHT = 1.8;
const ALIGNMENT_WEIGHT = 1.0;
const COHESION_WEIGHT = 1.0;

/** Max agent speed clamp. */
const MAX_SPEED = 3.0;

/**
 * Update all agent velocities and positions using Boids rules
 * with spatial hash neighbor lookup.
 */
function updateBoids(state: SimState, speed: number): void {
  const {
    posX,
    posY,
    velX,
    velY,
    activeAgentCount,
    hashCols,
    hashRows,
    cellStart,
    cellCount,
    agentOrder,
    obstacles,
    width,
    height,
  } = state;

  /** How many hash cells the perception radius spans. */
  const cellSpan = Math.ceil(BOIDS_RADIUS / HASH_CELL_SIZE);

  for (let i = 0; i < activeAgentCount; i++) {
    const px = posX[i] ?? 0;
    const py = posY[i] ?? 0;
    const myCX = Math.min(
      Math.max(0, Math.floor(px / HASH_CELL_SIZE)),
      hashCols - 1
    );
    const myCY = Math.min(
      Math.max(0, Math.floor(py / HASH_CELL_SIZE)),
      hashRows - 1
    );

    /** Accumulators for Boids forces. */
    let sepX = 0,
      sepY = 0;
    let alignX = 0,
      alignY = 0;
    let cohX = 0,
      cohY = 0;
    let neighborCount = 0;

    /** Iterate over neighboring cells. */
    for (let dy = -cellSpan; dy <= cellSpan; dy++) {
      const ny = myCY + dy;
      if (ny < 0 || ny >= hashRows) continue;
      for (let dx = -cellSpan; dx <= cellSpan; dx++) {
        const nx = myCX + dx;
        if (nx < 0 || nx >= hashCols) continue;
        const cellIdx = ny * hashCols + nx;
        const start = cellStart[cellIdx] ?? 0;
        const count = cellCount[cellIdx] ?? 0;

        for (let s = start; s < start + count; s++) {
          const j = agentOrder[s] ?? 0;
          if (j === i) continue;
          const jx = posX[j] ?? 0;
          const jy = posY[j] ?? 0;
          const diffX = px - jx;
          const diffY = py - jy;
          const distSq = diffX * diffX + diffY * diffY;
          if (distSq > BOIDS_RADIUS_SQ || distSq < 0.001) continue;

          const dist = Math.sqrt(distSq);
          /** Separation: push away, weighted by inverse distance. */
          sepX += diffX / dist;
          sepY += diffY / dist;
          /** Alignment: accumulate neighbor velocities. */
          alignX += velX[j] ?? 0;
          alignY += velY[j] ?? 0;
          /** Cohesion: accumulate neighbor positions. */
          cohX += jx;
          cohY += jy;
          neighborCount++;
        }
      }
    }

    let fx = 0,
      fy = 0;

    if (neighborCount > 0) {
      /** Separation force. */
      fx += (sepX / neighborCount) * SEPARATION_WEIGHT;
      fy += (sepY / neighborCount) * SEPARATION_WEIGHT;

      /** Alignment force — steer toward average heading. */
      alignX /= neighborCount;
      alignY /= neighborCount;
      fx += (alignX - (velX[i] ?? 0)) * ALIGNMENT_WEIGHT;
      fy += (alignY - (velY[i] ?? 0)) * ALIGNMENT_WEIGHT;

      /** Cohesion force — steer toward center of mass. */
      cohX /= neighborCount;
      cohY /= neighborCount;
      fx += (cohX - px) * COHESION_WEIGHT * 0.01;
      fy += (cohY - py) * COHESION_WEIGHT * 0.01;
    }

    /** Obstacle avoidance — push agents away from user-placed obstacles. */
    for (let o = 0; o < obstacles.length; o++) {
      const obs = obstacles[o]!;
      const odx = px - obs.x;
      const ody = py - obs.y;
      const odist = Math.sqrt(odx * odx + ody * ody);
      const avoidRadius = obs.radius + 20;
      if (odist < avoidRadius && odist > 0.01) {
        const pushStrength = (avoidRadius - odist) / avoidRadius;
        fx += (odx / odist) * pushStrength * 4;
        fy += (ody / odist) * pushStrength * 4;
      }
    }

    /** Apply forces to velocity. */
    let nvx = (velX[i] ?? 0) + fx * 0.1;
    let nvy = (velY[i] ?? 0) + fy * 0.1;

    /** Speed scaling. */
    const currentSpeed = Math.sqrt(nvx * nvx + nvy * nvy);
    const targetSpeed = Math.min(currentSpeed, MAX_SPEED) * speed;
    if (currentSpeed > 0.001) {
      nvx = (nvx / currentSpeed) * targetSpeed;
      nvy = (nvy / currentSpeed) * targetSpeed;
    }

    velX[i] = nvx;
    velY[i] = nvy;

    /** Update position. */
    let newX = px + nvx;
    let newY = py + nvy;

    /** Toroidal wrapping. */
    if (newX < 0) newX += width;
    if (newX >= width) newX -= width;
    if (newY < 0) newY += height;
    if (newY >= height) newY -= height;

    posX[i] = newX;
    posY[i] = newY;
  }
}

/* -------------------------------------------------------------------------- */
/*                              Trail system                                  */
/* -------------------------------------------------------------------------- */

/**
 * Agents stamp their presence onto the trail density grid.
 * Then the grid decays and diffuses (blur).
 */
function updateTrails(state: SimState, persistence: number): void {
  const {
    posX,
    posY,
    activeAgentCount,
    trailGrid,
    trailGridB,
    gridSize,
    width,
    height,
  } = state;

  /** Stamp agent positions onto the trail grid. */
  for (let i = 0; i < activeAgentCount; i++) {
    const gx = Math.floor(((posX[i] ?? 0) / width) * gridSize);
    const gy = Math.floor(((posY[i] ?? 0) / height) * gridSize);
    if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
      const idx = gy * gridSize + gx;
      trailGrid[idx] = Math.min((trailGrid[idx] ?? 0) + 0.3, 1.0);
    }
  }

  /** Decay + 3x3 box blur diffusion. */
  for (let y = 1; y < gridSize - 1; y++) {
    for (let x = 1; x < gridSize - 1; x++) {
      const idx = y * gridSize + x;
      const center = trailGrid[idx] ?? 0;
      const left = trailGrid[idx - 1] ?? 0;
      const right = trailGrid[idx + 1] ?? 0;
      const up = trailGrid[idx - gridSize] ?? 0;
      const down = trailGrid[idx + gridSize] ?? 0;
      /** Weighted blur: 60% center, 10% each cardinal neighbor. */
      const diffused = center * 0.6 + (left + right + up + down) * 0.1;
      trailGridB[idx] = diffused * persistence;
    }
  }

  /** Swap: copy B back to A. */
  trailGrid.set(trailGridB);
}

/* -------------------------------------------------------------------------- */
/*                     Reaction-Diffusion (Gray-Scott)                       */
/* -------------------------------------------------------------------------- */

/** Diffusion rates for chemicals A and B. */
const DIFFUSE_A = 1.0;
const DIFFUSE_B = 0.5;

/**
 * Run one step of the Gray-Scott reaction-diffusion model.
 * Reads from rdA/rdB, writes to rdA2/rdB2, then swaps.
 * Trail density seeds chemical B where agents have walked.
 */
function stepReactionDiffusion(
  state: SimState,
  feedRate: number,
  killRate: number
): void {
  const { rdA, rdB, rdA2, rdB2, trailGrid, gridSize } = state;

  for (let y = 1; y < gridSize - 1; y++) {
    for (let x = 1; x < gridSize - 1; x++) {
      const idx = y * gridSize + x;
      const a = rdA[idx] ?? 1;
      const b = rdB[idx] ?? 0;

      /** 5-point Laplacian stencil. */
      const lapA =
        (rdA[idx - 1] ?? 1) +
        (rdA[idx + 1] ?? 1) +
        (rdA[idx - gridSize] ?? 1) +
        (rdA[idx + gridSize] ?? 1) -
        a * 4;

      const lapB =
        (rdB[idx - 1] ?? 0) +
        (rdB[idx + 1] ?? 0) +
        (rdB[idx - gridSize] ?? 0) +
        (rdB[idx + gridSize] ?? 0) -
        b * 4;

      const abb = a * b * b;
      const newA = a + DIFFUSE_A * lapA - abb + feedRate * (1.0 - a);
      let newB = b + DIFFUSE_B * lapB + abb - (feedRate + killRate) * b;

      /** Seed chemical B from trail density — inject where agents walk. */
      const trail = trailGrid[idx] ?? 0;
      if (trail > 0.05) {
        newB = Math.max(newB, trail * 0.15);
      }

      rdA2[idx] = Math.max(0, Math.min(1, newA));
      rdB2[idx] = Math.max(0, Math.min(1, newB));
    }
  }

  /** Swap buffers. */
  rdA.set(rdA2);
  rdB.set(rdB2);
}

/* -------------------------------------------------------------------------- */
/*                              Rendering                                    */
/* -------------------------------------------------------------------------- */

/**
 * Render the RD grid as colored pixels (ImageData) and optionally
 * overlay agent dots. Draws to the provided canvas 2D context.
 */
function render(
  ctx: CanvasRenderingContext2D,
  state: SimState,
  params: SimParams,
  paletteStops: ColorStop[]
): void {
  const {
    rdB,
    trailGrid,
    gridSize,
    imageData,
    posX,
    posY,
    activeAgentCount,
    obstacles,
    width,
    height,
  } = state;
  const data = imageData.data;

  /** Render RD chemical B concentration as colored pixels. */
  for (let i = 0; i < gridSize * gridSize; i++) {
    const bVal = rdB[i] ?? 0;
    /** Combine RD pattern with a faint trail overlay for glow. */
    const trail = trailGrid[i] ?? 0;
    const combined = Math.min(1, bVal * 3 + trail * 0.15);
    const [r, g, b] = samplePalette(paletteStops, combined);
    const pi = i * 4;
    data[pi] = r;
    data[pi + 1] = g;
    data[pi + 2] = b;
    data[pi + 3] = 255;
  }

  /** Draw the RD image scaled to canvas. */
  ctx.putImageData(imageData, 0, 0);

  /** Scale the small RD image up to fill the canvas with nearest-neighbor for a crisp pixel look. */
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ctx.canvas, 0, 0, gridSize, gridSize, 0, 0, width, height);
  ctx.restore();

  /** Render obstacles as semi-transparent circles. */
  for (let o = 0; o < obstacles.length; o++) {
    const obs = obstacles[o]!;
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /** Render agents as small dots if enabled. */
  if (params.showAgents) {
    ctx.fillStyle = "rgba(200, 255, 0, 0.6)";
    for (let i = 0; i < activeAgentCount; i++) {
      const x = posX[i] ?? 0;
      const y = posY[i] ?? 0;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                        Parameter interpolation                            */
/* -------------------------------------------------------------------------- */

/** Idle-mode parameter targets. */
const IDLE_PARAMS = {
  agentSpeed: 0.3,
  rdFeedRate: 0.01,
  trailPersistence: 0.92,
};

/** Active-mode parameter targets (overridden by user controls). */
function getActiveParams(params: SimParams) {
  return {
    agentSpeed: params.agentSpeed,
    rdFeedRate: params.rdFeedRate,
    trailPersistence: params.trailPersistence,
  };
}

/**
 * Lerp current simulation parameters toward idle or active targets
 * based on interaction state.
 */
function lerpParams(state: SimState, params: SimParams): void {
  const now = performance.now();
  const timeSinceInteraction = now - state.lastInteractionTime;
  const shouldBeActive = timeSinceInteraction < IDLE_TIMEOUT_MS;

  state.isActive = shouldBeActive;

  const target = shouldBeActive ? getActiveParams(params) : IDLE_PARAMS;
  const cp = state.currentParams;

  cp.agentSpeed += (target.agentSpeed - cp.agentSpeed) * PARAM_LERP_SPEED;
  cp.rdFeedRate += (target.rdFeedRate - cp.rdFeedRate) * PARAM_LERP_SPEED;
  cp.trailPersistence +=
    (target.trailPersistence - cp.trailPersistence) * PARAM_LERP_SPEED;
}

/* -------------------------------------------------------------------------- */
/*                             Main component                                 */
/* -------------------------------------------------------------------------- */

export function CrowdFlowCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simStateRef = useRef<SimState | null>(null);
  const animationFrameRef = useRef<number>(0);

  /** Control panel state. */
  const [params, setParams] = useState<SimParams>({
    agentCount: 5000,
    agentSpeed: 1.0,
    rdFeedRate: 0.055,
    rdKillRate: 0.062,
    trailPersistence: 0.99,
    showAgents: true,
    palette: "coral",
  });
  const [fps, setFps] = useState(0);
  const [agentCountDisplay, setAgentCountDisplay] = useState(0);
  const [isActiveDisplay, setIsActiveDisplay] = useState(false);

  /** Refs to avoid stale closures in the animation loop. */
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
    const sim = simStateRef.current;
    if (sim) {
      sim.lastInteractionTime = performance.now();
    }
  }, []);

  /** Handle canvas click — place obstacle. */
  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      markInteraction();
      const sim = simStateRef.current;
      const canvas = canvasRef.current;
      if (!sim || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * sim.width;
      const y = ((e.clientY - rect.top) / rect.height) * sim.height;

      /** Right-click or ctrl+click: remove nearest obstacle. */
      if (e.button === 2 || e.ctrlKey) {
        e.preventDefault();
        let closestIdx = -1;
        let closestDist = Infinity;
        for (let i = 0; i < sim.obstacles.length; i++) {
          const obs = sim.obstacles[i]!;
          const dx = obs.x - x;
          const dy = obs.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < obs.radius + 10 && dist < closestDist) {
            closestDist = dist;
            closestIdx = i;
          }
        }
        if (closestIdx >= 0) {
          sim.obstacles.splice(closestIdx, 1);
        }
        return;
      }

      /** Left click: place obstacle. */
      if (sim.obstacles.length < MAX_OBSTACLES) {
        sim.obstacles.push({ x, y, radius: OBSTACLE_RADIUS });
      }
    },
    [markInteraction]
  );

  /** Suppress context menu on canvas for right-click obstacle removal. */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
    },
    []
  );

  /** Main animation loop — stored in a ref to avoid the temporal dead zone
   *  lint error from referencing `animate` inside its own useCallback. */
  const animateRef = useRef<() => void>(() => {});

  /** Update the animation callback ref — kept outside useCallback to avoid
   *  the temporal dead zone lint error. Wrapped in useEffect to satisfy
   *  the react-hooks/refs rule (no ref writes during render). */
  useEffect(() => { animateRef.current = () => {
    const sim = simStateRef.current;
    const canvas = canvasRef.current;
    if (!sim || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentParams = paramsRef.current;
    const reducedMotion = reducedMotionRef.current;

    /** Update active agent count from control panel. */
    const mobile = isMobileDevice();
    const maxAgents = mobile ? AGENT_COUNT_MOBILE : AGENT_COUNT_DESKTOP;
    sim.activeAgentCount = Math.min(currentParams.agentCount, maxAgents);

    /** Lerp simulation parameters toward idle or active targets. */
    lerpParams(sim, currentParams);

    const effectiveSpeed = reducedMotion
      ? sim.currentParams.agentSpeed * 0.5
      : sim.currentParams.agentSpeed;
    const effectiveFeed = reducedMotion
      ? IDLE_PARAMS.rdFeedRate
      : sim.currentParams.rdFeedRate;

    /** 1. Build spatial hash. */
    buildSpatialHash(sim);

    /** 2. Update Boids agents. */
    updateBoids(sim, effectiveSpeed);

    /** 3. Update trail system. */
    updateTrails(sim, sim.currentParams.trailPersistence);

    /** 4. Run reaction-diffusion steps. */
    for (let step = 0; step < sim.rdSteps; step++) {
      stepReactionDiffusion(sim, effectiveFeed, currentParams.rdKillRate);
    }

    /** 5. Render to canvas. */
    const paletteStops = PALETTES[currentParams.palette];
    render(ctx, sim, currentParams, paletteStops);

    /** FPS counter — update once per second. */
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      setAgentCountDisplay(sim.activeAgentCount);
      setIsActiveDisplay(sim.isActive);
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    animationFrameRef.current = requestAnimationFrame(() => animateRef.current());
  }; });

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

    const sim = createSimState(width, height, paramsRef.current);
    simStateRef.current = sim;
    setAgentCountDisplay(sim.activeAgentCount);

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
        sim.width = w;
        sim.height = h;
        /** Recompute spatial hash grid dimensions. */
        sim.hashCols = Math.ceil(w / HASH_CELL_SIZE);
        sim.hashRows = Math.ceil(h / HASH_CELL_SIZE);
        const totalCells = sim.hashCols * sim.hashRows;
        /** Reallocate hash arrays if grid grew. */
        if (totalCells > sim.cellStart.length) {
          sim.cellStart = new Int32Array(totalCells);
          sim.cellCount = new Int32Array(totalCells);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameRef.current);
      simStateRef.current = null;
    };
  }, []);

  /** Handle control panel parameter changes. */
  const handleParamChange = useCallback(
    (key: keyof SimParams, value: number | boolean | string) => {
      markInteraction();
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    [markInteraction]
  );

  /** Reset simulation to defaults. */
  const handleReset = useCallback(() => {
    markInteraction();
    const sim = simStateRef.current;
    if (!sim) return;

    /** Clear grids. */
    sim.trailGrid.fill(0);
    sim.trailGridB.fill(0);
    sim.rdA.fill(1);
    sim.rdB.fill(0);
    sim.rdA2.fill(1);
    sim.rdB2.fill(0);
    sim.obstacles.length = 0;

    /** Reinitialize agent positions. */
    for (let i = 0; i < sim.posX.length; i++) {
      sim.posX[i] = Math.random() * sim.width;
      sim.posY[i] = Math.random() * sim.height;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.5;
      sim.velX[i] = Math.cos(angle) * speed;
      sim.velY[i] = Math.sin(angle) * speed;
    }

    setParams({
      agentCount: 5000,
      agentSpeed: 1.0,
      rdFeedRate: 0.055,
      rdKillRate: 0.062,
      trailPersistence: 0.99,
      showAgents: true,
      palette: "coral",
    });
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
      aria-label="Crowd Flow Twin — interactive agent-based crowd simulation with reaction-diffusion patterns. Click to place obstacles, right-click to remove them."
    >
      <canvas
        ref={canvasRef as RefObject<HTMLCanvasElement>}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
        aria-hidden="true"
        onPointerDown={handleCanvasPointerDown}
        onContextMenu={handleContextMenu}
      />

      <CrowdFlowControlPanel
        params={params}
        onParamChange={handleParamChange}
        onReset={handleReset}
        agentCount={agentCountDisplay}
        fps={fps}
        isActive={isActiveDisplay}
      />
    </div>
  );
}
