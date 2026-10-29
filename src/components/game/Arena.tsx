import { Environment, Lightformer, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import {
  ARENA_R,
  FIELD_X,
  FIELD_Z,
  GOAL_HALF,
  obstacleState,
  worldTime,
  type RaceObstacle as RaceObstacleT,
} from "./constants";
import { CircuitTrack } from "./CircuitTrack";
import {
  CIRCUIT_HALF_WIDTH,
  circuitObstacles,
  getCircuit,
} from "./raceCircuit";
import { isRaceMode, TEAMS, fx, useMatch } from "./match";

function sandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Não foi possível criar a textura de areia.");
  }

  context.fillStyle = "#e7c98f";
  context.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const shade = 200 + Math.random() * 55;

    context.fillStyle = `rgba(${shade},${shade - 30},${shade - 90},.35)`;
    context.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);

  return texture;
}

function soapTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Não foi possível criar a textura do campo.");
  }

  context.fillStyle = "#bfe9ff";
  context.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 8; i++) {
    context.fillStyle = i % 2 ? "#aee0fb" : "#c9eeff";
    context.fillRect(i * 64, 0, 64, 512);
  }

  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = 2 + Math.random() * 9;

    context.strokeStyle = "rgba(255,255,255,.8)";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function useCanvasTexture(
  createTexture: () => THREE.CanvasTexture,
): THREE.CanvasTexture | null {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const nextTexture = createTexture();
    setTexture(nextTexture);

    return () => {
      nextTexture.dispose();
    };
  }, [createTexture]);

  return texture;
}

function Balloon({
  angle,
  radius,
}: {
  angle: number;
  radius: number;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const group = ref.current;

    if (!group) return;

    group.position.y =
      6 + Math.sin(clock.elapsedTime * 1.2 + angle * 3) * 0.5;

    group.rotation.y = clock.elapsedTime * 0.4;
  });

  return (
    <group
      ref={ref}
      position={[
        Math.cos(angle) * radius,
        6,
        Math.sin(angle) * radius,
      ]}
    >
      <mesh castShadow>
        <sphereGeometry args={[0.9, 16, 14]} />
        <meshStandardMaterial
          color={angle % 2 < 1 ? "#ff5d5d" : "#3ec5f0"}
        />
      </mesh>

      <mesh position={[0, -1, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.6, 6]} />
        <meshStandardMaterial color="#5a4632" />
      </mesh>
    </group>
  );
}

