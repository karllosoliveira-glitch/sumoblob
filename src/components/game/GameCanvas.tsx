import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, PerformanceMonitor } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

import type { NetState } from "@/hooks/useGameChannel";
import { Arena } from "./Arena";
import { Ball } from "./Ball";
import { Confetti } from "./Confetti";
import { RaceHUD } from "./RaceHUD";
import { MobileControls } from "./MobileControls";
import { Multiplayer } from "./Multiplayer";
import { Player, type LocalState } from "./Player";
import { SoccerScoreboard } from "./SoccerScoreboard";
import { isRaceMode, netStats, useMatch } from "./match";

interface GameCanvasProps {
  roomCode: string;
  name: string;
  onFall: () => void;
  onRoster: (roster: { id: string; name: string }[]) => void;
  onScores: (scores: Record<string, number>) => void;
}

export function GameCanvas({
  roomCode,
  name,
  onFall,
  onRoster,
  onScores,
}: GameCanvasProps) {
  const playerRef = useRef<THREE.Group>(null);

  const localRef = useRef<LocalState>({
    dash: 0,
    out: 0,
    falls: 0,
    dead: 0,
    vx: 0,
    vz: 0,
    kick: 0,
    tackle: 0,
  });

  const remote = useRef(new Map<string, NetState>());

  const { mode, phase } = useMatch();
  const [dpr, setDpr] = useState(1.5);

  const inMatch = phase !== "lobby" && phase !== "vote";
  const soccer = mode === "futebol" && inMatch;
  const sumo = mode === "sumo" && inMatch;
  const racing = isRaceMode(mode) && inMatch;

  const handleDecline = () => {
    setDpr((current) => Math.max(0.75, current - 0.25));
  };

  const handleIncline = () => {
    setDpr((current) => Math.min(1.5, current + 0.25));
  };

  return (
    <div
      className="relative h-full w-full touch-none overflow-hidden overscroll-none"
      style={{
        WebkitTapHighlightColor: "transparent",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <Canvas
        shadows="soft"
        dpr={dpr}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        camera={{
          position: [0, 11, 14.5],
          fov: 55,
        }}
      >
        <PerformanceMonitor
          onDecline={handleDecline}
          onIncline={handleIncline}
        />

        <FrameMeter />

        <color attach="background" args={["#8fd3f4"]} />
        <fog attach="fog" args={["#8fd3f4", 45, 110]} />

        <ambientLight intensity={0.48} />

        <hemisphereLight
          args={["#d9f2ff", "#304d35", 0.55]}
        />

        <directionalLight
          position={[9, 16, 8]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-18}
          shadow-camera-right={18}
          shadow-camera-top={18}
          shadow-camera-bottom={-18}
        />

        <Suspense fallback={null}>
          <Arena />

          {!racing && (
            <ContactShadows
              position={[0, 0.02, 0]}
              opacity={0.32}
              scale={42}
              blur={2.6}
              far={14}
              resolution={512}
            />
          )}

          <Player
            playerRef={playerRef}
            localRef={localRef}
            remote={remote}
            onFall={onFall}
          />

          <Confetti />

          <Ball
            playerRef={playerRef}
            localRef={localRef}
            remote={remote}
          />

          <Multiplayer
            roomCode={roomCode}
            name={name}
            playerRef={playerRef}
            localRef={localRef}
            remote={remote}
            onRoster={onRoster}
            onScores={onScores}
          />
        </Suspense>
      </Canvas>

      <PerformanceHUD />
      <SoccerScoreboard />

      <RaceHUD
        playerRef={playerRef}
        localRef={localRef}
        remote={remote}
      />

      <MobileControls
        soccer={soccer}
        sumo={sumo}
        racing={racing}
      />
    </div>
  );
}

/**
 * Deve permanecer dentro do Canvas para que useFrame funcione.
 */
function FrameMeter() {
  const frames = useRef(0);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    frames.current += 1;
    elapsed.current += Math.min(delta, 0.1);

    if (elapsed.current >= 0.5) {
      netStats.fps = Math.round(
        frames.current / elapsed.current,
      );

      frames.current = 0;
      elapsed.current = 0;
    }
  });

  return null;
}

/**
 * HUD HTML independente do Canvas 3D.
 */
function PerformanceHUD() {
  const [stats, setStats] = useState({
    fps: netStats.fps,
    ping: netStats.ping,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStats({
        fps: netStats.fps,
        ping: netStats.ping,
      });
    }, 350);

    return () => window.clearInterval(timer);
  }, []);

  const fpsTone =
    stats.fps >= 55
      ? "text-emerald-300"
      : stats.fps >= 30
        ? "text-amber-300"
        : "text-rose-300";

  const pingTone =
    stats.ping === null
      ? "text-white/70"
      : stats.ping < 70
        ? "text-emerald-300"
        : stats.ping < 140
          ? "text-amber-300"
          : "text-rose-300";

  return (
    <div className="pointer-events-none absolute bottom-32 right-3 z-20 flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 font-mono text-[11px] font-bold shadow-xl backdrop-blur-md sm:bottom-14 sm:right-4">
      <span className={fpsTone}>
        FPS {stats.fps || "—"}
      </span>

      <span className="text-white/30">|</span>

      <span className={pingTone}>
        PING{" "}
        {stats.ping === null
          ? "—"
          : `${stats.ping} ms`}
      </span>
    </div>
  );
}
