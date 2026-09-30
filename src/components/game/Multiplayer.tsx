import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { playerId, useGameChannel, type NetState } from "@/hooks/useGameChannel";
import { Sumo, colorForId } from "../Sumo";
import type { LocalState } from "./Player";
import {
  COUNTDOWN_MS,
  FINAL_MS,
  ROUND_END_MS,
  ROUNDS,
  hitQueue,
  match,
  net,
  type MatchState,
} from "./match";
import { sfx } from "./sfx";

const NET_TICK = 1 / 8;
const tmpTarget = new THREE.Vector3();

export function Multiplayer({
  roomCode,
  name,
  playerRef,
  localRef,
  remote,
  onRoster,
  onScores,
}: {
  roomCode: string;
  name: string;
  playerRef: React.RefObject<THREE.Group | null>;
  localRef: React.RefObject<LocalState>;
  remote: React.RefObject<Map<string, NetState>>;
  onRoster: (roster: { id: string; name: string }[]) => void;
  onScores: (scores: Record<string, number>) => void;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const roster = useRef(new Set<string>());
  const meshes = useRef(new Map<string, THREE.Group>());
  const acc = useRef(0);
  const hostAcc = useRef(0);
  const lastMatchSend = useRef(0);
  const last = useRef({ x: 0, y: 0, z: 0, ry: 0, dash: 0, out: 0, falls: 0, dead: 0, at: -1 });

  const applyMatch = (m: MatchState) => {
    const cur = match.get();
    if (m.seq === cur.seq && m.phase === cur.phase) {
      if (JSON.stringify(m.points) !== JSON.stringify(cur.points)) match.set({ ...cur, points: m.points });
      return;
    }
    if (m.phase === "countdown") sfx.pop();
    if (m.phase === "roundEnd" || m.phase === "final") sfx.fanfare();
    match.set({ ...m, phaseAt: Date.now() });
  };

  const channelRef = useGameChannel(roomCode, name, {
    onRoster: (list) => {
      roster.current = new Set(list.map((p) => p.id));
      roster.current.delete(playerId);
      for (const id of [...remote.current.keys()])
        if (!roster.current.has(id)) remote.current.delete(id);
      setIds([...roster.current]);
      onRoster(list);
    },
    onState: (s) => {
      if (!roster.current.has(s.id)) return;
      const prev = remote.current.get(s.id);
      remote.current.set(s.id, s);
      if (!prev || prev.falls !== s.falls) {
        onScores(Object.fromEntries([...remote.current.values()].map((r) => [r.id, r.falls])));
      }
    },
    onHit: (h) => {
      hitQueue.push(h);
    },
    onMatch: (m) => {
      // só aceita do anfitrião atual
      const host = [playerId, ...roster.current].sort()[0];
      if (host !== playerId) applyMatch(m);
    },
  });

  net.hit = (m) => {
    channelRef.current?.send({ type: "broadcast", event: "hit", payload: m });
  };

  const hostTick = (now: number) => {
    const all = [playerId, ...roster.current].sort();
    if (all[0] !== playerId) return;
    const m = match.get();
    const elapsed = now - m.phaseAt;
    const n = all.length;
    let next: MatchState | null = null;
    const go = (patch: Partial<MatchState>) =>
      (next = { ...m, ...patch, phaseAt: now, seq: m.seq + 1 });

    if (n < 2) {
      if (m.phase !== "lobby") go({ phase: "lobby", round: 0, winner: null, points: {} });
    } else if (m.phase === "lobby") {
      go({ phase: "countdown", round: 1, winner: null, points: {} });
    } else if (m.phase === "countdown" && elapsed > COUNTDOWN_MS) {
      go({ phase: "fight" });
    } else if (m.phase === "fight" && elapsed > 1500) {
      const alive = all.filter((id) =>
        id === playerId ? !localRef.current.dead : !remote.current.get(id)?.dead,
      );
      if (alive.length <= 1) {
        const w = alive[0] ?? null;
        const points = { ...m.points };
        if (w) points[w] = (points[w] ?? 0) + 1;
        go({ phase: "roundEnd", winner: w, points });
      }
    } else if (m.phase === "roundEnd" && elapsed > ROUND_END_MS) {
      const best = Math.max(0, ...Object.values(m.points));
      const leaders = Object.keys(m.points).filter((id) => m.points[id] === best);
      const decided = best >= Math.ceil(ROUNDS / 2) + 0 && best > ROUNDS / 2;
      if (m.round >= ROUNDS || decided) {
        go({ phase: "final", winner: leaders.length === 1 ? (leaders[0] ?? null) : null });
      } else {
        go({ phase: "countdown", round: m.round + 1, winner: null });
      }
    } else if (m.phase === "final" && elapsed > FINAL_MS) {
      go({ phase: "countdown", round: 1, winner: null, points: {} });
    }

    const channel = channelRef.current;
    if (next) {
      applyMatch(next);
      match.set(next);
    }
    if (channel && (next || now - lastMatchSend.current > 1000)) {
      lastMatchSend.current = now;
      channel.send({ type: "broadcast", event: "match", payload: match.get() });
    }
  };

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = 1 - Math.exp(-12 * delta);

    for (const [id, s] of remote.current) {
      const g = meshes.current.get(id);
      if (!g) continue;
      g.visible = !s.dead;
      tmpTarget.set(s.x, s.y, s.z);
      if (g.position.distanceTo(tmpTarget) > 5) g.position.copy(tmpTarget);
      else g.position.lerp(tmpTarget, t);
      const dy = s.ry - g.rotation.y;
      g.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * t;
      g.rotation.z = s.out ? g.rotation.z + delta * 8 : 0;
      const sq = s.dash ? 1.25 : 1 + Math.sin(clock.elapsedTime * 14 + id.length) * 0.04;
      g.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    }

    hostAcc.current += delta;
    if (hostAcc.current > 0.1) {
      hostAcc.current = 0;
      hostTick(Date.now());
    }

    acc.current += delta;
    if (acc.current < NET_TICK) return;
    acc.current = 0;
    const mesh = playerRef.current;
    const channel = channelRef.current;
    if (!mesh || !channel || document.hidden) return;

    const x = Math.round(mesh.position.x * 100) / 100;
    const y = Math.round(mesh.position.y * 100) / 100;
    const z = Math.round(mesh.position.z * 100) / 100;
    const ry = Math.round(mesh.rotation.y * 100) / 100;
    const { dash, out, falls, dead } = localRef.current;

    const l = last.current;
    const moved =
      Math.abs(x - l.x) + Math.abs(y - l.y) + Math.abs(z - l.z) + Math.abs(ry - l.ry) > 0.01 ||
      dash !== l.dash ||
      out !== l.out ||
      dead !== l.dead ||
      falls !== l.falls;
    const stale = clock.elapsedTime - l.at > 1;
    if (!moved && !stale) return;

    last.current = { x, y, z, ry, dash, out, falls, dead, at: clock.elapsedTime };
    channel.send({
      type: "broadcast",
      event: "state",
      payload: { id: playerId, name, x, y, z, ry, dash, out, falls, dead } satisfies NetState,
    });
  });

  return (
    <>
      {ids.map((id, i) => (
        <group
          key={id}
          visible={false}
          ref={(g) => {
            if (g) meshes.current.set(id, g);
            else meshes.current.delete(id);
          }}
        >
          <Sumo color={colorForId(id)} seed={i * 1.7 + 1} />
          <Text
            position={[0, 2.5, 0]}
            fontSize={0.42}
            color="#ffffff"
            outlineWidth={0.05}
            outlineColor="#2b2119"
            anchorX="center"
          >
            {remote.current.get(id)?.name ?? "jogador"}
          </Text>
        </group>
      ))}
    </>
  );
}