function Goal({ side }: { side: 1 | -1 }) {
  const color = side > 0 ? TEAMS.B.color : TEAMS.A.color;
  const x = side * (FIELD_X + 1);

  return (
    <group position={[x, 0, 0]}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[-side, 1.3, s * GOAL_HALF]}
        >
          <cylinderGeometry args={[0.18, 0.18, 2.6, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}

      <mesh position={[-side, 2.6, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.18, 0.18, GOAL_HALF * 2, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[side * 0.2, 1.3, 0]}>
        <boxGeometry args={[2, 2.6, GOAL_HALF * 2]} />
        <meshStandardMaterial
          color="#fff"
          transparent
          opacity={0.25}
          wireframe
        />
      </mesh>
    </group>
  );
}

function CrowdStand({ z }: { z: number }) {
  const colors = [
    "#ff5d5d",
    "#ffd23f",
    "#3ec5f0",
    "#42d17a",
    "#ff70b8",
    "#ff9a3c",
  ];

  const fans = useRef<(THREE.Group | null)[]>([]);
  const flags = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const sinceGoal = (performance.now() - fx.goalAt) / 1000;
    const celebration = sinceGoal < 4 ? 1 - sinceGoal / 4 : 0;

    fans.current.forEach((fan, i) => {
      if (!fan) return;

      const jump =
        celebration * Math.abs(Math.sin(time * 9 + i * 1.3)) * 0.9;

      const idle = Math.abs(Math.sin(time * 2.2 + i * 0.7)) * 0.08;

      fan.position.y =
        0.9 + Math.floor(i / 14) * 0.72 + jump + idle;

      fan.rotation.z =
        Math.sin(time * 3 + i) * (0.08 + celebration * 0.3);
    });

    flags.current.forEach((flag, i) => {
      if (!flag) return;

      flag.rotation.z =
        Math.sin(time * (3 + celebration * 6) + i * 2) *
        (0.35 + celebration * 0.5);
    });
  });

  return (
    <group position={[0, 1.1, z]}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[FIELD_X * 2 + 7, 1.1, 2.2]} />
        <meshStandardMaterial color="#55466d" />
      </mesh>

      {Array.from({ length: 42 }, (_, i) => {
        const x = -FIELD_X - 2.5 + (i % 14) * 2;

        return (
          <group
            key={i}
            ref={(group) => {
              fans.current[i] = group;
            }}
            position={[
              x + Math.floor(i / 14),
              0.9 + Math.floor(i / 14) * 0.72,
              Math.sign(z) * Math.floor(i / 14) * 0.75,
            ]}
          >
            <mesh>
              <sphereGeometry args={[0.28, 10, 8]} />
              <meshStandardMaterial color={colors[i % colors.length] ?? "#ff5d5d"} />
            </mesh>

            <mesh position={[0, -0.38, 0]}>
              <capsuleGeometry args={[0.25, 0.45, 4, 8]} />
              <meshStandardMaterial
                color={colors[(i + 2) % colors.length] ?? "#ffd23f"}
              />
            </mesh>
          </group>
        );
      })}

      {[-9, -3, 3, 9].map((x, i) => (
        <group
          key={x}
          ref={(group) => {
            flags.current[i] = group;
          }}
          position={[x, 2.2, 0]}
        >
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.6, 6]} />
            <meshStandardMaterial color="#5a4632" />
          </mesh>

          <mesh position={[0.4, 1.1, 0]}>
            <boxGeometry args={[0.8, 0.5, 0.04]} />
            <meshStandardMaterial
              color={i % 2 ? TEAMS.B.color : TEAMS.A.color}
            />
          </mesh>
        </group>
      ))}

      {[-6, 6].map((x, i) => (
        <Text
          key={x}
          position={[x, 3.4, 0]}
          fontSize={0.36}
          color="#fff"
          outlineWidth={0.04}
          outlineColor="#30233f"
          anchorX="center"
        >
          {i ? "VAI AZUL!" : "BORA LARANJA!"}
        </Text>
      ))}

      <Text
        position={[0, 2.85, 0]}
        fontSize={0.48}
        color="#fff"
        outlineWidth={0.04}
        outlineColor="#30233f"
        anchorX="center"
      >
        BLOBÃO FC
      </Text>
    </group>
  );
}

function Field() {
  const soap = useCanvasTexture(soapTexture);
  const W = FIELD_X * 2;
  const D = FIELD_Z * 2;

  return (
    <group>
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[W + 4, 1, D + 1]} />
        <meshStandardMaterial map={soap} roughness={0.15} />
      </mesh>

      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.2, D]} />
        <meshStandardMaterial color="#fff" />
      </mesh>

      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.3, 2.55, 48]} />
        <meshStandardMaterial color="#fff" side={THREE.DoubleSide} />
      </mesh>

      <Goal side={1} />
      <Goal side={-1} />

      <CrowdStand z={-(FIELD_Z + 2.2)} />
      <CrowdStand z={FIELD_Z + 2.2} />
    </group>
  );
}

