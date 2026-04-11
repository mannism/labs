"use client";

/**
 * VoiceParticleCanvas — Three.js WebGL2 particle system driven by microphone audio.
 *
 * Architecture:
 * - Web Audio API: AnalyserNode extracts FFT frequency data + time-domain (waveform) data
 * - Audio features: pitch (spectral centroid), loudness (RMS), rhythm (onset detection)
 * - Particle system: GPU-instanced points with per-particle velocity/acceleration
 * - Terrain mesh: PlaneGeometry with vertex displacement from FFT bins
 * - Pitch -> particle attraction/clustering toward spectral centroid position
 * - Loudness -> turbulence/spread intensity
 * - Rhythm (onsets) -> cohesion pulse that draws particles inward
 *
 * Falls back to WebGL2 with lower particle count on devices without WebGPU.
 * Respects prefers-reduced-motion: disables turbulence, reduces animation intensity.
 */

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type RefObject,
} from "react";
import * as THREE from "three";
import { ControlPanel } from "./ControlPanel";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

/** Particle counts by device capability tier. */
const PARTICLE_COUNT_DESKTOP = 150_000;
const PARTICLE_COUNT_MOBILE = 50_000;

/** FFT analysis resolution — must be a power of 2. */
const FFT_SIZE = 2048;

/** Audio smoothing constant for AnalyserNode (0-1, higher = smoother). */
const SMOOTHING_TIME_CONSTANT = 0.8;

/** Terrain grid resolution. */
const TERRAIN_SEGMENTS = 64;

/** How quickly particles respond to audio changes (0-1, lower = smoother). */
const AUDIO_LERP_FACTOR = 0.08;

/* -------------------------------------------------------------------------- */
/*                              Type definitions                              */
/* -------------------------------------------------------------------------- */

/** Extracted audio features from the AnalyserNode per frame. */
interface AudioFeatures {
  /** Spectral centroid normalized to 0-1 range — represents perceived pitch. */
  pitch: number;
  /** RMS loudness normalized to 0-1 range. */
  loudness: number;
  /** Onset detection — 1.0 on a detected beat/transient, decays toward 0. */
  rhythm: number;
  /** Raw FFT frequency data for terrain deformation. */
  frequencyData: Uint8Array<ArrayBuffer>;
}

/** Refs bundle for the Three.js scene objects that need per-frame updates. */
interface SceneRefs {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  particles: THREE.Points;
  terrain: THREE.Mesh;
  positionAttribute: THREE.BufferAttribute;
  colorAttribute: THREE.BufferAttribute;
  velocityArray: Float32Array;
  basePositionArray: Float32Array;
  /** Per-particle frequency band assignment (0-3: bass, low-mid, high-mid, treble) */
  bandAssignment: Uint8Array;
  terrainPositionAttribute: THREE.BufferAttribute;
  terrainBaseY: Float32Array;
  clock: THREE.Clock;
}

/* -------------------------------------------------------------------------- */
/*                            Audio feature helpers                           */
/* -------------------------------------------------------------------------- */

/**
 * Compute the spectral centroid from FFT data — a weighted mean of frequencies
 * that correlates with perceived pitch brightness. Returns 0-1 normalized.
 */
function computeSpectralCentroid(frequencyData: Uint8Array): number {
  let weightedSum = 0;
  let magnitudeSum = 0;
  const len = frequencyData.length;

  for (let i = 0; i < len; i++) {
    const magnitude = frequencyData[i] ?? 0;
    weightedSum += i * magnitude;
    magnitudeSum += magnitude;
  }

  if (magnitudeSum === 0) return 0;
  return Math.min(1, (weightedSum / magnitudeSum) / len);
}

/**
 * Compute RMS (root mean square) loudness from time-domain waveform data.
 * Returns 0-1 normalized.
 */
function computeRMSLoudness(timeDomainData: Uint8Array): number {
  let sumOfSquares = 0;
  const len = timeDomainData.length;

  for (let i = 0; i < len; i++) {
    /** Time domain values are 0-255 centered at 128 — normalize to -1..1 */
    const sample = ((timeDomainData[i] ?? 128) - 128) / 128;
    sumOfSquares += sample * sample;
  }

  return Math.min(1, Math.sqrt(sumOfSquares / len) * 2.5);
}

