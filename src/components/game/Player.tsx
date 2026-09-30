import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useKeyboard } from "@/hooks/useKeyboard";
import { playerId, type NetState } from "@/hooks/useGameChannel";
import { Sumo, colorForId } from "../Sumo";
import { sfx } from "./sfx";
import { hitQueue, match, net } from "./match";
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
  dead: number;
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
  const hopY = useRef(0);
  const hopV = useRef(0);
  const squash = useRef(1);
  const squashV = useRef(0);
  const tiltX = useRef(0);
  const tiltZ = useRef(0);
  const hitCd = useRef(new Map<string, number>());
  const stunned = useRef(0);
  const stepT = useRef(0);
  const shake = useRef(0);
  const lastSeq = useRef(-1);

  const respawn = (ang = Math.random() * Math.PI * 2, drop = 6) => {
    pos.current.set(Math.cos(ang) * (ARENA_R - 3.5), drop, Math.sin(ang) * (ARENA_R - 3.5));
    yaw.current = Math.atan2(-pos.current.x, -pos.current.z);
    vel.current.set(0, 0, 0);
    vy.current = 0;
    spin.current = 0;
    tiltX.current = 0;
    tiltZ.current = 0;
    hopY.current = drop;
    hopV.current = 0;
    falling.current = false;
    localRef.current.out = 0;
    localRef.current.dead = 0;
    sfx.pop();
  };

  const kick = (amount: number) => {
    squashV.current -= amount;
  };

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const k = keys.current;
    const group = playerRef.current;
    if (!group) return;
    const m = match.get();

    // nova rodada: todo mundo volta pro ringue
    if (m.seq !== lastSeq.current) {
      lastSeq.current = m.seq;
      if (m.phase === "countdown") {
        const ids = [playerId, ...remote.current.keys()].sort();
        const i = ids.indexOf(playerId);
        respawn((i / Math.max(2, ids.length)) * Math.PI * 2, 4);
      }
    }
    const frozen = m.phase === "countdown";

    cooldown.current = Math.max(0, cooldown.current - dt);
    dashTimer.current = Math.max(0, dashTimer.current - dt);
    stunned.current = Math.max(0, stunned.current - dt);
    localRef.current.dash = dashTimer.current > 0 ? 1 : 0;
    for (const [id, t] of hitCd.current) {
      if (t - dt <= 0) hitCd.current.delete(id);
      else hitCd.current.set(id, t - dt);
    }

    if (localRef.current.dead) {
      group.visible = false;
      hitQueue.length = 0;
      camTarget.set(0, 13, 16);
      camera.position.lerp(camTarget, 1 - Math.exp(-3 * dt));
      camera.lookAt(0, 0, 0);
      return;
    }
    group.visible = true;

    if (!falling.current) {
      // pancadas recebidas de outros jogadores
      while (hitQueue.length) {
        const h = hitQueue.shift()!;
        vel.current.x += h.x * h.power;
        vel.current.z += h.z * h.power;
        hopV.current = h.dash ? 8 : 4;
        spin.current = (Math.random() - 0.5) * (h.dash ? 20 : 8);
        stunned.current = h.dash ? 0.45 : 0.2;
        kick(h.dash ? 10 : 6);
        shake.current = h.dash ? 0.7 : 0.3;
        sfx.boing(h.dash ? 1.2 : 0.9);
        if (h.dash) sfx.smack();
      }

      const ix =
        (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) -
        (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
      const iz =
        (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) -
        (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0);

      const grounded = hopY.current <= 0.001;
      const control = frozen ? 0 : stunned.current > 0 ? 0.15 : grounded ? 1 : 0.35;
      if ((ix || iz) && !frozen) {
        tmp.set(ix, 0, iz).normalize();
        vel.current.addScaledVector(tmp, ACCEL * control * dt);
        if (stunned.current === 0) yaw.current = Math.atan2(tmp.x, tmp.z);
        if (grounded) {
          stepT.current += dt;
          if (stepT.current > 0.18) {
            stepT.current = 0;
            sfx.step();
            hopV.current = 2.2;
          }
        }
      }

      if (!frozen && k.has("Space") && cooldown.current === 0 && stunned.current === 0) {
        cooldown.current = DASH_COOLDOWN;
        dashTimer.current = DASH_TIME;
        tmp.set(Math.sin(yaw.current), 0, Math.cos(yaw.current));
        vel.current.addScaledVector(tmp, DASH_SPEED);
        kick(-6);
        sfx.whoosh();
      }

      // colisão: EU empurro o outro mandando a pancada pra ele
      for (const s of remote.current.values()) {
        if (s.out || s.dead) continue;
        tmp.set(pos.current.x - s.x, 0, pos.current.z - s.z);
        const d = tmp.length();
        const minD = PLAYER_R * 2 + 0.3;
        if (d > 0.001 && d < minD) {
          tmp.divideScalar(d); // aponta do outro para mim
          pos.current.addScaledVector(tmp, (minD - d) * 0.5);
          if (!hitCd.current.has(s.id) && !frozen) {
            hitCd.current.set(s.id, 0.35);
            const closing = Math.max(0, -vel.current.dot(tmp));
            const dashing = dashTimer.current > 0;
            const power = dashing ? DASH_PUSH : Math.max(PUSH * 0.7, closing * 1.6);
            net.hit({ to: s.id, from: playerId, x: -tmp.x, z: -tmp.z, power, dash: dashing ? 1 : 0 });
            // coice leve pra mim
            if (closing > 0) vel.current.addScaledVector(tmp, closing * 0.7);
            vel.current.addScaledVector(tmp, dashing ? 2 : 4);
            if (dashing) {
              dashTimer.current = 0;
              sfx.smack();
              shake.current = 0.35;
            }
            kick(4);
            sfx.boing(0.7);
          }
        }
      }

      const damp = Math.exp(-(grounded && stunned.current === 0 ? DRAG : 0.9) * dt);
      vel.current.multiplyScalar(dashTimer.current > 0 ? Math.exp(-0.6 * dt) : damp);
      const speed = vel.current.length();
      const cap = dashTimer.current > 0 || stunned.current > 0 ? DASH_PUSH : MAX_SPEED;
      if (speed > cap) vel.current.multiplyScalar(cap / speed);

      pos.current.addScaledVector(vel.current, dt);

      hopV.current += GRAVITY * dt;
      hopY.current += hopV.current * dt;
      if (hopY.current <= 0) {
        if (hopV.current < -6) {
          kick(Math.min(10, -hopV.current * 0.6));
          sfx.boing(0.5);
        }
        hopY.current = 0;
        hopV.current = 0;
      }
      pos.current.y = hopY.current;

      const r = Math.hypot(pos.current.x, pos.current.z);
      const edge = THREE.MathUtils.clamp((r - (ARENA_R - 1.6)) / 1.4, 0, 1);

      if (r > ARENA_R - 0.15 && hopY.current < 0.5) {
        falling.current = true;
        localRef.current.out = 1;
        vy.current = 5;
        spin.current = (Math.random() - 0.5) * 14;
        sfx.scream();
      }

      const wob = edge * Math.sin(state.clock.elapsedTime * 22) * 0.35;
      const tx = THREE.MathUtils.clamp(vel.current.z * 0.05, -0.5, 0.5) + wob;
      const tz = THREE.MathUtils.clamp(-vel.current.x * 0.05, -0.5, 0.5) + wob;
      tiltX.current += (tx - tiltX.current) * (1 - Math.exp(-10 * dt));
      tiltZ.current += (tz - tiltZ.current) * (1 - Math.exp(-10 * dt));
      spin.current *= Math.exp(-4 * dt);
      yaw.current += spin.current * dt;
    } else {
      vy.current += GRAVITY * dt;
      pos.current.y += vy.current * dt;
      pos.current.addScaledVector(vel.current, dt);
      tiltZ.current += spin.current * dt;
      tiltX.current += spin.current * 0.6 * dt;
      if (pos.current.y < -13) {
        localRef.current.falls += 1;
        onFall();
        sfx.splat();
        if (match.get().phase === "fight") {
          localRef.current.dead = 1; // eliminado até a próxima rodada
          pos.current.set(0, -40, 0);
          group.position.copy(pos.current);
          return;
        }
        respawn();
      }
    }

    const stiff = 180;
    squashV.current += (-(squash.current - 1) * stiff - squashV.current * 9) * dt;
    squash.current += squashV.current * dt;
    const dashStretch = dashTimer.current > 0 ? 0.25 : 0;
    const sy = THREE.MathUtils.clamp(squash.current + dashStretch, 0.45, 1.8);
    const sxz = 1 / Math.sqrt(sy);

    group.position.copy(pos.current);
    group.rotation.set(tiltX.current, yaw.current, tiltZ.current, "YXZ");
    group.scale.set(sxz, sy, sxz);

    camTarget.set(pos.current.x * 0.35, 11, pos.current.z * 0.35 + 14.5);
    camera.position.lerp(camTarget, 1 - Math.exp(-3 * dt));
    shake.current = Math.max(0, shake.current - dt * 1.5);
    if (shake.current > 0) {
      const s = shake.current;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
    camera.lookAt(pos.current.x * 0.3, 1.4, Math.max(-20, pos.current.z * 0.3));
  });

  return (
    <group ref={playerRef}>
      <Sumo color={colorForId(playerId)} seed={0} />
    </group>
  );
}
