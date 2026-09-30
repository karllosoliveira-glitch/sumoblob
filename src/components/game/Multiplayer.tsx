import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { playerId, useGameChannel, type NetState } from "@/hooks/useGameChannel";
import { Sumo, colorForId } from "../Sumo";
import type { LocalState } from "./Player";

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
  const last = useRef({ x: 0, y: 0, z: 0, ry: 0, dash: 0, out: 0, falls: 0, at: -1 });

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
      remote.current.set(s.id, s);
      onScores(
        Object.fromEntries([...remote.current.values()].map((r) => [r.id, r.falls])),
      );
    },
  });

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = 1 - Math.exp(-12 * delta);

    for (const [id, s] of remote.current) {
      const g = meshes.current.get(id);
      if (!g) continue;
      g.visible = true;
      tmpTarget.set(s.x, s.y, s.z);
      if (g.position.distanceTo(tmpTarget) > 5) g.position.copy(tmpTarget);
      else g.position.lerp(tmpTarget, t);
      const dy = s.ry - g.rotation.y;
      g.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * t;
      g.rotation.z = s.out ? g.rotation.z + delta * 8 : 0;
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
    const { dash, out, falls } = localRef.current;

    const l = last.current;
    const moved =
      Math.abs(x - l.x) + Math.abs(y - l.y) + Math.abs(z - l.z) + Math.abs(ry - l.ry) >
        0.01 ||
      dash !== l.dash ||
      out !== l.out ||
      falls !== l.falls;
    const stale = clock.elapsedTime - l.at > 1;
    if (!moved && !stale) return;

    last.current = { x, y, z, ry, dash, out, falls, at: clock.elapsedTime };
    channel.send({
      type: "broadcast",
      event: "state",
      payload: { id: playerId, name, x, y, z, ry, dash, out, falls } satisfies NetState,
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
            position={[0, 2, 0]}
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