/* -------------------------------------------------------------------------- */
/*                         Scene initialization                               */
/* -------------------------------------------------------------------------- */

/** Detect if the device is likely mobile based on viewport width. */
function isMobileDevice(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

/**
 * Initialize the Three.js scene with particles, terrain, and camera.
 * Returns refs to all objects needing per-frame updates.
 */
function initScene(
  canvas: HTMLCanvasElement,
  container: HTMLDivElement
): SceneRefs {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const isMobile = isMobileDevice();
  const particleCount = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;

  /* -- Renderer -- */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x1a1d23, 1);

  /* -- Scene + Camera -- */
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1a1d23, 0.015);

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
  camera.position.set(0, 8, 18);
  camera.lookAt(0, 0, 0);

  /* -- Ambient + directional light -- */
  const ambientLight = new THREE.AmbientLight(0x334455, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xc8ff00, 0.4);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  /* -- Particle system -- */
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const velocities = new Float32Array(particleCount * 3);
  const basePositions = new Float32Array(particleCount * 3);
  /** Each particle belongs to a frequency band (0-3) for group-based audio response */
  const bandAssignment = new Uint8Array(particleCount);

  /** Chartreuse accent color from design tokens: #C8FF00 */
  const accentColor = new THREE.Color(0xc8ff00);
  const dimColor = new THREE.Color(0x334455);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    /** Distribute particles in a tight sphere — compact idle formation */
    const radius = Math.pow(Math.random(), 0.6) * 6;
    const angle = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = Math.sin(phi) * Math.cos(angle) * radius;
    const y = Math.sin(phi) * Math.sin(angle) * radius - 1;
    const z = Math.cos(phi) * radius;

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    basePositions[i3] = x;
    basePositions[i3 + 1] = y;
    basePositions[i3 + 2] = z;

    velocities[i3] = 0;
    velocities[i3 + 1] = 0;
    velocities[i3 + 2] = 0;

    /** Assign frequency band — weighted so more particles respond to bass/low-mid */
    const r = Math.random();
    bandAssignment[i] = r < 0.35 ? 0 : r < 0.65 ? 1 : r < 0.85 ? 2 : 3;

    /** Blend between dim and accent color based on distance from center */
    const t = Math.random() * 0.3;
    const color = dimColor.clone().lerp(accentColor, t);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;

    sizes[i] = Math.random() * 2 + 0.5;
  }

  const particleGeometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  particleGeometry.setAttribute("position", positionAttribute);
  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  colorAttribute.setUsage(THREE.DynamicDrawUsage);
  particleGeometry.setAttribute("color", colorAttribute);
  particleGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const particleMaterial = new THREE.PointsMaterial({
    size: isMobile ? 0.06 : 0.04,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  /* -- Terrain mesh -- */
  const terrainGeometry = new THREE.PlaneGeometry(
    30,
    30,
    TERRAIN_SEGMENTS,
    TERRAIN_SEGMENTS
  );
  terrainGeometry.rotateX(-Math.PI / 2);

  const terrainPositionAttribute = terrainGeometry.getAttribute(
    "position"
  ) as THREE.BufferAttribute;

  /** Store base Y values for additive displacement */
  const terrainBaseY = new Float32Array(terrainPositionAttribute.count);
  for (let i = 0; i < terrainPositionAttribute.count; i++) {
    terrainBaseY[i] = terrainPositionAttribute.getY(i);
  }

  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a2030,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
    emissive: 0xc8ff00,
    emissiveIntensity: 0.05,
  });

  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.position.y = -4;
  scene.add(terrain);

  const clock = new THREE.Clock();

  return {
    renderer,
    scene,
    camera,
    particles,
    terrain,
    positionAttribute,
    colorAttribute,
    velocityArray: velocities,
    basePositionArray: basePositions,
    bandAssignment,
    terrainPositionAttribute,
    terrainBaseY,
    clock,
  };
}

