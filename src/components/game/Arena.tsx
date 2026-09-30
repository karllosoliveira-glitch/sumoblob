import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ARENA_R } from "./constants";

function sandTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e7c98f";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = 200 + Math.random() * 55;
    ctx.fillStyle = `rgba(${shade},${shade - 30},${shade - 90},0.35)`;
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function Balloon({ angle, radius }: { angle: number; radius: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = 6 + Math.sin(clock.elapsedTime * 1.2 + angle * 3) * 0.5;
      ref.current.rotation.y = clock.elapsedTime * 0.4;
    }
  });
  return (
    <group ref={ref} position={[Math.cos(angle) * radius, 6, Math.sin(angle) * radius]}>
      <mesh castShadow>
        <sphereGeometry args={[0.9, 16, 14]} />
        <meshStandardMaterial
          color={angle % 2 < 1 ? "#ff5d5d" : "#3ec5f0"}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, -1, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.6, 6]} />
        <meshStandardMaterial color="#5a4632" />
      </mesh>
    </group>
  );
}

export function Arena() {
  const sand = useMemo(() => sandTexture(), []);

  return (
    <group>
      <Environment>
        <Lightformer intensity={2.2} position={[0, 8, 0]} scale={[14, 14, 1]} />
        <Lightformer
          intensity={1.1}
          color="#ffd9a0"
          position={[-8, 3, 4]}
          rotation-y={Math.PI / 2}
          scale={[20, 4, 1]}
        />
        <Lightformer
          intensity={0.8}
          color="#9fd6ff"
          position={[8, 3, -4]}
          rotation-y={-Math.PI / 2}
          scale={[20, 4, 1]}
        />
      </Environment>

      {/* dohyo platform */}
      <mesh position={[0, -0.5, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[ARENA_R, ARENA_R - 0.4, 1, 64]} />
        <meshStandardMaterial map={sand} roughness={0.95} />
      </mesh>
      {/* painted ring */}
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[ARENA_R - 0.55, ARENA_R - 0.15, 64]} />
        <meshStandardMaterial color="#f5f0e2" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.6, 1.85, 48]} />
        <meshStandardMaterial color="#d9614f" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* stone skirt below the arena */}
      <mesh position={[0, -3, 0]}>
        <cylinderGeometry args={[ARENA_R + 0.6, ARENA_R + 1.6, 5, 48]} />
        <meshStandardMaterial color="#8d7a63" roughness={1} />
      </mesh>

      {/* goo pit far below */}
      <mesh position={[0, -14, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[60, 48]} />
        <meshStandardMaterial color="#5cc26a" roughness={0.2} metalness={0.1} />
      </mesh>

      {[0, 1.4, 2.8, 4.2].map((a) => (
        <Balloon key={a} angle={a} radius={ARENA_R + 3} />
      ))}
    </group>
  );
}
