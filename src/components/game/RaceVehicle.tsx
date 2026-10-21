```tsx
import { Sumo } from "../Sumo";
import type { Mode } from "./match";

type VehicleKind = Extract<Mode, "carros" | "motos" | "kart">;

export function isVehicleMode(mode: Mode): mode is VehicleKind {
  return mode === "carros" || mode === "motos" || mode === "kart";
}

export function RaceVehicle({
  mode,
  color,
  seed = 1,
}: {
  mode: Mode;
  color: string;
  seed?: number;
}) {
  if (!isVehicleMode(mode)) {
    return <Sumo color={color} seed={seed} />;
  }

  const bike = mode === "motos";
  const kart = mode === "kart";

  const rubber = "#20212a";
  const metal = "#9ca3af";
  const dark = "#252536";
  const glass = "#bceaff";
  const accent = kart ? "#ffd166" : "#eaf6ff";

  const tire = (
    x: number,
    z: number,
    key: string,
    radius = bike ? 0.3 : 0.34,
  ) => (
    <group key={key} position={[x, 0.3, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[radius, radius, 0.18, 20]} />
        <meshStandardMaterial color={rubber} roughness={0.95} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry
          args={[radius * 0.48, radius * 0.48, 0.19, 12]}
        />
        <meshStandardMaterial
          color={metal}
          metalness={0.65}
          roughness={0.35}
        />
      </mesh>
    </group>
  );

  return (
    <group>
      {bike ? (
        <>
          {tire(0, -0.78, "rear-wheel")}
          {tire(0, 0.78, "front-wheel")}

          <mesh position={[0, 0.55, 0]} castShadow>
            <capsuleGeometry args={[0.17, 0.72, 5, 12]} />
            <meshStandardMaterial
              color={color}
              metalness={0.25}
              roughness={0.32}
            />
          </mesh>

          <mesh position={[0, 0.76, -0.25]} rotation={[-0.18, 0, 0]} castShadow>
            <boxGeometry args={[0.48, 0.16, 0.43]} />
            <meshStandardMaterial color={dark} roughness={0.48} />
          </mesh>

          <mesh position={[0, 0.83, 0.58]} castShadow>
            <boxGeometry args={[0.65, 0.08, 0.1]} />
            <meshStandardMaterial
              color={metal}
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>

          <mesh position={[0, 0.48, 0.22]}>
            <sphereGeometry args={[0.13, 14, 10]} />
            <meshStandardMaterial
              color="#ffd166"
              emissive="#ff8a00"
              emissiveIntensity={0.45}
            />
          </mesh>

          <mesh position={[0, 0.43, -0.72]}>
            <boxGeometry args={[0.24, 0.12, 0.1]} />
            <meshStandardMaterial color="#ef4444" emissive="#7f1d1d" />
          </mesh>
        </>
      ) : (
        <>
          {tire(-0.72, -0.62, "rear-left")}
          {tire(0.72, -0.62, "rear-right")}
          {tire(-0.72, 0.62, "front-left")}
          {tire(0.72, 0.62, "front-right")}

          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry
              args={[
                kart ? 1.75 : 1.45,
                0.38,
                kart ? 1.85 : 2.2,
              ]}
            />
            <meshStandardMaterial
              color={color}
              metalness={0.2}
              roughness={0.3}
            />
          </mesh>

          {!kart && (
            <>
              <mesh position={[0, 0.82, -0.2]} castShadow>
                <boxGeometry args={[0.88, 0.32, 0.95]} />
                <meshStandardMaterial
                  color={glass}
                  metalness={0.15}
                  roughness={0.22}
                  transparent
                  opacity={0.85}
                />
              </mesh>

              <mesh position={[0, 0.91, -0.2]}>
                <boxGeometry args={[0.72, 0.12, 0.78]} />
                <meshStandardMaterial color={dark} />
              </mesh>

              <mesh position={[0, 0.42, -1.02]}>
                <boxGeometry args={[1.15, 0.1, 0.12]} />
                <meshStandardMaterial color={dark} />
              </mesh>
            </>
          )}

          {kart && (
            <>
              <mesh position={[0, 0.78, -0.22]} castShadow>
                <boxGeometry args={[0.58, 0.26, 0.58]} />
                <meshStandardMaterial color={dark} />
              </mesh>

              <mesh position={[0, 0.82, 0.4]}>
                <torusGeometry args={[0.19, 0.035, 8, 18]} />
                <meshStandardMaterial color={dark} />
              </mesh>

              <mesh position={[0, 0.38, -0.96]}>
                <boxGeometry args={[1.8, 0.12, 0.12]} />
                <meshStandardMaterial color={dark} />
              </mesh>
            </>
          )}

          <mesh position={[0, 0.42, 0.92]} castShadow>
            <boxGeometry args={[kart ? 1.45 : 1.1, 0.12, 0.12]} />
            <meshStandardMaterial
              color={accent}
              emissive={kart ? "#8a5b00" : "#53616d"}
              emissiveIntensity={0.18}
            />
          </mesh>

          {!kart && (
            <>
              {[-0.42, 0.42].map((x) => (
                <mesh key={x} position={[x, 0.52, 1.115]}>
                  <boxGeometry args={[0.22, 0.1, 0.035]} />
                  <meshStandardMaterial
                    color="#ff334f"
                    emissive="#e11d48"
                    emissiveIntensity={0.45}
                  />
                </mesh>
              ))}

              {[-0.42, 0.42].map((x) => (
                <mesh key={`headlight-${x}`} position={[x, 0.56, -1.115]}>
                  <boxGeometry args={[0.2, 0.09, 0.035]} />
                  <meshStandardMaterial
                    color="#fff7cc"
                    emissive="#fff0a3"
                    emissiveIntensity={0.8}
                  />
                </mesh>
              ))}
            </>
          )}
        </>
      )}

      <group
        position={[0, bike ? 0.95 : 0.96, bike ? -0.02 : -0.1]}
        scale={bike ? 0.66 : 0.72}
      >
        <Sumo color={color} seed={seed} />
      </group>
    </group>
  );
}
```