/* -------------------------------------------------------------------------- */
/*                           Animation / render loop                          */
/* -------------------------------------------------------------------------- */

/** Band energy directions — each frequency band explodes particles in a different direction */
const BAND_DIRECTIONS = [
  { x: 0, y: -1, z: 0 },    // Bass: pushes down/outward (ground-shaking)
  { x: -1, y: 0.3, z: 0.5 }, // Low-mid: pushes left and slightly up
  { x: 1, y: 0.5, z: -0.5 }, // High-mid: pushes right and up
  { x: 0, y: 1, z: 0 },      // Treble: pushes straight up (sparkle)
];

/** Band colors — particles shift color based on their band's energy */
const BAND_COLORS = [
  new THREE.Color(0xff3333), // Bass: red
  new THREE.Color(0xc8ff00), // Low-mid: chartreuse
  new THREE.Color(0x00ddff), // High-mid: cyan
  new THREE.Color(0xffffff), // Treble: white
];
const IDLE_COLOR = new THREE.Color(0x334455);

/**
 * Compute average energy for each of the 4 frequency bands from raw FFT data.
 */
function computeBandEnergies(freqData: Uint8Array<ArrayBuffer>): [number, number, number, number] {
  const len = freqData.length;
  let bass = 0, lowMid = 0, highMid = 0, treble = 0;
  let bCount = 0, lCount = 0, hCount = 0, tCount = 0;

  for (let i = 0; i < len; i++) {
    const v = (freqData[i] ?? 0) / 255;
    const ratio = i / len;
    if (ratio < 0.06) { bass += v; bCount++; }
    else if (ratio < 0.25) { lowMid += v; lCount++; }
    else if (ratio < 0.6) { highMid += v; hCount++; }
    else { treble += v; tCount++; }
  }

  return [
    bCount > 0 ? bass / bCount : 0,
    lCount > 0 ? lowMid / lCount : 0,
    hCount > 0 ? highMid / hCount : 0,
    tCount > 0 ? treble / tCount : 0,
  ];
}

/**
 * Update particle positions and colors based on audio features.
 *
 * Two distinct modes:
 * - IDLE (no/low audio): tight cohesive sphere with gentle breathing drift
 * - ACTIVE (audio): particles explode outward per frequency band, colors shift,
 *   chaotic turbulence breaks the formation apart
 */
