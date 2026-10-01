import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useKeyboard } from "@/hooks/useKeyboard";
import { playerId, type NetState } from "@/hooks/useGameChannel";
import { Sumo, colorForId } from "../Sumo";
import { sfx } from "./sfx";
import { TEAMS, ball, hitQueue, match, net, teamOf, useMatch } from "./match";
import { ACCEL, ARENA_R, BALL_R, FIELD_X, FIELD_Z, SOAP_ACCEL, SOAP_DRAG, DASH_COOLDOWN, DASH_PUSH, DASH_SPEED, DASH_TIME, DRAG, GRAVITY, MAX_SPEED, PLAYER_R, PUSH, spawnAngle } from "./constants";

export type LocalState = { dash: number; out: number; falls: number; dead: number; vx: number; vz: number; kick: number; tackle: number };
const tmp = new THREE.Vector3();
const camTarget = new THREE.Vector3();

export function Player(props: Parameters<typeof PlayerInner>[0]) { return <PlayerInner {...props} />; }

function PlayerInner({ playerRef, localRef, remote, onFall }: { playerRef: React.RefObject<THREE.Group | null>; localRef: React.RefObject<LocalState>; remote: React.RefObject<Map<string, NetState>>; onFall: () => void; }) {
  const keys = useKeyboard();
  const { camera } = useThree();
  const a = spawnAngle(playerId);
  const pos = useRef(new THREE.Vector3(Math.cos(a) * (ARENA_R - 3), 0, Math.sin(a) * (ARENA_R - 3)));
  const vel = useRef(new THREE.Vector3());
  const yaw = useRef(0), dashTimer = useRef(0), cooldown = useRef(0), tackleTimer = useRef(0);
  const falling = useRef(false), vy = useRef(0), spin = useRef(0), hopY = useRef(0), hopV = useRef(0);
  const squash = useRef(1), squashV = useRef(0), tiltX = useRef(0), tiltZ = useRef(0);
  const hitCd = useRef(new Map<string, number>()), stunned = useRef(0), stepT = useRef(0), shake = useRef(0);
  const kickFx = useRef(0), lastSeq = useRef(-1), lastSpace = useRef(false), lastShift = useRef(false);

  const respawn = (ang = Math.random() * Math.PI * 2, drop = 6) => {
    pos.current.set(Math.cos(ang) * (ARENA_R - 3.5), drop, Math.sin(ang) * (ARENA_R - 3.5)); yaw.current = Math.atan2(-pos.current.x, -pos.current.z); vel.current.set(0, 0, 0); vy.current = 0; spin.current = 0; tackleTimer.current = 0;
    tiltX.current = 0; tiltZ.current = 0; hopY.current = drop; hopV.current = 0; falling.current = false; localRef.current.out = 0; localRef.current.dead = 0; sfx.pop();
  };
  const kick = (amount: number) => { squashV.current -= amount; };

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05), k = keys.current, group = playerRef.current;
    if (!group) return;
    const m = match.get(), soccer = m.mode === "futebol" && m.phase !== "lobby" && m.phase !== "vote";
    if (m.seq !== lastSeq.current) {
      lastSeq.current = m.seq;
      if (m.phase === "countdown" && soccer) {
        const ids = [playerId, ...remote.current.keys()].sort(), team = teamOf(playerId, ids), mates = ids.filter((id) => teamOf(id, ids) === team), j = mates.indexOf(playerId), side = team === "A" ? -1 : 1;
        respawn(0, 3); pos.current.set(side * 6, 3, (j - (mates.length - 1) / 2) * 2.6); yaw.current = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else if (m.phase === "countdown") { const ids = [playerId, ...remote.current.keys()].sort(), i = ids.indexOf(playerId); respawn((i / Math.max(2, ids.length)) * Math.PI * 2, 4); }
    }

    cooldown.current = Math.max(0, cooldown.current - dt); dashTimer.current = Math.max(0, dashTimer.current - dt); tackleTimer.current = Math.max(0, tackleTimer.current - dt); stunned.current = Math.max(0, stunned.current - dt); kickFx.current = Math.max(0, kickFx.current - dt);
    localRef.current.dash = dashTimer.current > 0 ? 1 : 0; localRef.current.vx = vel.current.x; localRef.current.vz = vel.current.z; localRef.current.kick = kickFx.current > 0 ? 1 : 0; localRef.current.tackle = tackleTimer.current > 0 ? 1 : 0;
    for (const [id, t] of hitCd.current) { if (t - dt <= 0) hitCd.current.delete(id); else hitCd.current.set(id, t - dt); }
    if (localRef.current.dead) { group.visible = false; hitQueue.length = 0; camTarget.set(0, 13, 16); camera.position.lerp(camTarget, 1 - Math.exp(-3 * dt)); camera.lookAt(0, 0, 0); return; }
    group.visible = true;

    if (!falling.current) {
      while (hitQueue.length) { const h = hitQueue.shift()!; vel.current.x += h.x * h.power; vel.current.z += h.z * h.power; hopV.current = h.dash ? 8 : 4; spin.current = (Math.random() - 0.5) * (h.dash ? 20 : 8); stunned.current = h.dash ? 0.45 : 0.2; shake.current = h.dash ? 0.7 : 0.3; kick(h.dash ? 10 : 6); sfx.boing(h.dash ? 1.2 : 0.9); if (h.dash) sfx.smack(); }
      const ix = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0), iz = (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) - (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0);
      const grounded = hopY.current <= 0.001, control = m.phase === "countdown" ? 0 : stunned.current > 0 ? 0.15 : grounded ? 1 : 0.35;
      if ((ix || iz) && m.phase !== "countdown") { tmp.set(ix, 0, iz).normalize(); vel.current.addScaledVector(tmp, (soccer ? SOAP_ACCEL : ACCEL) * control * dt); if (stunned.current === 0) yaw.current = Math.atan2(tmp.x, tmp.z); if (grounded) { stepT.current += dt; if (stepT.current > (soccer ? 0.13 : 0.18)) { stepT.current = 0; sfx.step(); hopV.current = soccer ? 1.7 : 2.2; } } }

      const space = k.has("Space"), pressedSpace = space && !lastSpace.current, shift = k.has("ShiftLeft") || k.has("ShiftRight"), pressedShift = shift && !lastShift.current;
      lastSpace.current = space; lastShift.current = shift;
      if (m.phase === "fight" && stunned.current === 0) {
        if (soccer && pressedShift && tackleTimer.current === 0) {
          tackleTimer.current = 0.38; dashTimer.current = 0.32; cooldown.current = 0.18; tmp.set(Math.sin(yaw.current), 0, Math.cos(yaw.current)); vel.current.addScaledVector(tmp, 10); hopV.current = 1.1; kick(13); shake.current = 0.3; sfx.whoosh();
        } else if (pressedSpace && cooldown.current === 0) {
          cooldown.current = soccer ? 0.42 : DASH_COOLDOWN; dashTimer.current = soccer ? 0.18 : DASH_TIME; tmp.set(Math.sin(yaw.current), 0, Math.cos(yaw.current));
          if (soccer) { vel.current.addScaledVector(tmp, 4.8); hopV.current = 3.4; kickFx.current = 0.24; kick(9); sfx.smack(); } else { vel.current.addScaledVector(tmp, DASH_SPEED); kick(-6); sfx.whoosh(); }
        }
      }

      for (const s of remote.current.values()) {
        if (s.out || s.dead) continue;
        tmp.set(pos.current.x - s.x, 0, pos.current.z - s.z); const d = tmp.length(), minD = PLAYER_R * 2 + 0.3;
        if (d > 0.001 && d < minD) { tmp.divideScalar(d); pos.current.addScaledVector(tmp, (minD - d) * 0.5); if (!hitCd.current.has(s.id) && m.phase !== "countdown") { hitCd.current.set(s.id, 0.22); const closing = Math.max(0, -vel.current.dot(tmp)), dashing = dashTimer.current > 0 || tackleTimer.current > 0, power = dashing ? DASH_PUSH * 0.9 : Math.max(PUSH * 0.7, closing * 1.8); net.hit({ to: s.id, from: playerId, x: -tmp.x, z: -tmp.z, power, dash: dashing ? 1 : 0 }); vel.current.addScaledVector(tmp, dashing ? 2.5 : 3.2); if (dashing) { dashTimer.current = 0; tackleTimer.current = 0; sfx.smack(); shake.current = 0.35; } kick(4); sfx.boing(0.7); } }
      }

      if (soccer) { const bx = pos.current.x - ball.x, bz = pos.current.z - ball.z, bd = Math.hypot(bx, bz), minB = BALL_R + PLAYER_R; if (bd > 0.001 && bd < minB) { pos.current.x += (bx / bd) * (minB - bd) * 0.6; pos.current.z += (bz / bd) * (minB - bd) * 0.6; } }
      const damp = Math.exp(-((soccer ? SOAP_DRAG : DRAG) * (grounded && stunned.current === 0 ? 1 : 0.9)) * dt); vel.current.multiplyScalar(dashTimer.current > 0 || tackleTimer.current > 0 ? Math.exp(-0.45 * dt) : damp);
      const speed = vel.current.length(), cap = dashTimer.current > 0 || tackleTimer.current > 0 ? 15 : (stunned.current > 0 ? DASH_PUSH : (soccer ? 11 : MAX_SPEED)); if (speed > cap) vel.current.multiplyScalar(cap / speed); pos.current.addScaledVector(vel.current, dt);
      hopV.current += GRAVITY * dt; hopY.current += hopV.current * dt; if (hopY.current <= 0) { if (hopV.current < -6) { kick(Math.min(10, -hopV.current * 0.6)); sfx.boing(0.5); } hopY.current = 0; hopV.current = 0; } pos.current.y = hopY.current;
      const r = Math.hypot(pos.current.x, pos.current.z), edge = THREE.MathUtils.clamp((r - (ARENA_R - 1.6)) / 1.4, 0, 1);
      if (soccer) { const lx = FIELD_X - PLAYER_R * 0.8, lz = FIELD_Z - PLAYER_R * 0.8; if (Math.abs(pos.current.x) > lx) { pos.current.x = Math.sign(pos.current.x) * lx; vel.current.x *= -0.7; kick(4); } if (Math.abs(pos.current.z) > lz) { pos.current.z = Math.sign(pos.current.z) * lz; vel.current.z *= -0.7; kick(4); } } else if (r > ARENA_R - 0.15 && hopY.current < 0.5) { falling.current = true; localRef.current.out = 1; vy.current = 5; spin.current = (Math.random() - 0.5) * 14; sfx.scream(); }
      const wob = edge * Math.sin(state.clock.elapsedTime * 22) * 0.35, tx = THREE.MathUtils.clamp(vel.current.z * 0.05, -0.5, 0.5) + wob, tz = THREE.MathUtils.clamp(-vel.current.x * 0.05, -0.5, 0.5) + wob; tiltX.current += (tx - tiltX.current) * (1 - Math.exp(-10 * dt)); tiltZ.current += (tz - tiltZ.current) * (1 - Math.exp(-10 * dt)); spin.current *= Math.exp(-4 * dt); yaw.current += spin.current * dt;
    } else { vy.current += GRAVITY * dt; pos.current.y += vy.current * dt; pos.current.addScaledVector(vel.current, dt); tiltZ.current += spin.current * dt; tiltX.current += spin.current * 0.6 * dt; if (pos.current.y < -13) { localRef.current.falls += 1; onFall(); sfx.splat(); if (match.get().phase === "fight") { localRef.current.dead = 1; pos.current.set(0, -40, 0); group.position.copy(pos.current); return; } respawn(); } }

    const stiff = 180; squashV.current += (-(squash.current - 1) * stiff - squashV.current * 9) * dt; squash.current += squashV.current * dt; const dashStretch = dashTimer.current > 0 || tackleTimer.current > 0 ? (soccer ? 0.2 : 0.25) : 0, sy = THREE.MathUtils.clamp(squash.current + dashStretch, 0.45, 1.8), sxz = 1 / Math.sqrt(sy);
    group.position.copy(pos.current); group.rotation.set(tiltX.current, yaw.current, tiltZ.current, "YXZ"); group.scale.set(sxz, sy, sxz);
    const fx = group.children.find((c) => c.userData.kickFx) as THREE.Mesh | undefined; if (fx) { const p = kickFx.current > 0 ? 1 - kickFx.current / 0.24 : 1; fx.visible = soccer && kickFx.current > 0; fx.scale.setScalar(0.7 + p * 2); (fx.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 * (1 - p)); }
    if (soccer) camTarget.set(pos.current.x * 0.5, 15, pos.current.z * 0.3 + 15); else camTarget.set(pos.current.x * 0.35, 11, pos.current.z * 0.35 + 14.5); camera.position.lerp(camTarget, 1 - Math.exp(-3 * dt)); shake.current = Math.max(0, shake.current - dt * 1.5); if (shake.current > 0) { const s = shake.current; camera.position.x += (Math.random() - 0.5) * s; camera.position.y += (Math.random() - 0.5) * s; } camera.lookAt(pos.current.x * 0.3, 1.4, Math.max(-20, pos.current.z * 0.3));
  });

  return <group ref={playerRef}><MyBlob /><mesh userData={{ kickFx: true }} position={[0, 0.8, 1]} rotation-x={-Math.PI / 2} visible={false}><ringGeometry args={[0.18, 0.42, 20]} /><meshBasicMaterial color="#fff6a8" transparent opacity={0.8} depthWrite={false} /></mesh></group>;
}

function MyBlob() { const m = useMatch(), soccer = m.mode === "futebol"; const color = soccer ? TEAMS[teamOf(playerId, net.ids.length ? net.ids : [playerId])].color : colorForId(playerId); return <Sumo key={color} color={color} seed={0} />; }
