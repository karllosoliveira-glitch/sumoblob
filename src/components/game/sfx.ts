// Efeitos sonoros sintetizados na hora (Web Audio) — sem arquivos, sem custo.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

if (typeof window !== "undefined") {
  const unlock = () => ac();
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol = 0.4, delay = 0) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, freq: number, q = 1, sweepTo?: number) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const last: Record<string, number> = {};
function throttle(key: string, ms: number) {
  const now = performance.now();
  if (now - (last[key] ?? 0) < ms) return false;
  last[key] = now;
  return true;
}

export const sfx = {
  fanfare() {
    fanfareNotes();
  },
  boing(strength = 1) {
    if (!throttle("boing", 120)) return;
    const p = 0.85 + Math.random() * 0.3;
    tone("sine", 180 * p, 520 * p, 0.25, 0.35 * strength);
    tone("triangle", 90 * p, 60, 0.18, 0.3 * strength);
  },
  smack() {
    if (!throttle("smack", 150)) return;
    noise(0.12, 0.7, 1800, 0.8);
    tone("square", 140, 50, 0.15, 0.25);
    tone("sine", 900, 1500, 0.12, 0.15, 0.05);
  },
  whoosh() {
    noise(0.3, 0.35, 400, 2, 2500);
    tone("sawtooth", 120, 300, 0.2, 0.06);
  },
  scream() {
    // "uiiiiiiii" caindo
    const p = 0.9 + Math.random() * 0.4;
    tone("sawtooth", 900 * p, 180 * p, 1.1, 0.12);
    tone("square", 905 * p, 182 * p, 1.1, 0.05);
  },
  splat() {
    noise(0.35, 0.8, 300, 0.7, 90);
    tone("sine", 120, 40, 0.3, 0.4);
  },
  pop() {
    tone("sine", 400, 1200, 0.1, 0.3);
    tone("sine", 800, 1600, 0.08, 0.2, 0.08);
  },
  step() {
    if (!throttle("step", 90)) return;
    tone("sine", 90 + Math.random() * 30, 50, 0.07, 0.12);
  },
};

// ---------- fanfarra + musiquinha de fundo ----------
function fanfareNotes() {
  const n = [523, 659, 784, 1047];
  n.forEach((f, i) => tone("square", f, f, 0.18, 0.12, i * 0.12));
  tone("square", 1047, 1047, 0.5, 0.12, 0.5);
}

let musicGain: GainNode | null = null;
let musicTimer: number | null = null;
let musicOn = false;

// melodia boba estilo circo/chiptune (semitons a partir de C5, null = pausa)
const MELODY = [0, 4, 7, 4, 9, 7, 4, null, 2, 5, 9, 5, 7, 5, 2, null, 0, 4, 7, 12, 11, 7, 9, 11, 12, null, 7, null, 4, 2, 0, null];
const BASS = [-12, -5, -12, -5, -7, -3, -7, -3, -10, -5, -10, -5, -5, -1, -5, -8];

function note(semi: number, t: number, dur: number, type: OscillatorType, vol: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = 523.25 * Math.pow(2, semi / 12);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(musicGain!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const music = {
  get on() {
    return musicOn;
  },
  start() {
    const c = ac();
    if (!c || !master || musicOn) return;
    musicOn = true;
    if (!musicGain) {
      musicGain = c.createGain();
      musicGain.gain.value = 0.18;
      musicGain.connect(master);
    }
    const step = 60 / 150 / 2; // colcheias a 150 bpm
    let i = 0;
    let next = c.currentTime + 0.1;
    const schedule = () => {
      while (next < c.currentTime + 0.3) {
        const m = MELODY[i % MELODY.length] ?? null;
        if (m !== null) note(m, next, step * 0.9, "square", 0.22);
        if (i % 2 === 0) note(BASS[(i / 2) % BASS.length] ?? 0, next, step * 1.6, "triangle", 0.5);
        if (i % 4 === 2) {
          // "tchic" da caixa
          const buf = c.createBuffer(1, 2000, c.sampleRate);
          const d = buf.getChannelData(0);
          for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / d.length);
          const s = c.createBufferSource();
          const g = c.createGain();
          g.gain.value = 0.25;
          s.buffer = buf;
          s.connect(g).connect(musicGain!);
          s.start(next);
        }
        next += step;
        i++;
      }
    };
    schedule();
    musicTimer = window.setInterval(schedule, 100);
  },
  stop() {
    musicOn = false;
    if (musicTimer) window.clearInterval(musicTimer);
    musicTimer = null;
  },
};
