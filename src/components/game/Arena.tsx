import { Environment, Lightformer, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ARENA_R, FIELD_X, FIELD_Z, GOAL_HALF, RACE_LANE_HALF, RACE_OBSTACLES, RACE_X_FINISH, RACE_X_MIN } from "./constants";
import { TEAMS, useMatch } from "./match";

function sandTexture() {
  const size = 256, canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#e7c98f"; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) { const x = Math.random() * size, y = Math.random() * size, shade = 200 + Math.random() * 55; ctx.fillStyle = `rgba(${shade},${shade - 30},${shade - 90},0.35)`; ctx.fillRect(x, y, 2, 2); }
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 4); return tex;
}

function Balloon({ angle, radius }: { angle: number; radius: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) { ref.current.position.y = 6 + Math.sin(clock.elapsedTime * 1.2 + angle * 3) * 0.5; ref.current.rotation.y = clock.elapsedTime * 0.4; } });
  return <group ref={ref} position={[Math.cos(angle) * radius, 6, Math.sin(angle) * radius]}><mesh castShadow><sphereGeometry args={[0.9, 16, 14]} /><meshStandardMaterial color={angle % 2 < 1 ? "#ff5d5d" : "#3ec5f0"} roughness={0.35} /></mesh><mesh position={[0, -1, 0]}><cylinderGeometry args={[0.02, 0.02, 1.6, 6]} /><meshStandardMaterial color="#5a4632" /></mesh></group>;
}

function soapTexture() {
  const size = 512, c = document.createElement("canvas"); c.width = c.height = size; const g = c.getContext("2d")!;
  g.fillStyle = "#bfe9ff"; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#aee0fb" : "#c9eeff"; g.fillRect((i * size) / 8, 0, size / 8, size); }
  for (let i = 0; i < 260; i++) { const x = Math.random() * size, y = Math.random() * size, r = 2 + Math.random() * 9; g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

function Goal({ side }: { side: 1 | -1 }) {
  const color = side > 0 ? TEAMS.B.color : TEAMS.A.color; const x = side * (FIELD_X + 1);
  return <group position={[x, 0, 0]}>{[-1, 1].map((s) => <mesh key={s} position={[-side, 1.3, s * GOAL_HALF]} castShadow><cylinderGeometry args={[0.18, 0.18, 2.6, 10]} /><meshStandardMaterial color={color} /></mesh>)}<mesh position={[-side, 2.6, 0]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.18, 0.18, GOAL_HALF * 2, 10]} /><meshStandardMaterial color={color} /></mesh><mesh position={[side * 0.2, 1.3, 0]}><boxGeometry args={[2, 2.6, GOAL_HALF * 2]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.25} wireframe /></mesh></group>;
}

function CrowdStand({ z }: { z: number }) {
  const colors = ["#ff5d5d", "#ffd23f", "#3ec5f0", "#42d17a", "#ff70b8", "#9b6cff"];
  return <group position={[0, 1.1, z]}>
    <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[FIELD_X * 2 + 7, 1.1, 2.2]} /><meshStandardMaterial color="#55466d" roughness={0.7} /></mesh>
    {Array.from({ length: 42 }, (_, i) => { const x = -FIELD_X - 2.5 + (i % 14) * 2; const row = Math.floor(i / 14); return <group key={i} position={[x, 0.9 + row * 0.72, 0]}><mesh><sphereGeometry args={[0.28, 12, 10]} /><meshStandardMaterial color={colors[i % colors.length]} /></mesh><mesh position={[0, -0.38, 0]}><capsuleGeometry args={[0.25, 0.45, 6, 8]} /><meshStandardMaterial color={colors[(i + 2) % colors.length]} /></mesh></group>; })}
    <Text position={[0, 2.85, 0]} fontSize={0.48} color="#ffffff" outlineWidth={0.04} outlineColor="#30233f" anchorX="center">BLOBÃO FC</Text>
  </group>;
}

function Field() {
  const soap = useMemo(() => soapTexture(), []); const W = FIELD_X * 2, D = FIELD_Z * 2;
  return <group>
    <mesh position={[0, -0.5, 0]} receiveShadow><boxGeometry args={[W + 4, 1, D + 1]} /><meshStandardMaterial map={soap} roughness={0.15} metalness={0.05} /></mesh>
    <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.2, D]} /><meshStandardMaterial color="#ffffff" /></mesh>
    <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[2.3, 2.55, 48]} /><meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} /></mesh>
    {[-1, 1].map((s) => <mesh key={"z" + s} position={[0, 0.4, s * (FIELD_Z + 0.4)]} rotation-z={Math.PI / 2} castShadow><capsuleGeometry args={[0.45, W + 2, 6, 12]} /><meshStandardMaterial color={s > 0 ? "#ff5d5d" : "#ffd23f"} roughness={0.4} /></mesh>)}
    {[-1, 1].map((s) => [-1, 1].map((t) => { const len = FIELD_Z - GOAL_HALF; return <mesh key={`x${s}${t}`} position={[s * (FIELD_X + 0.4), 0.4, t * (GOAL_HALF + len / 2)]} rotation-x={Math.PI / 2} castShadow><capsuleGeometry args={[0.45, len, 6, 12]} /><meshStandardMaterial color={s > 0 ? TEAMS.B.color : TEAMS.A.color} roughness={0.4} /></mesh>; }))}
    <Goal side={1} /><Goal side={-1} />
    <CrowdStand z={-(FIELD_Z + 2.2)} /><CrowdStand z={FIELD_Z + 2.2} />
    <mesh position={[0, -14, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[60, 48]} /><meshStandardMaterial color="#5cc26a" roughness={0.2} /></mesh>
  </group>;
}

