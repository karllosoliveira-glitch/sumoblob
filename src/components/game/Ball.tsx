import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { NetState } from "@/hooks/useGameChannel";
import type { LocalState } from "./Player";
import { BALL_R, FIELD_X, FIELD_Z, GOAL_HALF, PLAYER_R } from "./constants";
import { ball, ballNet, match, net } from "./match";
import { sfx } from "./sfx";

function ballTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fffaf0";
  g.fillRect(0, 0, 256, 128);
  const cols = ["#ff5d5d", "#ffb02e", "#3ec5f0", "#42d17a"];
  for (let i = 0; i < 8; i++) {
    g.fillStyle = cols[i % 4]!;
    g.beginPath();
    g.arc(16 + i * 32, i % 2 ? 40 : 88, 13, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Ball({
  playerRef,
  localRef,
  remote,
}: {
  playerRef: React.RefObject<THREE.Group | null>;
  localRef: React.RefObject<LocalState>;
  remote: React.RefObject<Map<string, NetState>>;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => ballTexture(), []);
  const lastSeq = useRef(-1);
  const sendAcc = useRef(0);
  const hitCd = useRef(new Map<string, number>());
  const q = useMemo(() => new THREE.Quaternion(), []);
  const axis = useMemo(() => new THREE.Vector3(), []);

  const reset = () => {
    ball.x = ball.z = ball.vx = ball.vz = 0;
    ballNet.x = ballNet.z = ballNet.vx = ballNet.vz = 0;
  };

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const m = match.get();
    const mesh = ref.current;
    if (!mesh) return;
    mesh.visible = m.mode === "futebol" && m.phase !== "lobby" && m.phase !== "vote";
    if (!mesh.visible) return;

    if (m.seq !== lastSeq.current) {
      lastSeq.current = m.seq;
      if (m.phase === "countdown") reset();
    }

    const px = ball.x;
    const pz = ball.z;

    if (net.isHost) {
      for (const [id, t] of hitCd.current) {
        if (t - dt <= 0) hitCd.current.delete(id);
        else hitCd.current.set(id, t - dt);
      }
      const bodies: { id: string; x: number; z: number; dash: number }[] = [];
      const me = playerRef.current;
      if (me && !localRef.current.dead) bodies.push({ id: "me", x: me.position.x, z: me.position.z, dash: localRef.current.dash });
      for (const s of remote.current.values()) if (!s.out && !s.dead) bodies.push({ id: s.id, x: s.x, z: s.z, dash: s.dash });

      if (m.phase === "fight") {
        for (const b of bodies) {
          const dx = ball.x - b.x;
          const dz = ball.z - b.z;
          const d = Math.hypot(dx, dz);
          const minD = BALL_R + PLAYER_R;
          if (d > 0.001 && d < minD) {
            const nx = dx / d;
            const nz = dz / d;
            ball.x += nx * (minD - d);
            ball.z += nz * (minD - d);
            if (!hitCd.current.has(b.id)) {
              hitCd.current.set(b.id, 0.15);
              const power = b.dash ? 20 : 8;
              const along = ball.vx * nx + ball.vz * nz;
              if (along < power) {
                ball.vx += nx * (power - Math.max(0, along));
                ball.vz += nz * (power - Math.max(0, along));
              }
              sfx.boing(b.dash ? 1.1 : 0.6);
            }
          }
        }
      }

      const f = Math.exp(-0.45 * dt); // sabão: quase não para
      ball.vx *= f;
      ball.vz *= f;
      const sp = Math.hypot(ball.vx, ball.vz);
      if (sp > 26) {
        ball.vx *= 26 / sp;
        ball.vz *= 26 / sp;
      }
      ball.x += ball.vx * dt;
      ball.z += ball.vz * dt;

      // paredes laterais
      if (Math.abs(ball.z) > FIELD_Z - BALL_R) {
        ball.z = Math.sign(ball.z) * (FIELD_Z - BALL_R);
        ball.vz *= -0.85;
        sfx.boing(0.4);
      }
      // fundos e gols
      const inMouth = Math.abs(ball.z) < GOAL_HALF - BALL_R * 0.4;
      if (inMouth) {
        if (Math.abs(ball.x) > FIELD_X + 0.6 && m.phase === "fight") {
          net.goal(ball.x > 0 ? "A" : "B");
          sfx.splat();
          reset();
        } else if (Math.abs(ball.x) > FIELD_X + 1.6) {
          ball.x = Math.sign(ball.x) * (FIELD_X + 1.6);
          ball.vx *= -0.5;
        }
      } else if (Math.abs(ball.x) > FIELD_X - BALL_R) {
        ball.x = Math.sign(ball.x) * (FIELD_X - BALL_R);
        ball.vx *= -0.85;
        sfx.boing(0.4);
      }

      sendAcc.current += dt;
      if (sendAcc.current > 0.1) {
        sendAcc.current = 0;
        const r = (v: number) => Math.round(v * 100) / 100;
        net.ball({ x: r(ball.x), z: r(ball.z), vx: r(ball.vx), vz: r(ball.vz) });
      }
    } else {
      // previsão + correção suave rumo ao que o anfitrião mandou
      const age = Math.min(0.3, (performance.now() - ballNet.at) / 1000);
      const tx = ballNet.x + ballNet.vx * age;
      const tz = ballNet.z + ballNet.vz * age;
      const k = 1 - Math.exp(-10 * dt);
      if (Math.hypot(tx - ball.x, tz - ball.z) > 4) {
        ball.x = tx;
        ball.z = tz;
      } else {
        ball.x += (tx - ball.x) * k;
        ball.z += (tz - ball.z) * k;
      }
      ball.vx = ballNet.vx;
      ball.vz = ballNet.vz;
    }

    mesh.position.set(ball.x, BALL_R, ball.z);
    const mx = ball.x - px;
    const mz = ball.z - pz;
    const dist = Math.hypot(mx, mz);
    if (dist > 1e-5) {
      axis.set(mz, 0, -mx).normalize();
      q.setFromAxisAngle(axis, dist / BALL_R);
      mesh.quaternion.premultiply(q);
    }
  });

  return (
    <mesh ref={ref} castShadow visible={false}>
      <sphereGeometry args={[BALL_R, 24, 18]} />
      <meshStandardMaterial map={tex} roughness={0.3} />
    </mesh>
  );
}
