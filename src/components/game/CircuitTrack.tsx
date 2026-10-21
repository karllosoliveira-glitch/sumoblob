import { Text } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CIRCUIT_HALF_WIDTH, CIRCUIT_SECTORS, circuitPoint, getCircuit } from "./raceCircuit";
import type { Mode } from "./match";

/** Read scene colors from the same semantic tokens as the DOM interface. */
function scenePalette() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d"), css = getComputedStyle(document.documentElement);
  const color = (name: string) => {
    if (!ctx) return "gray";
    ctx.fillStyle = css.getPropertyValue(name).trim(); ctx.fillRect(0, 0, 1, 1);
    const p = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${p[0]},${p[1]},${p[2]})`;
  };
  return { road: color("--race-road"), marking: color("--race-marking"), grass: color("--race-grass"), speckle: color("--race-speckle"), pink: color("--race-pink"), yellow: color("--secondary"), ink: color("--ink"), mint: color("--accent") };
}

export function CircuitTrack({ mode, children }: { mode: Mode; children?: React.ReactNode }) {
  const circuit = useMemo(() => getCircuit(mode), [mode]);
  const assets = useMemo(() => {
    const palette = scenePalette();
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    for (let i = 0; i <= circuit.points.length; i++) {
      const p = circuit.points[i % circuit.points.length]; if (!p) continue;
      for (const side of [-1, 1]) positions.push(p.x + p.nx * CIRCUIT_HALF_WIDTH * side, .02, p.z + p.nz * CIRCUIT_HALF_WIDTH * side);
      uvs.push(0, i / circuit.points.length * circuit.length / 8, 1, i / circuit.points.length * circuit.length / 8);
      if (i > 0) { const v = (i - 1) * 2; indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }
    }
    const road = new THREE.BufferGeometry(); road.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); road.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); road.setIndex(indices); road.computeVertexNormals();
    const makeTexture = (grass: boolean) => {
      const c = document.createElement("canvas"); c.width = c.height = 128; const ctx = c.getContext("2d");
      if (ctx) {
        ctx.fillStyle = grass ? palette.grass : palette.road; ctx.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 700; i++) { ctx.fillStyle = grass ? palette.speckle : palette.marking; ctx.globalAlpha = grass ? .35 : .08; ctx.fillRect((i * 37.71) % 128, (i * 63.17) % 128, 2, 2); }
        ctx.globalAlpha = 1;
        if (!grass) { ctx.fillStyle = palette.marking; ctx.fillRect(3, 0, 3, 128); ctx.fillRect(122, 0, 3, 128); ctx.fillStyle = palette.yellow; ctx.fillRect(62, 24, 4, 70); }
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping;
      if (grass) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(70, 70); }
      return t;
    };
    const rails = [-1, 1].map(side => new THREE.CatmullRomCurve3(circuit.points.filter((_, i) => i % 4 === 0).map(p => new THREE.Vector3(p.x + p.nx * side * (CIRCUIT_HALF_WIDTH + .25), .45, p.z + p.nz * side * (CIRCUIT_HALF_WIDTH + .25))), true));
    return { palette, road, roadTexture: makeTexture(false), grassTexture: makeTexture(true), rails };
  }, [circuit]);
  useEffect(() => () => { assets.road.dispose(); assets.roadTexture.dispose(); assets.grassTexture.dispose(); }, [assets]);
  const { palette } = assets;
  return <group>
    <mesh rotation-x={-Math.PI / 2} position-y={-.12} receiveShadow><planeGeometry args={[650, 650]} /><meshStandardMaterial map={assets.grassTexture} roughness={.95} /></mesh>
    <mesh geometry={assets.road} receiveShadow><meshStandardMaterial map={assets.roadTexture} roughness={.72} side={THREE.DoubleSide} /></mesh>
    {assets.rails.map((curve, i) => <mesh key={i}><tubeGeometry args={[curve, 320, .35, 5, true]} /><meshStandardMaterial color={i ? palette.pink : palette.yellow} roughness={.4} /></mesh>)}
    {Array.from({ length: CIRCUIT_SECTORS }, (_, i) => {
      const p = circuitPoint(circuit, i / CIRCUIT_SECTORS);
      return <group key={i} position={[p.x, 0, p.z]} rotation-y={Math.atan2(p.tx, p.tz)}>
        {[-1, 1].map(side => <mesh key={side} position={[side * (CIRCUIT_HALF_WIDTH + .5), 3, 0]}><cylinderGeometry args={[.22, .3, 6, 8]} /><meshStandardMaterial color={i ? palette.mint : palette.pink} /></mesh>)}
        {i === 0 && <><mesh position={[0, 6, 0]}><boxGeometry args={[CIRCUIT_HALF_WIDTH * 2 + 1.8, 1.5, .45]} /><meshStandardMaterial color={palette.yellow} /></mesh><Text position={[0, 6, -.3]} rotation-y={Math.PI} fontSize={.7} color={palette.ink} anchorX="center">{circuit.name.toUpperCase()}</Text>
          {Array.from({ length: 20 }, (_, n) => <mesh key={n} position={[-CIRCUIT_HALF_WIDTH + .4 + (n % 10) * CIRCUIT_HALF_WIDTH / 5, .045, Math.floor(n / 10) * .8]} rotation-x={-Math.PI / 2}><planeGeometry args={[CIRCUIT_HALF_WIDTH / 5, .8]} /><meshStandardMaterial color={(n + Math.floor(n / 10)) % 2 ? palette.ink : palette.marking} /></mesh>)}</>}
        <mesh position={[0, .035, 2.5]} rotation-x={-Math.PI / 2}><planeGeometry args={[2.6, 1.1]} /><meshStandardMaterial color={palette.yellow} /></mesh>
        <mesh position={[0, .04, 4]} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2}><circleGeometry args={[1.5, 3]} /><meshStandardMaterial color={palette.yellow} /></mesh>
      </group>;
    })}
    {Array.from({ length: 14 }, (_, i) => {
      const p = circuitPoint(circuit, i / 14 + .03), side = i % 2 ? 1 : -1;
      return <group key={i} position={[p.x + p.nx * side * 16, 0, p.z + p.nz * side * 16]}>
        <mesh position-y={1.9}><sphereGeometry args={[2.4, 10, 8]} /><meshStandardMaterial color={i % 3 ? palette.mint : palette.pink} roughness={.35} /></mesh>
        <mesh position-y={4.2}><sphereGeometry args={[1.1, 10, 8]} /><meshStandardMaterial color={palette.yellow} roughness={.6} /></mesh>
      </group>;
    })}
    {children}
  </group>;
}