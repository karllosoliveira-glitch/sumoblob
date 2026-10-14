import { Flag } from "lucide-react";
import { useEffect, useState } from "react";
import type * as THREE from "three";
import { playerId, type NetState } from "@/hooks/useGameChannel";
import type { LocalState } from "./Player";
import { RACE_CHECKPOINTS, RACE_X_FINISH, RACE_X_MIN } from "./constants";
import { isRaceMode, useMatch } from "./match";

/** Posição ao vivo (1º, 2º...) e progresso na pista da Corrida Maluca. */
export function RaceHUD({ playerRef, localRef, remote }: { playerRef: React.RefObject<THREE.Group | null>; localRef: React.RefObject<LocalState>; remote: React.RefObject<Map<string, NetState>> }) {
  const m = useMatch();
  const race = isRaceMode(m.mode) && (m.phase === "fight" || m.phase === "countdown");
  const [, tick] = useState(0);
  useEffect(() => { if (!race) return; const t = setInterval(() => tick((n) => n + 1), 200); return () => clearInterval(t); }, [race]);
  if (!race) return null;
  const myX = playerRef.current?.position.x ?? RACE_X_MIN;
  const list = [{ id: playerId, name: "você", x: myX }, ...[...remote.current.values()].map((s) => ({ id: s.id, name: s.name, x: s.x }))].sort((a, b) => b.x - a.x);
  const pos = list.findIndex((p) => p.id === playerId) + 1;
  const pct = (x: number) => Math.min(100, Math.max(0, ((x - RACE_X_MIN) / (RACE_X_FINISH - RACE_X_MIN)) * 100));
  return <div className="pointer-events-none absolute left-1/2 top-3 z-20 w-[min(92vw,520px)] -translate-x-1/2" style={{ paddingTop: "env(safe-area-inset-top)" }}>
    <div className="flex items-center gap-3 rounded-2xl border-4 border-ink bg-card px-3 py-2 shadow-chunky">
      <span key={pos} className="animate-scale-in font-display text-4xl text-primary">{pos}º</span>
      <div className="relative h-4 flex-1 rounded-full border-2 border-ink bg-muted">
        {RACE_CHECKPOINTS.map((x) => <span key={x} className="absolute top-0 h-full w-0.5 bg-ink/40" style={{ left: `${pct(x)}%` }} />)}
        {list.map((p) => <span key={p.id} className={`absolute -top-1.5 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-ink ${p.id === playerId ? "z-10 bg-primary" : "bg-secondary"}`} style={{ left: `${pct(p.x)}%` }} />)}
        <span className="absolute -right-1 -top-2 text-lg"><Flag size={18} /></span>
      </div>
      <span className="text-xs font-black text-muted-foreground">CP {localRef.current.cp ?? 0}/{RACE_CHECKPOINTS.length}</span>
    </div>
  </div>;
}
