CREATIVE CODING — LABS V2

Labs uses creative coding at two levels: a UI animation language baked into the interface itself, and standalone Playground experiments that push specific technical problems further than a UI layer would justify.

---

UI ANIMATION LANGUAGE (V2 AESTHETIC)

The "Speculative Interface" design direction — light ground (#F0F2F5), chartreuse accent — treats animation as interface language, not decoration. Five systems:

- Ghost Type — spectral text that types itself with persistence and decay. requestAnimationFrame + React hooks.
- System Boot — startup sequence animation simulating system initialisation before content loads.
- Signal Field — responsive Canvas API particle field reacting to cursor proximity and movement.
- Datamosh — glitch-aesthetic visual distortion on transitions and media elements. Framer Motion.
- Proximity Pulse — radial pulse effects triggered by cursor position, making the interface respond to presence.

The UI layer mixes Canvas API (particle systems), Framer Motion (motion design, transitions), and React hooks with requestAnimationFrame (text effects).

---

PLAYGROUND EXPERIMENTS

Three standalone experiments, each isolating a different technical domain. All run entirely client-side with no server dependencies.

EXP_001 — Voice Particle Instrument
150,000 GPU-instanced particles driven by microphone input. The browser captures audio through a Web Audio AnalyserNode running FFT at 1024 samples, splitting into 512 frequency bins updated every frame. Those bins are grouped into four bands — bass, low-mid, high-mid, treble — each driving a directional force on a particle subset with distinct colour mapping (bass/red downward, low-mid/chartreuse left, high-mid/cyan right, treble/white upward). A subdivided terrain mesh below the particles deforms from the same FFT data. Without audio, particles hold a breathing sphere formation; above a signal threshold, per-band forces take over. Built with WebGL2 instanced buffer geometry — all per-particle state stays on the GPU, with only 2KB of audio uniform data crossing the CPU-GPU bridge per frame.

EXP_002 — Gesture Fluid Wall
Jos Stam's Stable Fluids algorithm on a 256x256 Eulerian grid, running a full Navier-Stokes solver: diffusion (20 Jacobi passes), semi-Lagrangian advection with bilinear interpolation, pressure solve (40 Jacobi passes), and projection to enforce mass conservation. Pointer movement injects velocity and density with radial smoothstep falloff. Four selectable colour palettes map density concentration to RGB via gradient stops, rendered at grid resolution and scaled up with bilinear smoothing. Runs entirely on CPU with Canvas 2D — no WebGL, no WASM. Stam's unconditionally stable advection scheme means the simulation never blows up regardless of input speed.

EXP_003 — Crowd Flow Twin
10,000 Boids agents with separation, alignment, and cohesion rules, using spatial hash neighbour lookup to keep per-frame computation tractable. Agents deposit density onto a trail grid as they move — high-traffic corridors accumulate, empty zones decay. That trail grid seeds a Gray-Scott reaction-diffusion model: two virtual chemicals (activator and inhibitor) diffuse at different rates, producing emergent coral, lichen, and labyrinthine patterns from raw crowd density. Click to place obstacles; agents reroute, new trails form, and the reaction-diffusion blooms into new structures within seconds. Three coupled simulation passes (flocking, trail accumulation, reaction-diffusion) run sequentially each frame at 60fps, entirely client-side.

---

All of this — UI animations and Playground experiments — is built through Claude Code, the same agentic workflow used across everything on Labs. It sits at the intersection of creative direction and engineering: the kind of work that usually requires a creative technologist and a developer working in tandem. Here, I handle both sides, with Claude Code as the build partner.