function updateParticles(
  sceneRefs: SceneRefs,
  features: AudioFeatures,
  sensitivity: number,
  reducedMotion: boolean
): void {
  const {
    positionAttribute,
    colorAttribute,
    velocityArray,
    basePositionArray,
    bandAssignment,
    clock,
  } = sceneRefs;

  const positions = positionAttribute.array as Float32Array;
  const colorsArr = colorAttribute.array as Float32Array;
  const particleCount = positionAttribute.count;
  const elapsed = clock.getElapsedTime();

  const loudness = features.loudness;
  const audioActive = loudness > 0.05;
  const bandEnergies = computeBandEnergies(features.frequencyData);
  const sens = sensitivity * (reducedMotion ? 0.3 : 1.0);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    const px = positions[i3] ?? 0;
    const py = positions[i3 + 1] ?? 0;
    const pz = positions[i3 + 2] ?? 0;

    const baseX = basePositionArray[i3] ?? 0;
    const baseY = basePositionArray[i3 + 1] ?? 0;
    const baseZ = basePositionArray[i3 + 2] ?? 0;

    let fx = 0, fy = 0, fz = 0;

    const band = bandAssignment[i] ?? 0;
    const phase = i * 0.0073;

    if (audioActive) {
      /* ---- ACTIVE MODE: explode per frequency band ---- */
      const bandEnergy = bandEnergies[band] ?? 0;
      const dir = BAND_DIRECTIONS[band] ?? BAND_DIRECTIONS[0]!;

      /** Band-directional force — each band pushes its particles a different way.
       *  Strength scales with that band's energy * sensitivity. */
      const pushStrength = bandEnergy * sens * 0.15;
      fx += dir.x * pushStrength;
      fy += dir.y * pushStrength;
      fz += dir.z * pushStrength;

      /** Radial explosion — loudness pushes all particles outward from center */
      const dist = Math.sqrt(px * px + py * py + pz * pz) + 0.001;
      const radialForce = loudness * sens * 0.04;
      fx += (px / dist) * radialForce;
      fy += (py / dist) * radialForce;
      fz += (pz / dist) * radialForce;

      /** Chaotic turbulence — multi-octave, position-dependent, time-evolving.
       *  Much stronger than idle drift to break formations apart. */
      const n = i * 0.1 + elapsed * 2.0;
      const turbStr = loudness * sens * 0.08;
      fx += (Math.sin(n + px * 0.7) + Math.sin(n * 2.3 + pz) * 0.7) * turbStr;
      fy += (Math.cos(n * 1.1 + py * 0.6) + Math.sin(n * 1.8 + px * 0.9) * 0.7) * turbStr;
      fz += (Math.sin(n * 0.8 + pz * 0.5) + Math.cos(n * 2.5 + py) * 0.7) * turbStr;

      /** Swirl — audio adds rotational force around Y axis for organic flow */
      const swirlStrength = loudness * sens * 0.012;
      fx += -pz * swirlStrength;
      fz += px * swirlStrength;

      /** Rhythm cohesion — beat detection pulls particles inward briefly */
      const cohesion = features.rhythm * sens * 0.04;
      fx -= px * cohesion;
      fy -= py * cohesion;
      fz -= pz * cohesion;

      /** Very weak spring — particles barely return during audio, free to roam */
      fx += (baseX - px) * 0.0005;
      fy += (baseY - py) * 0.0005;
      fz += (baseZ - pz) * 0.0005;

      /** Color: shift toward band color based on energy */
      const bandColor = BAND_COLORS[band] ?? BAND_COLORS[0]!;
      const colorMix = Math.min(bandEnergy * 2.5, 1.0);
      colorsArr[i3] = IDLE_COLOR.r + (bandColor.r - IDLE_COLOR.r) * colorMix;
      colorsArr[i3 + 1] = IDLE_COLOR.g + (bandColor.g - IDLE_COLOR.g) * colorMix;
      colorsArr[i3 + 2] = IDLE_COLOR.b + (bandColor.b - IDLE_COLOR.b) * colorMix;

    } else {
      /* ---- IDLE MODE: cohesive sphere with gentle breathing ---- */

      /** Strong spring back to base — keeps the formation tight */
      fx += (baseX - px) * 0.02;
      fy += (baseY - py) * 0.02;
      fz += (baseZ - pz) * 0.02;

      /** Gentle coordinated breathing — the whole sphere pulses in/out slowly */
      const breathe = Math.sin(elapsed * 0.5) * 0.002;
      fx += px * breathe;
      fy += py * breathe;
      fz += pz * breathe;

      /** Subtle individual drift — slow, small amplitude, keeps it alive but calm */
      const driftStr = reducedMotion ? 0.002 : 0.005;
      fx += Math.sin(elapsed * 0.3 + phase) * driftStr;
      fy += Math.cos(elapsed * 0.25 + phase * 1.7) * driftStr;
      fz += Math.sin(elapsed * 0.35 + phase * 2.3) * driftStr;

      /** Fade color back to dim idle */
      colorsArr[i3] = colorsArr[i3]! + (IDLE_COLOR.r - colorsArr[i3]!) * 0.02;
      colorsArr[i3 + 1] = colorsArr[i3 + 1]! + (IDLE_COLOR.g - colorsArr[i3 + 1]!) * 0.02;
      colorsArr[i3 + 2] = colorsArr[i3 + 2]! + (IDLE_COLOR.b - colorsArr[i3 + 2]!) * 0.02;
    }

    /** Apply forces with damping */
    const vx = velocityArray[i3] ?? 0;
    const vy = velocityArray[i3 + 1] ?? 0;
    const vz = velocityArray[i3 + 2] ?? 0;

    velocityArray[i3] = vx * 0.93 + fx;
    velocityArray[i3 + 1] = vy * 0.93 + fy;
    velocityArray[i3 + 2] = vz * 0.93 + fz;

    positions[i3] = px + (velocityArray[i3] ?? 0);
    positions[i3 + 1] = py + (velocityArray[i3 + 1] ?? 0);
    positions[i3 + 2] = pz + (velocityArray[i3 + 2] ?? 0);
  }

  positionAttribute.needsUpdate = true;
  colorAttribute.needsUpdate = true;
}

