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
  velocityArray: Float32Array;
  basePositionArray: Float32Array;
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

  /** Chartreuse accent color from design tokens: #C8FF00 */
  const accentColor = new THREE.Color(0xc8ff00);
  const dimColor = new THREE.Color(0x334455);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    /** Distribute particles in a cylinder volume */
    const radius = Math.random() * 12;
    const angle = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 8;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    basePositions[i3] = x;
    basePositions[i3 + 1] = y;
    basePositions[i3 + 2] = z;

    velocities[i3] = 0;
    velocities[i3 + 1] = 0;
    velocities[i3 + 2] = 0;

    /** Blend between dim and accent color based on distance from center */
    const t = Math.random() * 0.5;
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
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
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
    velocityArray: velocities,
    basePositionArray: basePositions,
    terrainPositionAttribute,
    terrainBaseY,
    clock,
  };
}

/* -------------------------------------------------------------------------- */
/*                           Animation / render loop                          */
/* -------------------------------------------------------------------------- */

/**
 * Update particle positions based on current audio features.
 * Pitch drives attraction toward a focal point, loudness drives turbulence,
 * rhythm triggers cohesion pulses.
 */
function updateParticles(
  sceneRefs: SceneRefs,
  features: AudioFeatures,
  sensitivity: number,
  reducedMotion: boolean
): void {
  const {
    positionAttribute,
    velocityArray,
    basePositionArray,
  } = sceneRefs;

  const positions = positionAttribute.array as Float32Array;
  const particleCount = positionAttribute.count;
  const effectiveSensitivity = sensitivity * (reducedMotion ? 0.3 : 1.0);

  /** Focal point moves based on pitch — higher pitch shifts the attractor right/up */
  const attractX = (features.pitch - 0.5) * 10;
  const attractY = features.pitch * 4;
  const attractZ = 0;

  /** Turbulence intensity scales with loudness */
  const turbulence = features.loudness * effectiveSensitivity * (reducedMotion ? 0.2 : 1.0);

  /** Cohesion pulse from rhythm — pulls particles inward on onset */
  const cohesion = features.rhythm * effectiveSensitivity * 0.02;

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    const px = positions[i3] ?? 0;
    const py = positions[i3 + 1] ?? 0;
    const pz = positions[i3 + 2] ?? 0;

    const baseX = basePositionArray[i3] ?? 0;
    const baseY = basePositionArray[i3 + 1] ?? 0;
    const baseZ = basePositionArray[i3 + 2] ?? 0;

    /** Direction toward attractor */
    const toAttractX = attractX - px;
    const toAttractY = attractY - py;
    const toAttractZ = attractZ - pz;

    /** Direction back to base position (spring force) */
    const toBaseX = baseX - px;
    const toBaseY = baseY - py;
    const toBaseZ = baseZ - pz;

    /** Pseudo-random turbulence per particle (deterministic from index for consistency) */
    const turbX = (Math.sin(i * 0.1 + px * 0.5) * 2 - 1) * turbulence * 0.3;
    const turbY = (Math.cos(i * 0.13 + py * 0.5) * 2 - 1) * turbulence * 0.3;
    const turbZ = (Math.sin(i * 0.17 + pz * 0.5) * 2 - 1) * turbulence * 0.3;

    /** Combine forces */
    const vx = velocityArray[i3] ?? 0;
    const vy = velocityArray[i3 + 1] ?? 0;
    const vz = velocityArray[i3 + 2] ?? 0;

    velocityArray[i3] =
      vx * 0.95 +
      toAttractX * 0.001 * effectiveSensitivity +
      toBaseX * 0.005 +
      turbX -
      px * cohesion;
    velocityArray[i3 + 1] =
      vy * 0.95 +
      toAttractY * 0.001 * effectiveSensitivity +
      toBaseY * 0.005 +
      turbY -
      py * cohesion;
    velocityArray[i3 + 2] =
      vz * 0.95 +
      toAttractZ * 0.001 * effectiveSensitivity +
      toBaseZ * 0.005 +
      turbZ -
      pz * cohesion;

    positions[i3] = px + (velocityArray[i3] ?? 0);
    positions[i3 + 1] = py + (velocityArray[i3 + 1] ?? 0);
    positions[i3 + 2] = pz + (velocityArray[i3 + 2] ?? 0);
  }

  positionAttribute.needsUpdate = true;
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
