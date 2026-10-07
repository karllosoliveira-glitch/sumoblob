import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, PerformanceMonitor } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
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
import { useMatch } from "./match";
import { PHYSICS_CONFIG, physicsStepStats } from "@/config/physicsConfig";

function PhysicsDebugOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  useFrame(() => {
    if (!ref.current || !PHYSICS_CONFIG.debug) return;
    ref.current.textContent = `PHYSICS | fixed: ${physicsStepStats.fixedDt.toFixed(4)}s | steps: ${physicsStepStats.subSteps} | acc: ${physicsStepStats.accumulator.toFixed(4)}`;
  });
  if (!PHYSICS_CONFIG.debug) return null;
  return <div ref={ref} className="pointer-events-none absolute left-2 top-2 z-50 rounded bg-black/70 px-2 py-1 font-mono text-[10px] text-white" />;
}

export function GameCanvas({ roomCode, name, onFall, onRoster, onScores }: { roomCode: string; name: string; onFall: () => void; onRoster: (roster: { id: string; name: string }[]) => void; onScores: (scores: Record<string, number>) => void; }) {
  const playerRef = useRef<THREE.Group>(null);
  const localRef = useRef<LocalState>({ dash: 0, out: 0, falls: 0, dead: 0, vx: 0, vz: 0, kick: 0, tackle: 0 });
  const remote = useRef(new Map<string, NetState>());
  const { mode, phase } = useMatch();
  const [dpr, setDpr] = useState(1.5);
  const soccer = mode === "futebol" && phase !== "lobby" && phase !== "vote";

  return <div className="relative h-full w-full touch-none overflow-hidden overscroll-none" style={{ WebkitTapHighlightColor: "transparent", paddingBottom: "env(safe-area-inset-bottom)" }}>
    <Canvas shadows="soft" dpr={dpr} gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }} camera={{ position: [0, 11, 14.5], fov: 55 }}>
      <PerformanceMonitor onDecline={() => setDpr(d => Math.max(0.75, d - 0.25))} onIncline={() => setDpr(d => Math.min(1.5, d + 0.25))} />
      <color attach="background" args={["#8fd3f4"]} /><fog attach="fog" args={["#8fd3f4", 45, 110]} />
      <ambientLight intensity={0.48} /><hemisphereLight args={["#d9f2ff","#304d35",0.55]} /><directionalLight position={[9, 16, 8]} intensity={1.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} />
      <Suspense fallback={null}><Arena /><ContactShadows position={[0,0.02,0]} opacity={0.32} scale={42} blur={2.6} far={14} resolution={512} /><Player playerRef={playerRef} localRef={localRef} remote={remote} onFall={onFall} /><Confetti /><Ball playerRef={playerRef} localRef={localRef} remote={remote} /><Multiplayer roomCode={roomCode} name={name} playerRef={playerRef} localRef={localRef} remote={remote} onRoster={onRoster} onScores={onScores} /></Suspense>
    </Canvas>
    <PhysicsDebugOverlay />
    <SoccerScoreboard />
    <RaceHUD playerRef={playerRef} localRef={localRef} remote={remote} />
    <MobileControls soccer={soccer} />
  </div>;
}
