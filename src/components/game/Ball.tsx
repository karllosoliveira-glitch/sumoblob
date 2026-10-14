import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playerId, type NetState } from "@/hooks/useGameChannel";
import type { LocalState } from "./Player";
import { BALL_R, KICK_POWER, PLAYER_R } from "./constants";
import { ball, ballNet, hitQueue, match, net } from "./match";
import { sfx } from "./sfx";
import { getSoccerPhysics, type SoccerPhysics, type SoccerBody } from "./rapier";

function ballTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 256, 128);
    const cols = ["#ff5d5d", "#ffb02e", "#3ec5f0", "#42d17a"];
    for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 4] ?? cols[0] ?? "#ff5d5d"; g.beginPath(); g.arc(16 + i * 32, i % 2 ? 40 : 88, 13, 0, Math.PI * 2); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function Ball({ playerRef, localRef, remote }: { playerRef: React.RefObject<THREE.Group | null>; localRef: React.RefObject<LocalState>; remote: React.RefObject<Map<string, NetState>> }) {
  const ref = useRef<THREE.Mesh>(null), tex = useMemo(ballTexture, []);
  const rapier = useRef<SoccerPhysics | null>(null), lastSeq = useRef(-1), wasHost = useRef(false);
  const kicks = useRef(new Map<string, number>()), tackles = useRef(new Map<string, boolean>()), hitCd = useRef(new Map<string, number>());
  const sendAcc = useRef(0), lastSend = useRef(-1), lastPayload = useRef("");
  const visualPos = useRef(new THREE.Vector3(0, BALL_R, 0)), target = useMemo(() => new THREE.Vector3(), []);
  const axis = useMemo(() => new THREE.Vector3(), []), q = useMemo(() => new THREE.Quaternion(), []);
  useEffect(() => { let alive = true; getSoccerPhysics().then(p => { if (alive) { p.resetBall(); rapier.current = p; } }); return () => { alive = false; tex.dispose(); }; }, [tex]);

  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05), m = match.get(), mesh = ref.current, p = rapier.current;
    if (!mesh) return;
    mesh.visible = m.mode === "futebol" && m.phase !== "lobby" && m.phase !== "vote";
    if (!mesh.visible) return;
    if (m.seq !== lastSeq.current) {
      lastSeq.current = m.seq;
      if (m.phase === "countdown") {
        p?.resetBall(); Object.assign(ball, { x: 0, y: BALL_R, z: 0, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 });
        ballNet.fresh = false; visualPos.current.set(0, BALL_R, 0); kicks.current.clear(); tackles.current.clear(); lastPayload.current = "";
      }
    }
    if (net.isHost && !wasHost.current && p) {
      p.resetBall(ball.x, ball.z, ball.y); p.ballBody.setLinvel({ x: ball.vx, y: ball.vy, z: ball.vz }, true);
    }
    wasHost.current = net.isHost;
    if (net.isHost && p) {
      if (m.phase === "fight") {
        const bodies: SoccerBody[] = [];
        const me = playerRef.current, local = localRef.current;
        if (me && !local.dead) bodies.push({ id: playerId, x: local.x ?? me.position.x, z: local.z ?? me.position.z, y: local.y ?? me.position.y, ry: local.ry ?? me.rotation.y, vx: local.vx, vz: local.vz, kick: local.kick, kickSeq: local.kickSeq ?? 0, tackle: local.tackle });
        for (const s of remote.current.values()) if (!s.out && !s.dead) bodies.push({ ...s, vx: s.vx ?? 0, vz: s.vz ?? 0, kick: s.kick ?? 0, kickSeq: s.kickSeq ?? 0, tackle: s.tackle ?? 0 });
        for (const b of bodies) {
          const dx = ball.x - b.x, dz = ball.z - b.z, distance = Math.hypot(dx, dz);
          const near = distance < BALL_R + PLAYER_R + 0.65 && Math.abs(ball.y - (b.y + PLAYER_R)) < BALL_R + PLAYER_R;
          const forwardX = Math.sin(b.ry), forwardZ = Math.cos(b.ry);
          const facing = distance < 0.01 || (dx * forwardX + dz * forwardZ) / distance > 0.25;
          if (b.kick > 0 && b.kickSeq !== kicks.current.get(b.id)) {
            kicks.current.set(b.id, b.kickSeq);
            if (near && facing) { const charge = Math.min(1, Math.max(0.2, b.kick)); p.kickBall(forwardX, forwardZ, 7 + (KICK_POWER - 7) * charge, 0.6 + charge * charge * 4.4, (b.vx * forwardZ - b.vz * forwardX) * 0.45); sfx.kick(); }
          }
          const tackling = b.tackle > 0;
          if (tackling && !tackles.current.get(b.id) && near && facing) { p.kickBall(forwardX, forwardZ, 11, 0.7); sfx.whoosh(); }
          tackles.current.set(b.id, tackling);
          if (near && distance > 0.01) {
            const incoming = -(ball.vx * dx + ball.vz * dz) / distance;
            if (incoming > 10 && clock.elapsedTime - (hitCd.current.get(b.id) ?? -10) > 0.5) {
              hitCd.current.set(b.id, clock.elapsedTime);
              const h = { from: "ball", x: -dx / distance, z: -dz / distance, power: Math.min(6, incoming * 0.22), dash: 0 };
              if (b.id === playerId) hitQueue.push(h); else net.hit({ ...h, to: b.id });
            }
          }
        }
        p.syncPlayers(bodies, dt); p.step(dt); Object.assign(ball, p.ballState());
        if (p.isBallInsideGoal("A") || p.isBallInsideGoal("B")) { net.goal(ball.x > 0 ? "A" : "B"); p.resetBall(); Object.assign(ball, p.ballState()); sfx.splat(); }
        if (ball.y < -3 || ball.y > 20 || Math.abs(ball.x) > 18 || Math.abs(ball.z) > 12) { p.resetBall(); Object.assign(ball, p.ballState()); }
      }
      sendAcc.current += dt;
      if (sendAcc.current >= 1 / 8 && !document.hidden) {
        sendAcc.current = 0;
        const r = (v: number) => Math.round(v * 100) / 100;
        const payload = { x: r(ball.x), y: r(ball.y), z: r(ball.z), vx: r(ball.vx), vy: r(ball.vy), vz: r(ball.vz), wx: r(ball.wx), wy: r(ball.wy), wz: r(ball.wz), matchSeq: m.seq };
        const serialized = JSON.stringify(payload);
        if (serialized !== lastPayload.current || clock.elapsedTime - lastSend.current > 1) { net.ball(payload); lastPayload.current = serialized; lastSend.current = clock.elapsedTime; }
      }
    } else if (!net.isHost && ballNet.fresh) {
      // Follow authoritative snapshots, including height, rather than inventing repeated bounces.
      const k = 1 - Math.exp(-12 * dt);
      for (const key of ["x", "y", "z"] as const) ball[key] += (ballNet[key] - ball[key]) * k;
      ball.vx = ballNet.vx; ball.vy = ballNet.vy; ball.vz = ballNet.vz;
      ball.wx = ballNet.wx; ball.wy = ballNet.wy; ball.wz = ballNet.wz;
    }
    target.set(ball.x, ball.y, ball.z);
    visualPos.current.lerp(target, 1 - Math.exp(-28 * dt)); mesh.position.copy(visualPos.current);
    axis.set(ball.wx, ball.wy, ball.wz); const speed = axis.length();
    if (speed > 0.01) { axis.divideScalar(speed); q.setFromAxisAngle(axis, speed * dt); mesh.quaternion.premultiply(q); }
  });
  return <mesh ref={ref} castShadow visible={false}><sphereGeometry args={[BALL_R, 24, 18]} /><meshStandardMaterial map={tex} roughness={0.3} /></mesh>;
}
