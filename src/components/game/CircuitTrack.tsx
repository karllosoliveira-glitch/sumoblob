import { Text } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";

import {
  CIRCUIT_HALF_WIDTH,
  CIRCUIT_SECTORS,
  circuitPoint,
  getCircuit,
} from "./raceCircuit";
import type { Mode } from "./match";

type ScenePalette = {
  road: string;
  marking: string;
  grass: string;
  speckle: string;
  pink: string;
  yellow: string;
  ink: string;
  mint: string;
};

type TrackAssets = {
  palette: ScenePalette;
  road: THREE.BufferGeometry;
  roadTexture: THREE.CanvasTexture;
  grassTexture: THREE.CanvasTexture;
  rails: THREE.CatmullRomCurve3[];
};

/** Lê as cores CSS somente no navegador. */
function scenePalette(): ScenePalette {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;

  const context = canvas.getContext("2d");
  const css = getComputedStyle(document.documentElement);

  const color = (name: string): string => {
    const value = css.getPropertyValue(name).trim();

    if (!context || !value) {
      return "gray";
    }

    context.clearRect(0, 0, 1, 1);
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);

    const pixel = context.getImageData(0, 0, 1, 1).data;

    return `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
  };

  return {
    road: color("--race-road"),
    marking: color("--race-marking"),
    grass: color("--race-grass"),
    speckle: color("--race-speckle"),
    pink: color("--race-pink"),
    yellow: color("--secondary"),
    ink: color("--ink"),
    mint: color("--accent"),
  };
}

/** Cria uma textura procedural para a pista ou para a grama. */
function makeTrackTexture(
  palette: ScenePalette,
  grass: boolean,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;

  const context = canvas.getContext("2d");

  if (context) {
    context.fillStyle = grass ? palette.grass : palette.road;
    context.fillRect(0, 0, 128, 128);

    for (let i = 0; i < 700; i++) {
      context.fillStyle = grass ? palette.speckle : palette.marking;
      context.globalAlpha = grass ? 0.35 : 0.08;

      context.fillRect(
        (i * 37.71) % 128,
        (i * 63.17) % 128,
        2,
        2,
      );
    }

    context.globalAlpha = 1;

    if (!grass) {
      // Bordas da pista.
      context.fillStyle = palette.marking;
      context.fillRect(3, 0, 3, 128);
      context.fillRect(122, 0, 3, 128);

      // Faixa central.
      context.fillStyle = palette.yellow;
      context.fillRect(62, 24, 4, 70);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  if (grass) {
    texture.repeat.set(70, 70);
  }

  return texture;
}

/** Constrói os recursos gráficos da pista no navegador. */
function createTrackAssets(
  circuit: ReturnType<typeof getCircuit>,
): TrackAssets {
  const palette = scenePalette();

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pointCount = circuit.points.length;

  for (let i = 0; i <= pointCount; i++) {
    const point = circuit.points[i % pointCount];

    if (!point) continue;

    for (const side of [-1, 1]) {
      positions.push(
        point.x + point.nx * CIRCUIT_HALF_WIDTH * side,
        0.02,
        point.z + point.nz * CIRCUIT_HALF_WIDTH * side,
      );
    }

    const v = (i / pointCount) * (circuit.length / 8);

    uvs.push(0, v, 1, v);

    if (i > 0) {
      const previous = (i - 1) * 2;

      indices.push(
        previous,
        previous + 2,
        previous + 1,
        previous + 1,
        previous + 2,
        previous + 3,
      );
    }
  }

  const road = new THREE.BufferGeometry();

  road.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );

  road.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(uvs, 2),
  );

  road.setIndex(indices);
  road.computeVertexNormals();

  const roadTexture = makeTrackTexture(palette, false);
  const grassTexture = makeTrackTexture(palette, true);

  const railPoints = circuit.points
    .filter((_, index) => index % 4 === 0)
    .map((point) => point);

  const rails = [-1, 1].map((side) => {
    const points = railPoints.map(
      (point) =>
        new THREE.Vector3(
          point.x +
            point.nx * side * (CIRCUIT_HALF_WIDTH + 0.25),
          0.45,
          point.z +
            point.nz * side * (CIRCUIT_HALF_WIDTH + 0.25),
        ),
    );

    return new THREE.CatmullRomCurve3(points, true);
  });

  return {
    palette,
    road,
    roadTexture,
    grassTexture,
    rails,
  };
}

export function CircuitTrack({
  mode,
  children,
}: {
  mode: Mode;
  children?: ReactNode;
}) {
  const circuit = useMemo(() => getCircuit(mode), [mode]);

  const [assets, setAssets] = useState<TrackAssets | null>(null);

  useEffect(() => {
    // document e getComputedStyle só são usados no navegador.
    const nextAssets = createTrackAssets(circuit);

    setAssets(nextAssets);

    return () => {
      nextAssets.road.dispose();
      nextAssets.roadTexture.dispose();
      nextAssets.grassTexture.dispose();
    };
  }, [circuit]);

  return (
    <group>
      {assets && (
        <>
          <mesh
            rotation-x={-Math.PI / 2}
            position-y={-0.12}
            receiveShadow
          >
            <planeGeometry args={[650, 650]} />
            <meshStandardMaterial
              map={assets.grassTexture}
              roughness={0.95}
            />
          </mesh>

          <mesh geometry={assets.road} receiveShadow>
            <meshStandardMaterial
              map={assets.roadTexture}
              roughness={0.72}
              side={THREE.DoubleSide}
            />
          </mesh>

          {assets.rails.map((curve, index) => (
            <mesh key={index}>
              <tubeGeometry
                args={[curve, 320, 0.35, 5, true]}
              />
              <meshStandardMaterial
                color={
                  index
                    ? assets.palette.pink
                    : assets.palette.yellow
                }
                roughness={0.4}
              />
            </mesh>
          ))}

          {Array.from({ length: CIRCUIT_SECTORS }, (_, i) => {
            const point = circuitPoint(
              circuit,
              i / CIRCUIT_SECTORS,
            );

            return (
              <group
                key={i}
                position={[point.x, 0, point.z]}
                rotation-y={Math.atan2(point.tx, point.tz)}
              >
                {[-1, 1].map((side) => (
                  <mesh
                    key={side}
                    position={[
                      side * (CIRCUIT_HALF_WIDTH + 0.5),
                      3,
                      0,
                    ]}
                  >
                    <cylinderGeometry
                      args={[0.22, 0.3, 6, 8]}
                    />
                    <meshStandardMaterial
                      color={
                        i
                          ? assets.palette.mint
                          : assets.palette.pink
                      }
                    />
                  </mesh>
                ))}

                {i === 0 && (
                  <>
                    <mesh position={[0, 6, 0]}>
                      <boxGeometry
                        args={[
                          CIRCUIT_HALF_WIDTH * 2 + 1.8,
                          1.5,
                          0.45,
                        ]}
                      />
                      <meshStandardMaterial
                        color={assets.palette.yellow}
                      />
                    </mesh>

                    <Text
                      position={[0, 6, -0.3]}
                      rotation-y={Math.PI}
                      fontSize={0.7}
                      color={assets.palette.ink}
                      anchorX="center"
                    >
                      {circuit.name.toUpperCase()}
                    </Text>

                    {Array.from({ length: 20 }, (_, n) => (
                      <mesh
                        key={n}
                        position={[
                          -CIRCUIT_HALF_WIDTH +
                            0.4 +
                            (n % 10) * (CIRCUIT_HALF_WIDTH / 5),
                          0.045,
                          Math.floor(n / 10) * 0.8,
                        ]}
                        rotation-x={-Math.PI / 2}
                      >
                        <planeGeometry
                          args={[
                            CIRCUIT_HALF_WIDTH / 5,
                            0.8,
                          ]}
                        />
                        <meshStandardMaterial
                          color={
                            (n + Math.floor(n / 10)) % 2
                              ? assets.palette.ink
                              : assets.palette.marking
                          }
                        />
                      </mesh>
                    ))}
                  </>
                )}

                <mesh
                  position={[0, 0.035, 2.5]}
                  rotation-x={-Math.PI / 2}
                >
                  <planeGeometry args={[2.6, 1.1]} />
                  <meshStandardMaterial
                    color={assets.palette.yellow}
                  />
                </mesh>

                <mesh
                  position={[0, 0.04, 4]}
                  rotation-x={-Math.PI / 2}
                  rotation-z={Math.PI / 2}
                >
                  <circleGeometry args={[1.5, 3]} />
                  <meshStandardMaterial
                    color={assets.palette.yellow}
                  />
                </mesh>
              </group>
            );
          })}

          {Array.from({ length: 14 }, (_, i) => {
            const point = circuitPoint(
              circuit,
              i / 14 + 0.03,
            );

            const side = i % 2 ? 1 : -1;

            return (
              <group
                key={i}
                position={[
                  point.x + point.nx * side * 16,
                  0,
                  point.z + point.nz * side * 16,
                ]}
              >
                <mesh position-y={1.9}>
                  <sphereGeometry args={[2.4, 10, 8]} />
                  <meshStandardMaterial
                    color={
                      i % 3
                        ? assets.palette.mint
                        : assets.palette.pink
                    }
                    roughness={0.35}
                  />
                </mesh>

                <mesh position-y={4.2}>
                  <sphereGeometry args={[1.1, 10, 8]} />
                  <meshStandardMaterial
                    color={assets.palette.yellow}
                    roughness={0.6}
                  />
                </mesh>
              </group>
            );
          })}
        </>
      )}

      {children}
    </group>
  );
}
