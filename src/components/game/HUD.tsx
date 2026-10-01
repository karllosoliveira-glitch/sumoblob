import { useEffect, useState } from "react";
import { colorForId } from "../Sumo";
import { COUNTDOWN_MS, GOALS_TO_WIN, MODES, ROUNDS, TEAMS, VOTE_MS, lobby, net, teamOf, useMatch, type Mode } from "./match";
import { music } from "./sfx";

type Row = { id: string; name: string; falls: number };

export function HUD({ roomCode, rows, meId, onCopy, copied }: { roomCode: string; rows: Row[]; meId: string; onCopy: () => void; copied: boolean }) {
  const m = useMatch();
  const [now, setNow] = useState(Date.now());
  const [musicOn, setMusicOn] = useState(true);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(t); }, []);
  useEffect(() => { if (!musicOn) { music.stop(); return; } const start = () => music.start(); start(); window.addEventListener("pointerdown", start); window.addEventListener("keydown", start); return () => { window.removeEventListener("pointerdown", start); window.removeEventListener("keydown", start); }; }, [musicOn]);
  useEffect(() => () => music.stop(), []);

  const nameOf = (id: string | null) => id ? (rows.find((r) => r.id === id)?.name ?? "alguém") : null;
  const sorted = [...rows].sort((a, b) => (m.points[b.id] ?? 0) - (m.points[a.id] ?? 0));
  const soccer = m.mode === "futebol" && m.phase !== "lobby" && m.phase !== "vote";
  const race = m.mode === "corrida" && m.phase !== "lobby" && m.phase !== "vote";
  const teamName = (t: string | null) => (t === "A" || t === "B" ? `time ${TEAMS[t].name}` : null);
  const ids = rows.map((r) => r.id);
  const myVote = m.votes[meId];
  const voteCount = (mode: Mode) => Object.values(m.votes).filter((v) => v === mode).length;

  let banner: { big: string; small?: string } | null = null;

  if (m.phase === "countdown") {
    const left = Math.ceil((COUNTDOWN_MS - (now - m.phaseAt)) / 1000);
    const sub = soccer ? `${MODES.futebol.emoji} Você é do time ${TEAMS[teamOf(meId, ids)].name}` : race ? `${MODES.corrida.emoji} Prepare-se para a largada!` : `Rodada ${m.round} de ${ROUNDS}`;
    banner = left > 0 ? { big: String(left), small: sub } : { big: race ? "VAI! 🏁" : soccer ? "BOLA ROLANDO!" : "EMPURRA!" };
  }
  if (m.phase === "fight" && now - m.phaseAt < 900) banner = { big: race ? "CORRE! 🏁" : soccer ? "BOLA ROLANDO!" : "EMPURRA!" };
  if (m.phase === "roundEnd" && race) banner = { big: m.winner ? `🏁 ${nameOf(m.winner)} CHEGOU!` : "Corrida encerrada!", small: "Próxima rodada já já…" };
  else if (m.phase === "roundEnd" && soccer) banner = { big: `GOOOL do ${teamName(m.winner)}!`, small: `${m.points["A"] ?? 0} × ${m.points["B"] ?? 0}` };
  else if (m.phase === "roundEnd") banner = { big: m.winner ? `${nameOf(m.winner)} venceu!` : "Empate!", small: `Rodada ${m.round} de ${ROUNDS}` };
  if (m.phase === "final") banner = { big: m.winner ? `🏆 ${race ? `${nameOf(m.winner)} venceu a Corrida!` : soccer ? `${teamName(m.winner)} venceu!` : `${nameOf(m.winner)} é o CAMPEÃO!`}` : "Empate geral!", small: "Votação do próximo modo já já…" };

  return <div className="pointer-events-none fixed inset-0 z-10 select-none">
    <div className="flex items-start justify-between gap-3 p-4">
      <div className="pointer-events-auto rounded-2xl border-4 border-ink bg-card px-4 py-3 shadow-chunky"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sala</p><div className="flex items-center gap-3"><span className="font-display text-3xl tracking-widest text-foreground">{roomCode}</span><button onClick={onCopy} className="rounded-full border-2 border-ink bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground transition-transform hover:scale-105">{copied ? "copiado!" : "copiar link"}</button><button onClick={() => setMusicOn((v) => !v)} className="rounded-full border-2 border-ink bg-background px-3 py-1 text-xs font-bold text-foreground transition-transform hover:scale-105">{musicOn ? "🔊 música" : "🔇 música"}</button></div></div>
      <div className="min-w-52 rounded-2xl border-4 border-ink bg-card px-4 py-3 shadow-chunky"><div className="mb-2 flex items-baseline justify-between"><p className="font-display text-lg text-foreground">Placar</p><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{soccer ? `até ${GOALS_TO_WIN} gols` : race ? "🏁 corrida" : m.round > 0 ? `rodada ${m.round}/${ROUNDS}` : "treino"}</p></div>{soccer && <div className="mb-2 flex items-center justify-center gap-3 font-display text-3xl"><span style={{ color: TEAMS["A"].color }}>{m.points["A"] ?? 0}</span><span className="text-muted-foreground">×</span><span style={{ color: TEAMS["B"].color }}>{m.points["B"] ?? 0}</span></div>}<ul className="space-y-1">{sorted.map((r) => <li key={r.id} className="flex items-center gap-2 text-sm font-bold"><span className="inline-block size-3 rounded-full border-2 border-ink" style={{ backgroundColor: soccer ? TEAMS[teamOf(r.id, ids)].color : colorForId(r.id) }} /><span className={r.id === meId ? "text-primary" : "text-foreground"}>{r.name}{r.id === meId ? " (você)" : ""}</span>{!soccer && <span className="ml-auto font-display text-lg tabular-nums text-foreground">{m.points[r.id] ?? 0}</span>}<span className="w-8 text-right text-xs tabular-nums text-muted-foreground">💥{r.falls}</span></li>)}</ul></div>
    </div>
    {m.phase === "lobby" && <div className="pointer-events-auto absolute inset-x-0 bottom-20 mx-auto w-[min(92vw,420px)] animate-scale-in rounded-3xl border-4 border-ink bg-card p-5 text-center shadow-chunky">
      <p className="font-display text-3xl text-foreground">Sala {roomCode}</p>
      <p className="mb-3 text-sm font-bold text-muted-foreground">{rows.length}/8 blobs · {rows.length < 2 ? "chame pelo menos 1 amigo" : net.isHost ? "você é o anfitrião" : "esperando o anfitrião começar"}</p>
      <ul className="mb-4 flex flex-wrap justify-center gap-2">{rows.map((r) => <li key={r.id} className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-background px-3 py-1 text-sm font-bold"><span className="h-3 w-3 rounded-full border-2 border-ink" style={{ background: colorForId(r.id) }} />{r.name}{r.id === [...ids].sort()[0] && " 👑"}{r.id === meId && " (você)"}</li>)}</ul>
      {net.isHost ? <button disabled={rows.length < 2} onClick={() => { lobby.startRequested = true; }} className="w-full rounded-2xl border-4 border-ink bg-primary py-3 font-display text-2xl text-primary-foreground shadow-chunky transition-transform enabled:hover:scale-105 enabled:active:scale-95 disabled:opacity-50">INICIAR PARTIDA</button> : <p className="animate-pulse font-display text-lg text-foreground">aguardando…</p>}
      <p className="mt-2 text-xs font-bold text-muted-foreground">Treine enquanto espera: dá pra correr e pular!</p>
    </div>}
    {m.phase === "vote" && <div className="pointer-events-auto absolute inset-x-0 top-1/4 flex flex-col items-center gap-3 text-center"><div className="rounded-3xl border-4 border-ink bg-primary px-6 py-3 font-display text-4xl text-primary-foreground shadow-chunky">Vote no modo! {Math.max(0, Math.ceil((VOTE_MS - (now - m.phaseAt)) / 1000))}</div><div className="flex flex-wrap justify-center gap-4">{(Object.keys(MODES) as Mode[]).map((mode) => <button key={mode} onClick={() => net.vote(mode)} className={`w-52 rounded-3xl border-4 border-ink px-4 py-4 shadow-chunky transition-transform hover:-translate-y-1 ${myVote === mode ? "bg-secondary text-secondary-foreground" : "bg-card text-foreground"}`}><div className="text-5xl">{MODES[mode].emoji}</div><div className="mt-1 font-display text-xl">{MODES[mode].label}</div><div className="mt-1 text-sm font-bold">{voteCount(mode)} voto{voteCount(mode) === 1 ? "" : "s"}{myVote === mode ? " · seu voto" : ""}</div></button>)}</div></div>}
    {banner && m.phase !== "vote" && <div className="absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 text-center"><div key={banner.big} className="animate-scale-in rounded-3xl border-4 border-ink bg-primary px-8 py-4 font-display text-5xl text-primary-foreground shadow-chunky">{banner.big}</div>{banner.small && <div className="rounded-full border-4 border-ink bg-card px-4 py-1 text-sm font-bold text-foreground shadow-chunky">{banner.small}</div>}</div>}
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border-4 border-ink bg-card px-5 py-2 text-sm font-bold shadow-chunky">{race ? "WASD correr · SHIFT pular (use a rampa!) · ESPAÇO arrancada 🏁" : soccer ? "WASD mover · ESPAÇO chute · SHIFT carrinho (rouba a bola!)" : `WASD correr · ESPAÇO esbarrão · SHIFT pulo · ${MODES.sumo.hint}`}</div>
  </div>;
}
