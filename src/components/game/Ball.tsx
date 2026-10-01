import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { NetState } from "@/hooks/useGameChannel";
import type { LocalState } from "./Player";
import { BALL_BOUNCE, BALL_MAX_SPEED, BALL_R, BALL_ROLL_DRAG, FIELD_X, FIELD_Z, GOAL_HALF, KICK_POWER, KICK_SPIN, PLAYER_R } from "./constants";
import { ball, ballNet, hitQueue, match, net } from "./match";
import { playerId } from "@/hooks/useGameChannel";
import { sfx } from "./sfx";

function ballTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d")!; g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 256, 128);
  const cols = ["#ff5d5d", "#ffb02e", "#3ec5f0", "#42d17a"]; for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 4]!; g.beginPath(); g.arc(16 + i * 32, i % 2 ? 40 : 88, 13, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function Ball({ playerRef, localRef, remote }: { playerRef: React.RefObject<THREE.Group | null>; localRef: React.RefObject<LocalState>; remote: React.RefObject<Map<string, NetState>> }) {
  const ref = useRef<THREE.Mesh>(null), tex = useMemo(() => ballTexture(), []);
  const lastSeq = useRef(-1), sendAcc = useRef(0), hitCd = useRef(new Map<string, number>()), q = useMemo(() => new THREE.Quaternion(), []), axis = useMemo(() => new THREE.Vector3(), []);
  const spin = useRef(0), height = useRef(BALL_R), vy = useRef(0), lastKick = useRef(0);
  const reset = () => { ball.x = ball.z = ball.vx = ball.vz = 0; ballNet.x = ballNet.z = ballNet.vx = ballNet.vz = 0; spin.current = 0; height.current = BALL_R; vy.current = 0; };

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), m = match.get(), mesh = ref.current; if (!mesh) return;
    mesh.visible = m.mode === "futebol" && m.phase !== "lobby" && m.phase !== "vote"; if (!mesh.visible) return;
    if (m.seq !== lastSeq.current) { lastSeq.current = m.seq; if (m.phase === "countdown") reset(); }
    const px = ball.x, pz = ball.z;
    if (net.isHost) {
      for (const [id, t] of hitCd.current) { if (t - dt <= 0) hitCd.current.delete(id); else hitCd.current.set(id, t - dt); }
      lastKick.current = Math.max(0, lastKick.current - dt);
      const bodies: { id: string; x: number; z: number; vx: number; vz: number; dash: number; tackle: number; kick: number }[] = [];
      const me = playerRef.current;
      if (me && !localRef.current.dead) bodies.push({ id: "me", x: me.position.x, z: me.position.z, vx: localRef.current.vx, vz: localRef.current.vz, dash: localRef.current.dash, tackle: localRef.current.tackle, kick: localRef.current.kick });
      for (const s of remote.current.values()) if (!s.out && !s.dead) bodies.push({ id: s.id, x: s.x, z: s.z, vx: (s.vx??0), vz: (s.vz??0), dash: s.dash, tackle: s.tackle ?? 0, kick: s.kick ?? 0 });

      if (m.phase === "fight") for (const b of bodies) {
        const dx = ball.x - b.x, dz = ball.z - b.z, d = Math.hypot(dx, dz), minD = BALL_R + PLAYER_R;
        if (d <= 0.001 || d >= minD) continue;
        const nx = dx / d, nz = dz / d;
        ball.x += nx * (minD - d) * 0.92; ball.z += nz * (minD - d) * 0.92;
        // Bolada: bola rápida vindo na direção do blob empurra ele (antes de trocar a velocidade).
        const relIn = -(ball.vx * nx + ball.vz * nz) + (b.vx * nx + b.vz * nz);
        if (relIn > 9 && !hitCd.current.has("bolada" + b.id)) {
          hitCd.current.set("bolada" + b.id, 0.4);
          const power = Math.min(22, relIn * 0.9);
          if (b.id === "me") hitQueue.push({ from: "ball", x: -nx, z: -nz, power, dash: relIn > 16 ? 1 : 0 });
          else net.hit({ to: b.id, from: playerId, x: -nx, z: -nz, power, dash: relIn > 16 ? 1 : 0 });
          sfx.smack();
        }
        const closing = b.vx * nx + b.vz * nz;
        const movingIntoBall = Math.max(0, closing);
        const tackling = b.tackle > 0 || b.dash > 0;
        const kicking = b.kick > 0;
        const cooldown = kicking ? 0.18 : tackling ? 0.12 : 0.07;
        if (!hitCd.current.has(b.id)) {
          hitCd.current.set(b.id, cooldown);
          // Controle fino: tocar a bola acompanha a velocidade do blob. Isso permite conduzir/driblar.
          const carry = Math.min(10, Math.max(0, movingIntoBall)) * 0.9;
          ball.vx += b.vx * 0.72 + nx * carry;
          ball.vz += b.vz * 0.72 + nz * carry;
          if (kicking || tackling) {
            const power = kicking ? KICK_POWER : 18;
            ball.vx += nx * power; ball.vz += nz * power;
            vy.current = kicking ? 5.2 : 2.2;
            spin.current += (-nz * b.vx + nx * b.vz) * KICK_SPIN;
            lastKick.current = 0.16;
            if (kicking) sfx.kick(); else sfx.whoosh();
            // Carrinho rouba: a bola sai na direção do carrinho, não de onde veio.
            if (tackling && !kicking) { const sp = Math.hypot(b.vx, b.vz) || 1; ball.vx = (b.vx / sp) * 16; ball.vz = (b.vz / sp) * 16; }
          } else sfx.boing(0.45);
        }
      }

      const f = Math.exp(-BALL_ROLL_DRAG * dt); ball.vx *= f; ball.vz *= f;
      if (height.current > BALL_R + 0.001 || vy.current !== 0) { vy.current -= 22 * dt; height.current += vy.current * dt; if (height.current <= BALL_R) { if (vy.current < -4) { vy.current = -vy.current * 0.55; sfx.boing(0.35); } else vy.current = 0; height.current = BALL_R; } }
      ball.x += (ball.vx - ball.vz * spin.current * 0.025) * dt; ball.z += (ball.vz + ball.vx * spin.current * 0.025) * dt; spin.current *= Math.exp(-1.5 * dt);
      const sp = Math.hypot(ball.vx, ball.vz); if (sp > BALL_MAX_SPEED) { ball.vx *= BALL_MAX_SPEED / sp; ball.vz *= BALL_MAX_SPEED / sp; }
      if (Math.abs(ball.z) > FIELD_Z - BALL_R) { ball.z = Math.sign(ball.z) * (FIELD_Z - BALL_R); ball.vz *= -BALL_BOUNCE; spin.current *= -0.7; sfx.boing(0.4); }
      const inMouth = Math.abs(ball.z) < GOAL_HALF - BALL_R * 0.4;
      if (inMouth) { if (Math.abs(ball.x) > FIELD_X + 0.6 && m.phase === "fight") { net.goal(ball.x > 0 ? "A" : "B"); sfx.splat(); reset(); } else if (Math.abs(ball.x) > FIELD_X + 1.6) { ball.x = Math.sign(ball.x) * (FIELD_X + 1.6); ball.vx *= -0.5; } }
      else if (Math.abs(ball.x) > FIELD_X - BALL_R) { ball.x = Math.sign(ball.x) * (FIELD_X - BALL_R); ball.vx *= -BALL_BOUNCE; sfx.boing(0.4); }
      sendAcc.current += dt; if (sendAcc.current > 0.05) { sendAcc.current = 0; const r = (v: number) => Math.round(v * 100) / 100; net.ball({ x: r(ball.x), z: r(ball.z), vx: r(ball.vx), vz: r(ball.vz) }); }
    } else {
      const age = Math.min(0.3, (performance.now() - ballNet.at) / 1000), tx = ballNet.x + ballNet.vx * age, tz = ballNet.z + ballNet.vz * age, k = 1 - Math.exp(-16 * dt);
      if (Math.hypot(tx - ball.x, tz - ball.z) > 4) { ball.x = tx; ball.z = tz; } else { ball.x += (tx - ball.x) * k; ball.z += (tz - ball.z) * k; } ball.vx = ballNet.vx; ball.vz = ballNet.vz;
    }
    mesh.position.set(ball.x, height.current, ball.z);
    const mx = ball.x - px, mz = ball.z - pz, dist = Math.hypot(mx, mz); if (dist > 1e-5) { axis.set(mz, 0, -mx).normalize(); q.setFromAxisAngle(axis, dist / BALL_R); mesh.quaternion.premultiply(q); }
    if (lastKick.current > 0) mesh.scale.setScalar(1 + Math.sin(lastKick.current * 45) * 0.08);
    else mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-12 * dt));
  });
  return <mesh ref={ref} castShadow visible={false}><sphereGeometry args={[BALL_R, 24, 18]} /><meshStandardMaterial map={tex} roughness={0.3} /></mesh>;
}