function RaceTrack() {
  const stripe = useMemo(() => { const c = document.createElement("canvas"); c.width = 256; c.height = 64; const g = c.getContext("2d")!; g.fillStyle = "#f8f4e9"; g.fillRect(0, 0, 256, 64); g.fillStyle = "#242424"; for (let x = 0; x < 256; x += 32) for (let y = 0; y < 64; y += 32) if ((x / 32 + y / 32) % 2 === 0) g.fillRect(x, y, 32, 32); return new THREE.CanvasTexture(c); }, []);
  return <group><mesh position={[(RACE_X_MIN + RACE_X_FINISH) / 2, -0.55, 0]} receiveShadow><boxGeometry args={[RACE_X_FINISH - RACE_X_MIN + 4, 1, RACE_LANE_HALF * 2 + 2]} /><meshStandardMaterial color="#aee8f6" roughness={0.18} /></mesh><mesh position={[(RACE_X_MIN + RACE_X_FINISH) / 2, 0.01, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[RACE_X_FINISH - RACE_X_MIN, RACE_LANE_HALF * 2]} /><meshStandardMaterial color="#d7f5ff" roughness={0.12} /></mesh>{[-1, 1].map((s) => <mesh key={s} position={[(RACE_X_MIN + RACE_X_FINISH) / 2, 0.15, s * RACE_LANE_HALF]}><boxGeometry args={[RACE_X_FINISH - RACE_X_MIN + 2, 0.3, 0.18]} /><meshStandardMaterial color="#ff70b8" /></mesh>)}<mesh position={[RACE_X_FINISH, 1.4, 0]}><boxGeometry args={[0.22, 3, RACE_LANE_HALF * 2 + 0.8]} /><meshStandardMaterial map={stripe} /></mesh><mesh position={[RACE_X_FINISH - 0.15, 0.08, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.35, RACE_LANE_HALF * 2]} /><meshStandardMaterial map={stripe} /></mesh>{RACE_OBSTACLES.map((o, i) => <group key={i} position={[o.x, 0.35, o.z]}>{o.type === "soap" && <mesh rotation-x={-Math.PI / 2}><cylinderGeometry args={[o.r, o.r, 0.12, 32]} /><meshStandardMaterial color="#72dcff" transparent opacity={0.78} roughness={0.03} metalness={0.1} /></mesh>}{o.type === "bumper" && <mesh castShadow><sphereGeometry args={[o.r, 20, 16]} /><meshStandardMaterial color="#ff7a59" roughness={0.3} /></mesh>}{o.type === "banana" && <mesh rotation-z={0.55} castShadow><torusGeometry args={[o.r * 0.65, 0.16, 10, 24, Math.PI * 1.5]} /><meshStandardMaterial color="#ffd23f" /></mesh>}</group>)}<mesh position={[0, -14, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[60, 48]} /><meshStandardMaterial color="#5cc26a" roughness={0.2} /></mesh></group>;
}

export function Arena() {
  const sand = useMemo(() => sandTexture(), []); const { mode } = useMatch();
  return <group><Environment><Lightformer intensity={2.2} position={[0, 8, 0]} scale={[14, 14, 1]} /><Lightformer intensity={1.1} color="#ffd9a0" position={[-8, 3, 4]} rotation-y={Math.PI / 2} scale={[20, 4, 1]} /><Lightformer intensity={0.8} color="#9fd6ff" position={[8, 3, -4]} rotation-y={-Math.PI / 2} scale={[20, 4, 1]} /></Environment>{mode === "futebol" ? <Field /> : mode === "corrida" ? <RaceTrack /> : <><mesh position={[0, -0.5, 0]} receiveShadow castShadow><cylinderGeometry args={[ARENA_R, ARENA_R - 0.4, 1, 64]} /><meshStandardMaterial map={sand} roughness={0.95} /></mesh><mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[ARENA_R - 0.55, ARENA_R - 0.15, 64]} /><meshStandardMaterial color="#f5f0e2" roughness={0.9} side={THREE.DoubleSide} /></mesh><mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[1.6, 1.85, 48]} /><meshStandardMaterial color="#d9614f" roughness={0.9} side={THREE.DoubleSide} /></mesh><mesh position={[0, -3, 0]}><cylinderGeometry args={[ARENA_R + 0.6, ARENA_R + 1.6, 5, 48]} /><meshStandardMaterial color="#8d7a63" roughness={1} /></mesh><mesh position={[0, -14, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[60, 48]} /><meshStandardMaterial color="#5cc26a" roughness={0.2} metalness={0.1} /></mesh></>}{mode !== "corrida" && [0, 1.4, 2.8, 4.2].map((a) => <Balloon key={a} angle={a} radius={ARENA_R + 7} />)}</group>;
}
