import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const palette = [
    "#ff5d5d",
    "#ffb02e",
    "#42d17a",
    "#3ec5f0",
    "#ff7ad9",
    "#c6f34a",
    "#ff9a3c",
    "#7c8cff",
  ];
  return palette[hash % palette.length]!;
}

type Props = {
  color: string;
  /** phase offset so everyone wobbles differently */
  seed?: number;
};

/**
 * A deliberately goofy blob wrestler: jiggly belly, flappy noodle arms,
 * googly eyes and a tiny topknot. Stylized on purpose, no realism wanted.
 */
export function Sumo({ color, seed = 0 }: Props) {
  const body = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);

  const skin = useMemo(() => new THREE.Color(color), [color]);
  const dark = useMemo(() => new THREE.Color(color).multiplyScalar(0.7), [color]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    if (body.current) {
      const squash = 1 + Math.sin(t * 6) * 0.06;
      body.current.scale.set(1 / squash, squash, 1 / squash);
      body.current.rotation.z = Math.sin(t * 3) * 0.06;
    }
    const flap = Math.sin(t * 9) * 0.7;
    if (armL.current) armL.current.rotation.z = 0.5 + flap;
    if (armR.current) armR.current.rotation.z = -0.5 - flap;
    const wobble = Math.sin(t * 11) * 0.03;
    if (eyeL.current) eyeL.current.position.y = 0.62 + wobble;
    if (eyeR.current) eyeR.current.position.y = 0.62 - wobble;
  });

  return (
    <group ref={body}>
      {/* belly */}
      <mesh castShadow position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.62, 24, 18]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>
      {/* head lump */}
      <mesh castShadow position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.34, 20, 16]} />
        <meshStandardMaterial color={skin} roughness={0.5} />
      </mesh>
      {/* topknot */}
      <mesh castShadow position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color="#2b2119" roughness={0.9} />
      </mesh>
      {/* belt */}
      <mesh position={[0, 0.34, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.55, 0.11, 10, 24]} />
        <meshStandardMaterial color="#fff2d0" roughness={0.8} />
      </mesh>
      {/* noodle arms */}
      <group ref={armL} position={[0.55, 0.75, 0]}>
        <mesh castShadow position={[0.3, 0, 0]} rotation-z={Math.PI / 2}>
          <capsuleGeometry args={[0.12, 0.5, 4, 10]} />
          <meshStandardMaterial color={dark} roughness={0.6} />
        </mesh>
      </group>
      <group ref={armR} position={[-0.55, 0.75, 0]}>
        <mesh castShadow position={[-0.3, 0, 0]} rotation-z={Math.PI / 2}>
          <capsuleGeometry args={[0.12, 0.5, 4, 10]} />
          <meshStandardMaterial color={dark} roughness={0.6} />
        </mesh>
      </group>
      {/* stubby legs */}
      <mesh castShadow position={[0.24, 0.12, 0.1]}>
        <sphereGeometry args={[0.17, 12, 10]} />
        <meshStandardMaterial color={dark} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.24, 0.12, 0.1]}>
        <sphereGeometry args={[0.17, 12, 10]} />
        <meshStandardMaterial color={dark} roughness={0.7} />
      </mesh>
      {/* googly eyes */}
      <mesh ref={eyeL} position={[0.14, 0.62, 0.58]}>
        <sphereGeometry args={[0.13, 14, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh ref={eyeR} position={[-0.14, 0.62, 0.58]}>
        <sphereGeometry args={[0.13, 14, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={[0.15, 0.62, 0.69]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      <mesh position={[-0.15, 0.62, 0.69]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      {/* silly mouth */}
      <mesh position={[0, 0.38, 0.6]} rotation-x={0.2}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshStandardMaterial color="#6d1f2a" />
      </mesh>
    </group>
  );
}
