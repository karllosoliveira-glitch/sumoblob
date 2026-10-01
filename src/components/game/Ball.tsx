import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { NetState } from "@/hooks/useGameChannel";
import type { LocalState } from "./Player";
import { BALL_R, FIELD_X, FIELD_Z, GOAL_HALF, PLAYER_R } from "./constants";
import { ball, ballNet, match, net } from "./match";
import { sfx } from "./sfx";

function ballTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const g = c.getContext("2d")!; g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 256, 128);
  const cols = ["#ff5d5d", "#ffb02e", "#3ec5f0", "#42d17a"];
  for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 4]!; g.beginPath(); g.arc(16 + i * 32, i % 2 ? 40 : 88, 13, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function Ball({ playerRef, localRef, remote }: {
  playerRef: React.RefObject<THREE.Group | null>;
  localRef: React.RefObject<LocalState>;
  remote: React.RefObject<Map<string, NetState>>;
}) {
  const ref = useRef<THREE.Mesh>(null), tex = useMemo(() => ballTexture(), []);
  const lastSeq = useRef(-1), sendAcc = useRef(0), hitCd = useRef(new Map<string, number>());
  const q = useMemo(() => new THREE.Quaternion(), []), axis = useMemo(() => new THREE.Vector3(), []);
  const spin = useRef(0);

  const reset = () => { ball.x = ball.z = ball.vx = ball.vz = 0; ballNet.x = ballNet.z = ballNet.vx = ballNet.vz = 0; spin.current = 0; };

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), m = match.get(), mesh = ref.current;
    if (!mesh) return;
    mesh.visible = m.mode === "futebol" && m.phase !== "lobby" && m.phase !== "vote";
    if (!mesh.visible) return;
    if (m.seq !== lastSeq.current) { lastSeq.current = m.seq; if (m.phase === "countdown") reset(); }

    const px = ball.x, pz = ball.z;
    if (net.isHost) {
      for (const [id, t] of hitCd.current) { if (t - dt <= 0) hitCd.current.delete(id); else hitCd.current.set(id, t - dt); }
      const bodies: { id: string; x: number; z: number; dash: number; vx: number; vz: number }[] = [];
      const me = playerRef.current;
      if (me && !localRef.current.dead) bodies.push({ id: "me", x: me.position.x, z: me.position.z, dash: localRef.current.dash, vx: 0, vz: 0 });
      for (const s of remote.current.values()) if (!s.out && !s.dead) bodies.push({ id: s.id, x: s.x, z: s.z, dash: s.dash, vx: 0, vz: 0 });

      if (m.phase === "fight") {
        for (const b of bodies) {
          const dx = ball.x - b.x, dz = ball.z - b.z, d = Math.hypot(dx, dz), minD = BALL_R + PLAYER_R;
          if (d > 0.001 && d < minD) {
            const nx = dx / d, nz = dz / d;
            ball.x += nx * (minD - d); ball.z += nz * (minD - d);
            if (!hitCd.current.has(b.id)) {
              hitCd.current.set(b.id, b.dash ? 0.22 : 0.12);
              // Espaço = chute forte. Movimento normal = toque fraco e com bastante escorregão.
              const power = b.dash ? 23 : 7;
              const along = ball.vx * nx + ball.vz * nz;
              const kick = Math.max(0, power - along);
              ball.vx += nx * kick; ball.vz += nz * kick;
              // toque lateral gera uma curva engraçada na bola.
              const tangent = -ball.vx * nz + ball.vz * nx;
              spin.current += tangent * (b.dash ? 0.018 : 0.006);
              if (b.dash) { sfx.smack(); } else sfx.boing(0.6);
            }
          }
        }
      }

      // Física de bola de sabão: acelera, desliza muito e perde energia aos poucos.
      const f = Math.exp(-0.24 * dt);
      ball.vx *= f; ball.vz *= f;
      const sp = Math.hypot(ball.vx, ball.vz);
      if (sp > 30) { ball.vx *= 30 / sp; ball.vz *= 30 / sp; }
      ball.x += (ball.vx - ball.vz * spin.current * 0.025) * dt;
      ball.z += (ball.vz + ball.vx * spin.current * 0.025) * dt;
      spin.current *= Math.exp(-1.8 * dt);

      if (Math.abs(ball.z) > FIELD_Z - BALL_R) { ball.z = Math.sign(ball.z) * (FIELD_Z - BALL_R); ball.vz *= -0.88; spin.current *= -0.65; sfx.boing(0.4); }
      const inMouth = Math.abs(ball.z) < GOAL_HALF - BALL_R * 0.4;
      if (inMouth) {
        if (Math.abs(ball.x) > FIELD_X + 0.6 && m.phase === "fight") { net.goal(ball.x > 0 ? "A" : "B"); sfx.splat(); reset(); }
        else if (Math.abs(ball.x) > FIELD_X + 1.6) { ball.x = Math.sign(ball.x) * (FIELD_X + 1.6); ball.vx *= -0.5; }
      } else if (Math.abs(ball.x) > FIELD_X - BALL_R) { ball.x = Math.sign(ball.x) * (FIELD_X - BALL_R); ball.vx *= -0.85; sfx.boing(0.4); }

      sendAcc.current += dt;
      if (sendAcc.current > 0.06) { sendAcc.current = 0; const r = (v: number) => Math.round(v * 100) / 100; net.ball({ x: r(ball.x), z: r(ball.z), vx: r(ball.vx), vz: r(ball.vz) }); }
    } else {
      const age = Math.min(0.3, (performance.now() - ballNet.at) / 1000), tx = ballNet.x + ballNet.vx * age, tz = ballNet.z + ballNet.vz * age;
      const k = 1 - Math.exp(-14 * dt);
      if (Math.hypot(tx - ball.x, tz - ball.z) > 4) { ball.x = tx; ball.z = tz; } else { ball.x += (tx - ball.x) * k; ball.z += (tz - ball.z) * k; }
      ball.vx = ballNet.vx; ball.vz = ballNet.vz;
    }

    mesh.position.set(ball.x, BALL_R + Math.abs(Math.sin(performance.now() * 0.008 + ball.x)) * 0.04, ball.z);
    const mx = ball.x - px, mz = ball.z - pz, dist = Math.hypot(mx, mz);
    if (dist > 1e-5) { axis.set(mz, 0, -mx).normalize(); q.setFromAxisAngle(axis, dist / BALL_R); mesh.quaternion.premultiply(q); }
  });

  return <mesh ref={ref} castShadow visible={false}><sphereGeometry args={[BALL_R, 24, 18]} /><meshStandardMaterial map={tex} roughness={0.3} /></mesh>;
}
