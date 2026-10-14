import { Sumo } from "../Sumo";
import type { Mode } from "./match";

type VehicleKind = Extract<Mode, "carros" | "motos" | "kart">;

export function isVehicleMode(mode: Mode): mode is VehicleKind {
  return mode === "carros" || mode === "motos" || mode === "kart";
}

export function RaceVehicle({ mode, color, seed = 1 }: { mode: Mode; color: string; seed?: number }) {
  if (!isVehicleMode(mode)) return <Sumo color={color} seed={seed} />;
  const bike = mode === "motos";
  const kart = mode === "kart";
  const tire = (x: number, z: number, key: string) => (
    <mesh key={key} position={[x, 0.3, z]} rotation-z={Math.PI / 2} castShadow>
      <cylinderGeometry args={[bike ? 0.3 : 0.34, bike ? 0.3 : 0.34, 0.18, 16]} />
      <meshStandardMaterial color="#20212a" roughness={0.92} />
    </mesh>
  );
  return <group>
    {bike ? <>
      {tire(0, -0.72, "rear-wheel")}{tire(0, 0.76, "front-wheel")}
      <mesh position={[0, 0.58, 0]} castShadow><capsuleGeometry args={[0.2, 0.78, 5, 10]} /><meshStandardMaterial color={color} metalness={0.2} roughness={0.35} /></mesh>
      <mesh position={[0, 0.78, -0.22]} rotation-x={-0.18}><boxGeometry args={[0.5, 0.15, 0.42]} /><meshStandardMaterial color="#242331" /></mesh>
      <mesh position={[0, 0.94, 0.62]}><boxGeometry args={[0.72, 0.08, 0.12]} /><meshStandardMaterial color="#dbeafe" metalness={0.5} /></mesh>
      <mesh position={[0, 0.48, 0.18]}><sphereGeometry args={[0.14, 12, 10]} /><meshStandardMaterial color="#ffd166" emissive="#ff8a00" emissiveIntensity={0.3} /></mesh>
    </> : <>
      {tire(-0.72, -0.62, "rear-left")}{tire(0.72, -0.62, "rear-right")}{tire(-0.72, 0.62, "front-left")}{tire(0.72, 0.62, "front-right")}
      <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[kart ? 1.75 : 1.45, 0.38, kart ? 1.85 : 2.2]} /><meshStandardMaterial color={color} metalness={0.16} roughness={0.32} /></mesh>
      <mesh position={[0, 0.79, -0.2]} castShadow><boxGeometry args={[kart ? 0.85 : 0.72, 0.25, 0.8]} /><meshStandardMaterial color="#28283a" roughness={0.5} /></mesh>
      {!kart && <mesh position={[0, 0.91, 0.45]} castShadow><boxGeometry args={[1.1, 0.12, 0.45]} /><meshStandardMaterial color="#eaf6ff" metalness={0.35} /></mesh>}
      <mesh position={[0, 0.42, 0.92]} castShadow><boxGeometry args={[kart ? 2 : 1.35, 0.12, 0.18]} /><meshStandardMaterial color={kart ? "#ffd166" : "#20212a"} /></mesh>
      {kart && <mesh position={[0, 0.38, -0.96]}><boxGeometry args={[1.8, 0.12, 0.12]} /><meshStandardMaterial color="#20212a" /></mesh>}
    </>}
    <group position={[0, bike ? 0.95 : 0.96, bike ? -0.02 : -0.1]} scale={bike ? 0.66 : 0.72}><Sumo color={color} seed={seed} /></group>
  </group>;
}
