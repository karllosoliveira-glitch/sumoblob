import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const palette = ["#ff5d5d", "#ffb02e", "#42d17a", "#3ec5f0", "#ff7ad9", "#c6f34a", "#ff9a3c", "#7c8cff"];
  return palette[hash % palette.length]!;
}

type Props = { color: string; /** phase offset so everyone wobbles differently */ seed?: number };

/** Animated, lightweight blob model. Animation follows the avatar's world movement. */
export function Sumo({ color, seed = 0 }: Props) {
  const body = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const previousWorld = useRef(new THREE.Vector3());
  const world = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  const gait = useRef(0);
  const impact = useRef(0);
  const previousVerticalSpeed = useRef(0);
  const skin = useMemo(() => new THREE.Color(color), [color]);
  const dark = useMemo(() => new THREE.Color(color).multiplyScalar(0.7), [color]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime + seed;
    // Read the enclosing avatar's world position; works for local and remote players.
    const root = body.current?.parent?.parent;
    let speed = 0;
    let verticalSpeed = 0;
    if (root) {
      root.getWorldPosition(world.current);
      if (initialized.current && dt > 0) {
        const dx = world.current.x - previousWorld.current.x;
        const dy = world.current.y - previousWorld.current.y;
        const dz = world.current.z - previousWorld.current.z;
        speed = Math.hypot(dx, dz) / dt;
        verticalSpeed = dy / dt;
        // Trigger squash on landing, not continuously while jumping/falling.
        if (previousVerticalSpeed.current < -3 && Math.abs(verticalSpeed) < 1.5) impact.current = 1;
        previousVerticalSpeed.current = verticalSpeed;
        impact.current = Math.max(0, impact.current - dt * 2.8);
      } else initialized.current = true;
      previousWorld.current.copy(world.current);
    }
    const moving = THREE.MathUtils.clamp(speed / 7, 0, 1);
    gait.current += dt * (5 + Math.min(speed, 10) * 1.5);
    const stride = Math.sin(gait.current) * moving;
    const bob = Math.abs(Math.sin(gait.current)) * 0.09 * moving;
    const breathing = Math.sin(t * 3.2) * 0.025;
    const landingSquash = impact.current * 0.16;
    if (body.current) {
      const sy = 1 + breathing + bob - landingSquash;
      body.current.scale.set(1 / Math.sqrt(Math.max(0.65, sy)), sy, 1 / Math.sqrt(Math.max(0.65, sy)));
      body.current.rotation.z = Math.sin(t * 2.5) * 0.035 + stride * 0.09;
      body.current.rotation.x = THREE.MathUtils.clamp(-verticalSpeed * 0.025, -0.22, 0.22);
    }
    const idleFlap = Math.sin(t * 4.2) * 0.12;
    const runFlap = stride * 0.72;
    if (armL.current) armL.current.rotation.z = 0.35 + idleFlap + runFlap;
    if (armR.current) armR.current.rotation.z = -0.35 - idleFlap - runFlap;
    if (legL.current) legL.current.rotation.x = stride * 0.65;
    if (legR.current) legR.current.rotation.x = -stride * 0.65;
    const wobble = Math.sin(t * 8) * 0.018;
    if (eyeL.current) eyeL.current.position.y = 0.62 + wobble + bob * 0.2;
    if (eyeR.current) eyeR.current.position.y = 0.62 - wobble + bob * 0.2;
  });

  return (
    <group scale={1.4}>
      <group ref={body}>
        <mesh castShadow position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.62, 24, 18]} />
          <meshStandardMaterial color={skin} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[0, 1.15, 0]}>
          <sphereGeometry args={[0.34, 20, 16]} />
          <meshStandardMaterial color={skin} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.12, 12, 10]} />
          <meshStandardMaterial color="#2b2119" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.34, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.55, 0.11, 10, 24]} />
          <meshStandardMaterial color="#fff2d0" roughness={0.8} />
        </mesh>
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
        <group ref={legL} position={[0.24, 0.12, 0.1]}>
          <mesh castShadow><sphereGeometry args={[0.17, 12, 10]} /><meshStandardMaterial color={dark} roughness={0.7} /></mesh>
        </group>
        <group ref={legR} position={[-0.24, 0.12, 0.1]}>
          <mesh castShadow><sphereGeometry args={[0.17, 12, 10]} /><meshStandardMaterial color={dark} roughness={0.7} /></mesh>
        </group>
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
        <mesh position={[0, 0.38, 0.6]} rotation-x={0.2}>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshStandardMaterial color="#6d1f2a" />
        </mesh>
      </group>
    </group>
  );
}
