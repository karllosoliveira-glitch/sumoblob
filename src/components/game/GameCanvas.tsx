import { Canvas } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import type { NetState } from "@/hooks/useGameChannel";
import { Arena } from "./Arena";
import { Ball } from "./Ball";
import { MobileControls } from "./MobileControls";
import { Multiplayer } from "./Multiplayer";
import { Player, type LocalState } from "./Player";
import { useMatch } from "./match";

export function GameCanvas({ roomCode, name, onFall, onRoster, onScores }: { roomCode: string; name: string; onFall: () => void; onRoster: (roster: { id: string; name: string }[]) => void; onScores: (scores: Record<string, number>) => void; }) {
  const playerRef = useRef<THREE.Group>(null);
  const localRef = useRef<LocalState>({ dash: 0, out: 0, falls: 0, dead: 0, vx: 0, vz: 0, kick: 0, tackle: 0 });
  const remote = useRef(new Map<string, NetState>());
  const { mode, phase } = useMatch();
  const soccer = mode === "futebol" && phase !== "lobby" && phase !== "vote";

  return <div className="relative h-full w-full touch-none overflow-hidden overscroll-none" style={{ WebkitTapHighlightColor: "transparent", paddingBottom: "env(safe-area-inset-bottom)" }}>
    <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ position: [0, 11, 14.5], fov: 55 }}>
      <color attach="background" args={["#8fd3f4"]} /><fog attach="fog" args={["#8fd3f4", 45, 110]} />
      <ambientLight intensity={0.55} /><directionalLight position={[9, 16, 8]} intensity={1.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} />
      <Suspense fallback={null}><Arena /><Player playerRef={playerRef} localRef={localRef} remote={remote} onFall={onFall} /><Ball playerRef={playerRef} localRef={localRef} remote={remote} /><Multiplayer roomCode={roomCode} name={name} playerRef={playerRef} localRef={localRef} remote={remote} onRoster={onRoster} onScores={onScores} /></Suspense>
    </Canvas>
    <MobileControls soccer={soccer} />
  </div>;
}