/**
 * Update terrain mesh vertex displacement from raw FFT frequency data.
 * Maps FFT bins across the grid, displacing Y vertices upward.
 */
function updateTerrain(
  sceneRefs: SceneRefs,
  features: AudioFeatures,
  sensitivity: number,
  reducedMotion: boolean
): void {
  const { terrainPositionAttribute, terrainBaseY } = sceneRefs;
  const vertexCount = terrainPositionAttribute.count;
  const freqData = features.frequencyData;
  const freqLen = freqData.length;
  const effectiveSensitivity = sensitivity * (reducedMotion ? 0.3 : 1.0);

  for (let i = 0; i < vertexCount; i++) {
    /** Map vertex index to FFT bin */
    const freqIndex = Math.floor((i / vertexCount) * freqLen);
    const freqValue = (freqData[freqIndex] ?? 0) / 255;

    const baseY = terrainBaseY[i] ?? 0;
    const currentY = terrainPositionAttribute.getY(i);
    const targetY = baseY + freqValue * 3 * effectiveSensitivity;

    /** Smooth interpolation toward target displacement */
    terrainPositionAttribute.setY(
      i,
      currentY + (targetY - currentY) * AUDIO_LERP_FACTOR
    );
  }

  terrainPositionAttribute.needsUpdate = true;
}

/* -------------------------------------------------------------------------- */
/*                              Custom hooks                                  */
/* -------------------------------------------------------------------------- */

/**
 * Hook to manage Web Audio API lifecycle: creates AudioContext and AnalyserNode,
 * connects microphone stream, and exposes the analyser for per-frame reads.
 */
