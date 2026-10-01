import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { fx } from "./match";

const COUNT = 150;
const COLORS = ["#ff5d5d", "#ffd23f", "#3ec5f0", "#42d17a", "#ff70b8", "#ff9a3c"];

/** Chuva de confete num único InstancedMesh; dispara quando fx.goalAt muda. */
export function Confetti() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const seen = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const parts = useMemo(() => Array.from({ length: COUNT }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: Math.random() * 8 + 2 })), []);
  const geo = useMemo(() => new THREE.PlaneGeometry(0.22, 0.32), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useEffect(() => {
    const m = ref.current; if (!m) return;
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) m.setColorAt(i, c.set(COLORS[i % COLORS.length]!));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  useFrame(({ camera }, raw) => {
    const m = ref.current; if (!m) return;
    const dt = Math.min(raw, 0.05), age = (performance.now() - fx.goalAt) / 1000;
    if (fx.goalAt !== seen.current) {
      seen.current = fx.goalAt;
      const cx = camera.position.x, cz = camera.position.z - 13;
      for (const q of parts) { q.p.set(cx + (Math.random() - 0.5) * 18, 9 + Math.random() * 5, cz + (Math.random() - 0.5) * 12); q.v.set((Math.random() - 0.5) * 3, -2 - Math.random() * 2, (Math.random() - 0.5) * 3); }
    }
    m.visible = age < 5;
    if (!m.visible) return;
    for (let i = 0; i < COUNT; i++) {
      const q = parts[i]!;
      q.p.addScaledVector(q.v, dt); q.p.x += Math.sin(age * 3 + i) * dt * 0.8;
      q.r.x += q.w * dt; q.r.y += q.w * 0.7 * dt;
      dummy.position.copy(q.p); dummy.rotation.copy(q.r); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, COUNT]} frustumCulled={false} visible={false} />;
}