function RaceObstacle(o: RaceObstacleT) {
  const { x, z, r, type } = o;
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const group = ref.current;
    if (!group) return;

    const state = obstacleState(o, worldTime());

    group.position.x = state.x;
    group.position.z = state.z;

    if (type === "spinner") {
      group.rotation.y = state.angle;
    } else if (type === "hammer") {
      group.rotation.x = state.swing * 0.9;
    } else if (type !== "ramp") {
      group.position.y = 0.35 + Math.sin(clock.elapsedTime * 3 + x) * 0.08;
    }
  });

  return (
    <group
      ref={ref}
      position={[x, type === "hammer" || type === "ramp" ? 0 : 0.35, z]}
      rotation-y={o.heading ?? 0}
    >
      {type === "soap" && (
        <mesh rotation-x={-Math.PI / 2} position-y={-0.3}>
          <circleGeometry args={[r, 28]} />
          <meshStandardMaterial
            color="#72dcff"
            transparent
            opacity={0.8}
            roughness={0.05}
          />
        </mesh>
      )}

      {(type === "bumper" || type === "mover") && (
        <mesh castShadow>
          <sphereGeometry args={[r, 18, 14]} />
          <meshStandardMaterial
            color={type === "mover" ? "#42d17a" : "#ff7a59"}
          />
        </mesh>
      )}

      {type === "banana" && (
        <mesh rotation-z={0.55} castShadow>
          <torusGeometry args={[r * 0.65, 0.16, 8, 20, Math.PI * 1.5]} />
          <meshStandardMaterial color="#ffd23f" />
        </mesh>
      )}

      {type === "spinner" && (
        <>
          <mesh>
            <cylinderGeometry args={[0.35, 0.35, 0.7, 14]} />
            <meshStandardMaterial color="#ff9a3c" />
          </mesh>

          <mesh rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.12, 0.12, r * 2, 8]} />
            <meshStandardMaterial color="#5a4632" />
          </mesh>

          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * r, 0, 0]}>
              <sphereGeometry args={[0.45, 12, 10]} />
              <meshStandardMaterial color="#ff70b8" />
            </mesh>
          ))}
        </>
      )}

      {type === "hammer" && (
        <>
          <mesh position={[0, 5.5, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry
              args={[0.2, 0.2, CIRCUIT_HALF_WIDTH * 2 + 1, 8]}
            />
            <meshStandardMaterial color="#5a4632" />
          </mesh>

          <group position={[0, 5.5, 0]}>
            <mesh position={[0, -2.6, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 5, 6]} />
              <meshStandardMaterial color="#8a6a48" />
            </mesh>

            <mesh
              position={[0, -5, 0]}
              rotation-x={Math.PI / 2}
              castShadow
            >
              <cylinderGeometry args={[r * 0.8, r * 0.8, 1.8, 16]} />
              <meshStandardMaterial color="#ff5d5d" />
            </mesh>
          </group>
        </>
      )}

      {type === "ramp" && (
        <mesh position={[0, 0.45, 0]} rotation-z={0.35} castShadow>
          <boxGeometry args={[r * 2.4, 0.25, r * 2]} />
          <meshStandardMaterial color="#ffd23f" />
        </mesh>
      )}
    </group>
  );
}

const LAVA_PLATFORMS: [number, number, number, number][] = [
  [-7, -5, 1.1, 2.3],
  [-2, -7, 1.35, 2.8],
  [4, -5, 1.6, 2.4],
  [7, 0, 1.9, 2.5],
  [3, 5, 2.2, 2.7],
  [-3, 6, 2.55, 2.5],
  [-7, 1, 2.9, 2.1],
  [0, 0, 3.25, 2.2],
];

