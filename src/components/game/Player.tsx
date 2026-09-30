import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useKeyboard } from "@/hooks/useKeyboard";
import { playerId, type NetState } from "@/hooks/useGameChannel";
import { Sumo, colorForId } from "../Sumo";
import {
  ACCEL,
  ARENA_R,
  DASH_COOLDOWN,
  DASH_PUSH,
  DASH_SPEED,
  DASH_TIME,
  DRAG,
  GRAVITY,
  MAX_SPEED,
  PLAYER_R,
  PUSH,
  spawnAngle,
} from "./constants";

export type LocalState = {
  dash: number;
  out: number;
  falls: number;
};

const tmp = new THREE.Vector3();
const camTarget = new THREE.Vector3();

export function Player({
  playerRef,
  localRef,
  remote,
  onFall,
}: {
  playerRef: React.RefObject<THREE.Group | null>;
  localRef: React.RefObject<LocalState>;
  remote: React.RefObject<Map<string, NetState>>;
  onFall: () => void;
}) {
  const keys = useKeyboard();
  const { camera } = useThree();

  const a = spawnAngle(playerId);
  const pos = useRef(
    new THREE.Vector3(Math.cos(a) * (ARENA_R - 3), 0, Math.sin(a) * (ARENA_R - 3)),
  );
  const vel = useRef(new THREE.Vector3());
  const yaw = useRef(0);
  const dashTimer = useRef(0);
  const cooldown = useRef(0);
  const falling = useRef(false);
  const vy = useRef(0);
  const spin = useRef(0);

  const respawn = () => {
    const ang = Math.random() * Math.PI * 2;
    pos.current.set(Math.cos(ang) * (ARENA_R - 3.5), 0, Math.sin(ang) * (ARENA_R - 3.5));
    vel.current.set(0, 0, 0);
    vy.current = 0;
    spin.current = 0;
    falling.current = false;
    localRef.current.out = 0;
  };

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const k = keys.current;
    const group = playerRef.current;
    if (!group) return;

    cooldown.current = Math.max(0, cooldown.current - dt);
    dashTimer.current = Math.max(0, dashTimer.current - dt);
    localRef.current.dash = dashTimer.current > 0 ? 1 : 0;

    if (!falling.current) {
      const ix =
        (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) -
        (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
      const iz =
        (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) -
        (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0);

      if (ix || iz) {
        tmp.set(ix, 0, iz).normalize();
        vel.current.addScaledVector(tmp, ACCEL * dt);
        yaw.current = Math.atan2(tmp.x, tmp.z);
      }

      // dash / esbarrão
      if (k.has("Space") && cooldown.current === 0) {
        cooldown.current = DASH_COOLDOWN;
        dashTimer.current = DASH_TIME;
        tmp.set(Math.sin(yaw.current), 0, Math.cos(yaw.current));
        vel.current.addScaledVector(tmp, DASH_SPEED);
      }

      // bump into other wrestlers
      for (const s of remote.current.values()) {
        if (s.out) continue;
        tmp.set(pos.current.x - s.x, 0, pos.current.z - s.z);
        const d = tmp.length();
        if (d > 0.001 && d < PLAYER_R * 2 + 0.25) {
          tmp.divideScalar(d);
          const force = s.dash ? DASH_PUSH : PUSH;
          vel.current.addScaledVector(tmp, force * dt * 6);
          pos.current.addScaledVector(tmp, (PLAYER_R * 2 + 0.25 - d) * 0.5);
        }
      }

      const damp = Math.exp(-DRAG * dt);
      vel.current.multiplyScalar(dashTimer.current > 0 ? Math.exp(-0.6 * dt) : damp);
      const speed = vel.current.length();
      const cap = dashTimer.current > 0 ? DASH_SPEED : MAX_SPEED;
      if (speed > cap) vel.current.multiplyScalar(cap / speed);

      pos.current.addScaledVector(vel.current, dt);

      if (Math.hypot(pos.current.x, pos.current.z) > ARENA_R - 0.15) {
        falling.current = true;
        localRef.current.out = 1;
        vy.current = 3;
        spin.current = (Math.random() - 0.5) * 12;
      }
    } else {
      vy.current += GRAVITY * dt;
      pos.current.y += vy.current * dt;
      pos.current.addScaledVector(vel.current, dt);
      if (pos.current.y < -13) {
        localRef.current.falls += 1;
        onFall();
        pos.current.y = 0;
        respawn();
      }
    }

    group.position.copy(pos.current);
    group.rotation.y = yaw.current;
    group.rotation.z = falling.current ? (group.rotation.z + spin.current * dt) : 0;
    const stretch = dashTimer.current > 0 ? 1.25 : 1;
    group.scale.set(2 - stretch, stretch, 2 - stretch);

    // camera: fixed angle, gently drifting toward the action
    camTarget.set(pos.current.x * 0.35, 13, pos.current.z * 0.35 + 17);
    camera.position.lerp(camTarget, 1 - Math.exp(-3 * dt));
    camera.lookAt(pos.current.x * 0.3, 1, pos.current.z * 0.3);
  });

  return (
    <group ref={playerRef}>
      <Sumo color={colorForId(playerId)} seed={0} />
    </group>
  );
}
