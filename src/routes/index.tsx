import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GameCanvas } from "@/components/game/GameCanvas";
import { HUD } from "@/components/game/HUD";
import { playerId } from "@/hooks/useGameChannel";
import { randomRoomCode, readRoomFromUrl, setRoomInUrl, shareLink } from "@/lib/room";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sumô Bobão — luta de blobs com os amigos" },
      {
        name: "description",
        content:
          "Jogo 3D online e bobo: empurre seus amigos para fora do ringue. Crie uma sala, mande o código e caia na risada.",
      },
      { property: "og:title", content: "Sumô Bobão — luta de blobs com os amigos" },
      {
        property: "og:description",
        content:
          "Empurre seus amigos para fora do ringue neste sumô 3D atrapalhado. Entre por código de sala.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [roster, setRoster] = useState<{ id: string; name: string }[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [myFalls, setMyFalls] = useState(0);

  useEffect(() => {
    const fromUrl = readRoomFromUrl();
    setRoom(fromUrl ?? randomRoomCode());
    setName(`Blob ${Math.floor(Math.random() * 90 + 10)}`);
  }, []);

  const rows = useMemo(() => {
    const list = roster.map((p) => ({
      id: p.id,
      name: p.name,
      falls: p.id === playerId ? myFalls : (scores[p.id] ?? 0),
    }));
    if (!list.some((p) => p.id === playerId)) {
      list.unshift({ id: playerId, name: name || "você", falls: myFalls });
    }
    return list.sort((a, b) => a.falls - b.falls);
  }, [roster, scores, myFalls, name]);

  const join = () => {
    const code = (room || randomRoomCode()).toUpperCase();
    setRoom(code);
    setRoomInUrl(code);
    setJoined(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink(room));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (!joined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sky p-4">
        <div className="w-full max-w-md rounded-3xl border-4 border-ink bg-card p-7 shadow-chunky">
          <h1 className="font-display text-5xl leading-none text-foreground">
            Sumô Bobão
          </h1>
          <p className="mt-3 text-sm font-semibold text-muted-foreground">
            Empurre os amigos pra fora do ringue. Quem cai no melequinha verde toma vaia.
          </p>

          <label className="mt-6 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Seu apelido
          </label>
          <input
            value={name}
            maxLength={14}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border-4 border-ink bg-background px-3 py-2 font-bold text-foreground outline-none focus:border-primary"
          />

          <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Código da sala
          </label>
          <div className="mt-1 flex gap-2">
            <input
              value={room}
              maxLength={6}
              onChange={(e) => setRoom(e.target.value.toUpperCase())}
              className="w-full rounded-xl border-4 border-ink bg-background px-3 py-2 font-display text-2xl tracking-widest text-foreground outline-none focus:border-primary"
            />
            <button
              onClick={() => setRoom(randomRoomCode())}
              className="rounded-xl border-4 border-ink bg-secondary px-3 text-xs font-bold text-secondary-foreground transition-transform hover:scale-105"
            >
              sortear
            </button>
          </div>

          <button
            onClick={join}
            className="mt-6 w-full rounded-2xl border-4 border-ink bg-primary px-4 py-3 font-display text-2xl text-primary-foreground shadow-chunky transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
          >
            Entrar no ringue
          </button>

          <p className="mt-4 text-xs font-semibold text-muted-foreground">
            Mande o mesmo código (ou o link) pros amigos: até 8 blobs por sala. WASD pra
            andar, ESPAÇO pro esbarrão.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-sky">
      <GameCanvas
        roomCode={room}
        name={name}
        onFall={() => setMyFalls((f) => f + 1)}
        onRoster={setRoster}
        onScores={setScores}
      />
      <HUD roomCode={room} rows={rows} meId={playerId} onCopy={copy} copied={copied} />
    </div>
  );
}
