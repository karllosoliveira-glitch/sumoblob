import { CatmullRomCurve3, Vector3 } from "three";
import type { Mode } from "./match";

export const RACE_LAPS = 3;
export const RACE_MIN_MS = 120_000;
export const RACE_MAX_MS = 180_000;
export const CIRCUIT_HALF_WIDTH = 7.8;
export const CIRCUIT_SECTORS = 8;
const SAMPLE_COUNT = 480;
const circuitCache = new Map<Mode, Circuit>();
export type CircuitPoint = { x: number; z: number; tx: number; tz: number; nx: number; nz: number };
export type Circuit = { points: CircuitPoint[]; length: number; name: string };
export type RaceProgress = { lap: number; cp: number; fraction: number; progress: number; finishedAt: number };
export const emptyRaceProgress = (): RaceProgress => ({ lap: 0, cp: 0, fraction: 0, progress: 0, finishedAt: 0 });

/** Shared sampled spline: rendering, bounds, gates and ranking use the same path. */
export function getCircuit(mode: Mode): Circuit {
  const cached = circuitCache.get(mode);
  if (cached) return cached;
  const kart = mode === "kart", bike = mode === "motos", car = mode === "carros";
  const controls = [
    [0, 0], [48, 0], [84, 28], [76, 70], [34, 83],
    [8, 55], [-20, 62], [-55, 98], [-95, 74], [-100, 27],
    [-73, -7], [-34, -20],
  ].map(([x = 0, z = 0], i) => new Vector3(x, 0, z + (kart ? Math.sin(i * 1.8) * 12 : bike ? Math.sin(i) * 9 : car ? 0 : Math.cos(i) * 6)));
  const curve = new CatmullRomCurve3(controls, true, "centripetal");
  const targetLength = car ? 690 : bike ? 670 : kart ? 650 : 630;
  const scale = targetLength / curve.getLength();
  controls.forEach(p => p.multiplyScalar(scale));
  curve.updateArcLengths();
  const samples = curve.getSpacedPoints(SAMPLE_COUNT);
  const points = samples.slice(0, SAMPLE_COUNT).map((p, i) => {
    const next = samples[(i + 1) % SAMPLE_COUNT] ?? p;
    const prev = samples[(i - 1 + SAMPLE_COUNT) % SAMPLE_COUNT] ?? p;
    const dx = next.x - prev.x, dz = next.z - prev.z, d = Math.hypot(dx, dz) || 1;
    return { x: p.x, z: p.z, tx: dx / d, tz: dz / d, nx: dz / d, nz: -dx / d };
  });
  const result = { points, length: curve.getLength(), name: car ? "Autódromo Bobão" : bike ? "Serpentina Maluca" : kart ? "Circuito Chiclete" : "Ilha dos Tombos" };
  circuitCache.set(mode, result);
  return result;
}

export function circuitPoint(circuit: Circuit, fraction: number): CircuitPoint {
  const index = Math.floor(((fraction % 1 + 1) % 1) * circuit.points.length);
  return circuit.points[index] ?? { x: 0, z: 0, tx: 1, tz: 0, nx: 0, nz: -1 };
}

export function projectCircuit(circuit: Circuit, x: number, z: number) {
  let best = Infinity, index = 0, blend = 0;
  for (let i = 0; i < circuit.points.length; i++) {
    const a = circuit.points[i], b = circuit.points[(i + 1) % circuit.points.length];
    if (!a || !b) continue;
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    const d = (x - a.x - dx * t) ** 2 + (z - a.z - dz * t) ** 2;
    if (d < best) { best = d; index = i; blend = t; }
  }
  const a = circuit.points[index] ?? circuitPoint(circuit, 0);
  const b = circuit.points[(index + 1) % circuit.points.length] ?? a;
  const px = a.x + (b.x - a.x) * blend, pz = a.z + (b.z - a.z) * blend;
  return { ...a, x: px, z: pz, fraction: ((index + blend) / circuit.points.length) % 1, lateral: (x - px) * a.nx + (z - pz) * a.nz, distance: Math.sqrt(best) };
}

/** Ordered gates reject reverse finish crossings and jumps across the infield. */
export function advanceRace(s: RaceProgress, fraction: number, now: number): RaceProgress {
  if (s.finishedAt) return s;
  let delta = fraction - s.fraction;
  if (delta < -.5) delta += 1;
  if (delta > .5) delta -= 1;
  let lap = s.lap, cp = s.cp;
  if (delta > 0 && delta < .05) {
    const nextGate = (cp + 1) / CIRCUIT_SECTORS;
    if (cp < CIRCUIT_SECTORS - 1 && s.fraction < nextGate && fraction >= nextGate) cp++;
    else if (cp === CIRCUIT_SECTORS - 1 && s.fraction > .9 && fraction < .1) { lap++; cp = 0; }
  }
  const validFraction = fraction <= (cp + 1) / CIRCUIT_SECTORS + .05 ? fraction : cp / CIRCUIT_SECTORS;
  return { lap, cp, fraction, progress: Math.min(RACE_LAPS, lap + validFraction), finishedAt: lap >= RACE_LAPS ? now : 0 };
}

export function raceCanEnd(elapsed: number, hasFinisher: boolean) {
  return elapsed >= RACE_MAX_MS || (elapsed >= RACE_MIN_MS && hasFinisher);
}

export function compareRacers(a: { progress: number; finishedAt?: number; id: string }, b: { progress: number; finishedAt?: number; id: string }) {
  if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt || a.id.localeCompare(b.id);
  if (a.finishedAt) return -1;
  if (b.finishedAt) return 1;
  return b.progress - a.progress || a.id.localeCompare(b.id);
}