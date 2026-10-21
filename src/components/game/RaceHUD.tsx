import { Flag, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import type * as THREE from "three";
import { playerId, type NetState } from "@/hooks/useGameChannel";
import type { LocalState } from "./Player";
import { compareRacers, getCircuit, RACE_LAPS, RACE_MAX_MS } from "./raceCircuit";
import { isRaceMode, useMatch } from "./match";

export function RaceHUD({ localRef, remote }: { playerRef: React.RefObject<THREE.Group | null>; localRef: React.RefObject<LocalState>; remote: React.RefObject<Map<string, NetState>> }) {
  const m = useMatch(), race = isRaceMode(m.mode) && !["lobby", "vote"].includes(m.phase);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!race) return; const timer = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(timer); }, [race]);
  if (!race) return null;
  const list = [{ id: playerId, name: "você", progress: localRef.current.race?.progress ?? 0, finishedAt: localRef.current.race?.finishedAt ?? 0 }, ...[...remote.current.values()].map(s => ({ id: s.id, name: s.name, progress: s.raceSeq === m.startedAt ? s.raceProgress ?? 0 : 0, finishedAt: s.raceSeq === m.startedAt ? s.raceFinishedAt ?? 0 : 0 }))].sort(compareRacers);
  const pos = list.findIndex(p => p.id === playerId) + 1;
  const progress = localRef.current.race, seconds = Math.max(0, Math.ceil((RACE_MAX_MS - Math.max(0, now - (m.startedAt ?? now))) / 1000));
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const circuit = getCircuit(m.mode), xs = circuit.points.map(p => p.x), zs = circuit.points.map(p => p.z);
  const minX = Math.min(...xs), minZ = Math.min(...zs), width = Math.max(...xs) - minX, height = Math.max(...zs) - minZ;
  const mapPoint = (fraction: number) => {
    const p = circuit.points[Math.floor(((fraction % 1 + 1) % 1) * circuit.points.length)] ?? circuit.points[0];
    return p ? { x: 12 + (p.x - minX) / width * 146, y: 12 + (p.z - minZ) / height * 106 } : { x: 12, y: 12 };
  };
  const path = circuit.points.filter((_, i) => i % 5 === 0).map((_, i) => { const p = mapPoint(i * 5 / circuit.points.length); return `${p.x},${p.y}`; }).join(" ");
  return <>
    <div className="pointer-events-none absolute right-3 top-28 z-20 flex items-center gap-3 rounded-lg border-4 border-ink bg-card px-3 py-2 text-foreground shadow-chunky sm:right-4 sm:top-4">
      <span className="font-display text-3xl text-primary">{pos}º</span>
      <div><span className="block font-display text-sm">VOLTA {Math.min(RACE_LAPS, (progress?.lap ?? 0) + 1)}/{RACE_LAPS}</span><span className="text-sm font-black tabular-nums">{time}</span></div>
      {progress?.finishedAt ? <Flag size={26} className="text-primary" /> : null}
    </div>
    <div className="pointer-events-none absolute right-3 top-48 z-20 w-44 rounded-lg border-2 border-ink bg-card/90 p-2 text-foreground sm:top-24">
      <p className="text-center text-xs font-black">{circuit.name}</p>
      <svg viewBox="0 0 170 130" className="h-32 w-full" aria-label="Mapa do circuito">
        <polygon points={path} fill="none" stroke="var(--ink)" strokeWidth="9" strokeLinejoin="round" />
        <polygon points={path} fill="none" stroke="var(--secondary)" strokeWidth="5" strokeLinejoin="round" />
        {list.map(p => { const point = mapPoint(p.progress); return <circle key={p.id} cx={point.x} cy={point.y} r={p.id === playerId ? 5 : 3.5} fill={p.id === playerId ? "var(--primary)" : "var(--accent)"} stroke="var(--ink)" strokeWidth="1.5" />; })}
      </svg>
      <div className="space-y-1 text-xs font-bold">{list.slice(0, 4).map((p, i) => <div key={p.id} className="flex justify-between gap-2"><span className="truncate">{i + 1}º {p.name}</span><span>{p.finishedAt ? <Flag size={12} /> : `${Math.min(3, Math.floor(p.progress) + 1)}/3`}</span></div>)}</div>
    </div>
    {progress?.finishedAt && m.phase === "fight" && <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-lg border-4 border-ink bg-secondary px-5 py-2 font-display text-secondary-foreground shadow-chunky">BANDEIRADA!</div>}
    {m.phase === "final" && m.raceResults && <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 w-[min(90vw,360px)] -translate-x-1/2 rounded-lg border-4 border-ink bg-card p-4 text-foreground shadow-chunky"><h2 className="mb-2 flex items-center justify-center gap-2 text-lg"><Trophy size={22} /> CLASSIFICAÇÃO</h2>{m.raceResults.map((p, i) => <div key={p.id} className="flex justify-between gap-2 py-1 font-bold"><span className="truncate">{i + 1}º {list.find(r => r.id === p.id)?.name ?? "jogador"}</span><span>{p.finishedAt ? "Chegou!" : `${Math.round(p.progress / RACE_LAPS * 100)}%`}</span></div>)}</div>}
  </>;
}