function LavaArena() {
  const { phase, startedAt } = useMatch();
  const lava = useRef<THREE.Mesh>(null);
  const platforms = useRef<THREE.Group>(null);

  useFrame(() => {
    const elapsed =
      phase === "fight"
        ? Math.max(
            0,
            (performance.now() - (startedAt ?? performance.now())) / 1000,
          )
        : 0;

    if (lava.current) {
      lava.current.position.y = -1.4 + Math.min(5.1, elapsed * 0.045);

      const material = lava.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.7 + Math.sin(elapsed * 4) * 0.25;
    }

    if (platforms.current) {
      platforms.current.children.forEach((platform, i) => {
        const item = LAVA_PLATFORMS[i];

        if (!item) return;

        platform.position.y = item[2] + Math.sin(elapsed * 1.1 + i * 1.7) * 0.12;
        platform.rotation.y = Math.sin(elapsed * 0.5 + i) * 0.08;
      });
    }
  });

  return (
    <group>
      <mesh position={[0, -1.7, 0]} receiveShadow>
        <cylinderGeometry args={[ARENA_R + 1, ARENA_R + 1, 1, 64]} />
        <meshStandardMaterial color="#38233e" />
      </mesh>

      <mesh ref={lava} position={[0, -1.4, 0]}>
        <cylinderGeometry args={[ARENA_R + 1.3, ARENA_R + 1.3, 0.5, 64]} />
        <meshStandardMaterial
          color="#ff4a12"
          emissive="#ff2600"
          emissiveIntensity={0.8}
          roughness={0.3}
        />
      </mesh>

      <group ref={platforms}>
        {LAVA_PLATFORMS.map(([x, z, y, radius], i) => (
          <group key={i} position={[x, y, z]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry
                args={[radius, radius * 0.92, 0.42, 8]}
              />
              <meshStandardMaterial
                color={["#43d9ff", "#ffcf3f", "#ff70b8", "#62e5a2"][i % 4] ?? "#43d9ff"}
                roughness={0.55}
              />
            </mesh>

            <mesh position={[0, 0.24, 0]}>
              <cylinderGeometry
                args={[radius * 0.9, radius * 0.9, 0.06, 8]}
              />
              <meshStandardMaterial
                color="#fff4ce"
                emissive="#ffffff"
                emissiveIntensity={0.12}
              />
            </mesh>
          </group>
        ))}
      </group>

      <Text
        position={[0, 7, 0]}
        fontSize={1.1}
        color="#ffdf63"
        outlineWidth={0.08}
        outlineColor="#572019"
        anchorX="center"
      >
        CHÃO DE LAVA!
      </Text>

      {Array.from({ length: 12 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 6) * 10,
            1 + Math.sin(i * 2) * 0.4,
            Math.sin((i * Math.PI) / 6) * 10,
          ]}
        >
          <sphereGeometry args={[0.22 + (i % 3) * 0.1, 10, 8]} />
          <meshStandardMaterial
            color="#ff6a22"
            emissive="#ff2400"
            emissiveIntensity={1.4}
          />
        </mesh>
      ))}
    </group>
  );
}

function SumoArenaProps() {
  const props = [
    [-4.1, -2.2, 1.05, "#ff70b8"],
    [3.8, -2.8, 0.95, "#42d17a"],
    [-2.4, 4.1, 0.9, "#3ec5f0"],
    [4.7, 2.1, 1.1, "#ff9a3c"],
    [0, -5.2, 0.85, "#ffd23f"],
    [-5.1, 1.7, 0.8, "#b18cff"],
  ] as const;

  return (
    <group>
      {props.map(([x, z, radius, color], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <cylinderGeometry
              args={[radius + 0.22, radius + 0.28, 0.16, 20]}
            />
            <meshStandardMaterial color="#fff1cf" roughness={0.7} />
          </mesh>

          <mesh position={[0, radius * 0.72, 0]} castShadow>
            <sphereGeometry args={[radius, 18, 14]} />
            <meshStandardMaterial color={color} roughness={0.28} />
          </mesh>

          <mesh position={[0, radius * 1.38, 0]}>
            <sphereGeometry args={[radius * 0.22, 12, 10]} />
            <meshStandardMaterial color="#fff6e8" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Arena() {
  const sand = useCanvasTexture(sandTexture);
  const { mode } = useMatch();

  return (
    <group>
      <Environment>
        <Lightformer
          intensity={2.2}
          position={[0, 8, 0]}
          scale={[14, 14, 1]}
        />
      </Environment>

      {mode === "futebol" ? (
        <Field />
      ) : mode === "lava" ? (
        <LavaArena />
      ) : isRaceMode(mode) ? (
        <CircuitTrack mode={mode}>
          {circuitObstacles(getCircuit(mode)).map((obstacle, i) => (
            <RaceObstacle
              key={`${mode}-${i}`}
              {...obstacle}
            />
          ))}
        </CircuitTrack>
      ) : (
        <>
          <mesh position={[0, -0.5, 0]} receiveShadow>
            <cylinderGeometry args={[ARENA_R, ARENA_R - 0.4, 1, 64]} />
            <meshStandardMaterial map={sand} />
          </mesh>

          <SumoArenaProps />
        </>
      )}

      {!isRaceMode(mode) &&
        [0, 1.4, 2.8, 4.2].map((angle) => (
          <Balloon
            key={angle}
            angle={angle}
            radius={ARENA_R + 7}
          />
        ))}
    </group>
  );
}
