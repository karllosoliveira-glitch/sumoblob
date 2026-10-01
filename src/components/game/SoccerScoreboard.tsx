import { useEffect, useState } from "react";
import { SOCCER_MS, TEAMS, useMatch } from "./match";

export function SoccerScoreboard() {
  const m = useMatch();
  const soccer = m.mode === "futebol" && m.phase !== "lobby" && m.phase !== "vote";
  const [flash, setFlash] = useState(false);
  const [oldA, setOldA] = useState(m.points["A"] ?? 0);
  const [oldB, setOldB] = useState(m.points["B"] ?? 0);
  useEffect(() => {
    const a = m.points["A"] ?? 0, b = m.points["B"] ?? 0;
    if (a !== oldA || b !== oldB) { setFlash(true); const t = setTimeout(() => setFlash(false), 850); setOldA(a); setOldB(b); return () => clearTimeout(t); }
    return undefined;
  }, [m.points["A"], m.points["B"]]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!soccer) return; const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, [soccer]);
  if (!soccer) return null;
  const left = Math.max(0, Math.ceil((SOCCER_MS - (m.startedAt ? Math.max(0, now - m.startedAt) : 0)) / 1000));
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return <div className={`pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 transition-transform ${flash ? "scale-110" : "scale-100"}`} style={{ paddingTop: "env(safe-area-inset-top)" }}>
    <div className="flex min-w-[270px] overflow-hidden rounded-2xl border-4 border-ink bg-white shadow-chunky">
      <div className="flex min-w-24 flex-1 items-center justify-center gap-2 px-3 py-2 text-white" style={{ background: TEAMS.A.color }}><span className="font-display text-xs font-black">{TEAMS.A.name}</span></div>
      <div className="flex items-center gap-2 bg-ink px-4 py-1 font-display text-3xl text-white"><span>{m.points["A"] ?? 0}</span><span className="text-white/60">-</span><span>{m.points["B"] ?? 0}</span></div>
      <div className="flex min-w-24 flex-1 items-center justify-center gap-2 px-3 py-2 text-white" style={{ background: TEAMS.B.color }}><span className="font-display text-xs font-black">{TEAMS.B.name}</span></div>
    </div>
    <div className="mx-auto mt-1 w-max rounded-full bg-black/65 px-3 py-0.5 text-[9px] font-black uppercase tracking-widest text-white"><span className={left <= 30 ? "text-destructive" : ""}>⏱ {clock}</span> · AO VIVO</div>
  </div>;
}