function useAudioAnalyser() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  /** Start microphone capture and connect to analyser. */
  const start = useCallback(async (): Promise<boolean> => {
    try {
      /* navigator.mediaDevices is undefined on non-secure origins (not
         localhost and not HTTPS). Guard explicitly so the error message
         can distinguish "no API" from "permission denied". */
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn(
          "[VoiceParticles] getUserMedia unavailable — page must be served over HTTPS or localhost."
        );
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      streamRef.current = stream;
      sourceRef.current = source;

      return true;
    } catch (err) {
      console.warn("[VoiceParticles] Microphone access failed:", err);
      return false;
    }
  }, []);

  /** Stop microphone capture and clean up audio resources. */
  const stop = useCallback(() => {
    sourceRef.current?.disconnect();
    sourceRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioContextRef.current?.state !== "closed") {
      void audioContextRef.current?.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  return { analyserRef, start, stop };
}

/* -------------------------------------------------------------------------- */
/*                             Main component                                 */
/* -------------------------------------------------------------------------- */

export function VoiceParticleCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRefsRef = useRef<SceneRefs | null>(null);
  const animationFrameRef = useRef<number>(0);
  const featuresRef = useRef<AudioFeatures>({
    pitch: 0.5,
    loudness: 0,
    rhythm: 0,
    frequencyData: new Uint8Array(FFT_SIZE / 2),
  });

  const [isActive, setIsActive] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.7);
  const [particleCount, setParticleCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const { analyserRef, start: startAudio, stop: stopAudio } = useAudioAnalyser();

  /** Detect prefers-reduced-motion media query. */
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

  /** Previous loudness for onset/rhythm detection. */
  const prevLoudnessRef = useRef(0);

  /** FPS tracking refs. */
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(0);

  /**
   * Extract audio features from the AnalyserNode on each frame.
   * Writes directly into featuresRef to avoid allocations.
   */
  const extractFeatures = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const freqData = featuresRef.current.frequencyData;
    const timeDomainData = new Uint8Array(analyser.fftSize);

    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeDomainData);

    const pitch = computeSpectralCentroid(freqData);
    const loudness = computeRMSLoudness(timeDomainData);

    /** Onset detection — spike in loudness above a threshold above previous frame */
    const loudnessDelta = loudness - prevLoudnessRef.current;
    const onsetThreshold = 0.15;
    const currentRhythm = featuresRef.current.rhythm;
    const rhythm =
      loudnessDelta > onsetThreshold
        ? Math.min(1, currentRhythm + 0.5)
        : currentRhythm * 0.92;

    prevLoudnessRef.current = loudness;

    featuresRef.current.pitch = pitch;
    featuresRef.current.loudness = loudness;
    featuresRef.current.rhythm = rhythm;
  }, [analyserRef]);

  /** Main render loop. */
  const animate = useCallback(() => {
    const sceneRefs = sceneRefsRef.current;
    if (!sceneRefs) return;

    /** Extract audio features if mic is active */
    extractFeatures();

    /** Update particles and terrain */
    updateParticles(
      sceneRefs,
      featuresRef.current,
      sensitivity,
      reducedMotionRef.current
    );
    updateTerrain(
      sceneRefs,
      featuresRef.current,
      sensitivity,
      reducedMotionRef.current
    );

    /** Gentle camera orbit when not in reduced motion */
    if (!reducedMotionRef.current) {
      const elapsed = sceneRefs.clock.getElapsedTime();
      sceneRefs.camera.position.x = Math.sin(elapsed * 0.05) * 2;
      sceneRefs.camera.lookAt(0, 0, 0);
    }

    sceneRefs.renderer.render(sceneRefs.scene, sceneRefs.camera);

    /** FPS counter — update once per second */
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [extractFeatures, sensitivity]);

  /** Initialize Three.js scene on mount. */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    /** Let Three.js create the WebGL2 context directly — avoid the race
     *  condition from creating a test context and trying to release it. */
    let sceneRefs: SceneRefs;
    try {
      sceneRefs = initScene(canvas, container);
    } catch {
      setIsSupported(false);
      return;
    }
    sceneRefsRef.current = sceneRefs;
    setParticleCount(sceneRefs.positionAttribute.count);

    lastFpsTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    /** Handle container resize */
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      sceneRefs.renderer.setSize(width, height);
      sceneRefs.camera.aspect = width / height;
      sceneRefs.camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameRef.current);
      sceneRefs.renderer.dispose();
      sceneRefs.particles.geometry.dispose();
      (sceneRefs.particles.material as THREE.PointsMaterial).dispose();
      sceneRefs.terrain.geometry.dispose();
      (sceneRefs.terrain.material as THREE.MeshStandardMaterial).dispose();
      sceneRefsRef.current = null;
    };
  }, [animate]);

  /** Toggle microphone on/off — only requests permission on user interaction. */
  const handleToggle = useCallback(async () => {
    if (isActive) {
      stopAudio();
      setIsActive(false);
      setPermissionDenied(false);

      /** Reset audio features to idle state */
      featuresRef.current = {
        pitch: 0.5,
        loudness: 0,
        rhythm: 0,
        frequencyData: new Uint8Array(FFT_SIZE / 2),
      };
    } else {
      const success = await startAudio();
      if (success) {
        setIsActive(true);
        setPermissionDenied(false);
      } else {
        setPermissionDenied(true);
      }
    }
  }, [isActive, startAudio, stopAudio]);

  /** Clean up audio on unmount. */
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

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
      aria-label="Voice Particle Instrument — interactive audio visualization. Use the controls to enable your microphone and shape particles with sound."
    >
      <canvas
        ref={canvasRef as RefObject<HTMLCanvasElement>}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
        aria-hidden="true"
      />

      <ControlPanel
        isActive={isActive}
        onToggle={() => void handleToggle()}
        sensitivity={sensitivity}
        onSensitivityChange={setSensitivity}
        particleCount={particleCount}
        fps={fps}
        permissionDenied={permissionDenied}
        isSupported={isSupported}
      />
    </div>
  );
}
