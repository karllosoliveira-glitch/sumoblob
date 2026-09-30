import { useEffect, useState } from "react";
import { colorForId } from "../Sumo";
import { COUNTDOWN_MS, ROUNDS, useMatch } from "./match";
import { music } from "./sfx";

type Row = { id: string; name: string; falls: number };

export function HUD({
  roomCode,
  rows,
  meId,
  onCopy,
  copied,
}: {
  roomCode: string;
  rows: Row[];
  meId: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const m = useMatch();
  const [now, setNow] = useState(Date.now());
  const [musicOn, setMusicOn] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!musicOn) {
      music.stop();
      return;
    }
    const start = () => music.start();
    start();
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [musicOn]);
  useEffect(() => () => music.stop(), []);

  const nameOf = (id: string | null) =>
    id ? (rows.find((r) => r.id === id)?.name ?? "alguém") : null;
  const sorted = [...rows].sort((a, b) => (m.points[b.id] ?? 0) - (m.points[a.id] ?? 0));

  let banner: { big: string; small?: string } | null = null;
  if (m.phase === "lobby") banner = { big: "Esperando amigos…", small: "Mande o link! Treine enquanto isso." };
  if (m.phase === "countdown") {
    const left = Math.ceil((COUNTDOWN_MS - (now - m.phaseAt)) / 1000);
    banner = left > 0 ? { big: String(left), small: `Rodada ${m.round} de ${ROUNDS}` } : { big: "EMPURRA!" };
  }
  if (m.phase === "fight" && now - m.phaseAt < 900) banner = { big: "EMPURRA!" };
  if (m.phase === "roundEnd")
    banner = { big: m.winner ? `${nameOf(m.winner)} venceu!` : "Empate!", small: `Rodada ${m.round} de ${ROUNDS}` };
  if (m.phase === "final")
    banner = {
      big: m.winner ? `🏆 ${nameOf(m.winner)} é o CAMPEÃO!` : "Empate geral!",
      small: "Nova partida já já…",
    };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto rounded-2xl border-4 border-ink bg-card px-4 py-3 shadow-chunky">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sala</p>
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl tracking-widest text-foreground">{roomCode}</span>
            <button
              onClick={onCopy}
              className="rounded-full border-2 border-ink bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground transition-transform hover:scale-105"
            >
              {copied ? "copiado!" : "copiar link"}
            </button>
            <button
              onClick={() => setMusicOn((v) => !v)}
              className="rounded-full border-2 border-ink bg-background px-3 py-1 text-xs font-bold text-foreground transition-transform hover:scale-105"
            >
              {musicOn ? "🔊 música" : "🔇 música"}
            </button>
          </div>
        </div>

        <div className="min-w-52 rounded-2xl border-4 border-ink bg-card px-4 py-3 shadow-chunky">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="font-display text-lg text-foreground">Placar</p>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {m.round > 0 ? `rodada ${m.round}/${ROUNDS}` : "treino"}
            </p>
          </div>
          <ul className="space-y-1">
            {sorted.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm font-bold">
                <span
                  className="inline-block size-3 rounded-full border-2 border-ink"
                  style={{ backgroundColor: colorForId(r.id) }}
                />
                <span className={r.id === meId ? "text-primary" : "text-foreground"}>
                  {r.name}
                  {r.id === meId ? " (você)" : ""}
                </span>
                <span className="ml-auto font-display text-lg tabular-nums text-foreground">
                  {m.points[r.id] ?? 0}
                </span>
                <span className="w-8 text-right text-xs tabular-nums text-muted-foreground" title="tombos">
                  💥{r.falls}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {banner && (
        <div className="absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 text-center">
          <div
            key={banner.big}
            className="animate-scale-in rounded-3xl border-4 border-ink bg-primary px-8 py-4 font-display text-5xl text-primary-foreground shadow-chunky"
          >
            {banner.big}
          </div>
          {banner.small && (
            <div className="rounded-full border-4 border-ink bg-card px-4 py-1 text-sm font-bold text-foreground shadow-chunky">
              {banner.small}
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border-4 border-ink bg-card px-5 py-2 text-sm font-bold shadow-chunky">
        WASD para correr · ESPAÇO para o esbarrão · Último de pé ganha a rodada
      </div>
    </div>
  );
}
