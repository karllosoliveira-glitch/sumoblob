import { useRef } from "react";

function setKey(code: string, pressed: boolean) {
  window.dispatchEvent(new CustomEvent("sumo:key", { detail: { code, pressed } }));
}

function HoldButton({ code, label, className = "" }: { code: string; label: string; className?: string }) {
  const active = useRef(false);
  const press = (e: React.PointerEvent) => {
    e.preventDefault();
    active.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setKey(code, true);
  };
  const release = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!active.current) return;
    active.current = false;
    setKey(code, false);
  };
  return <button type="button" aria-label={label} onPointerDown={press} onPointerUp={release} onPointerCancel={release} onPointerLeave={release} className={`touch-none select-none rounded-full border-4 border-ink bg-card/90 font-display text-2xl text-foreground shadow-chunky backdrop-blur-sm active:scale-90 ${className}`}>{label}</button>;
}

export function MobileControls({ soccer }: { soccer: boolean }) {
  const joystick = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());

  const clear = () => { for (const k of keys.current) setKey(k, false); keys.current.clear(); };
  const move = (e: React.PointerEvent) => {
    if (activePointer.current !== e.pointerId) return;
    const dx = e.clientX - center.current.x, dy = e.clientY - center.current.y;
    const dead = 14, limit = 58;
    const nx = Math.abs(dx) < dead ? 0 : dx;
    const ny = Math.abs(dy) < dead ? 0 : dy;
    const next = new Set<string>();
    if (nx > 0) next.add("ArrowRight"); if (nx < 0) next.add("ArrowLeft");
    if (ny > 0) next.add("ArrowDown"); if (ny < 0) next.add("ArrowUp");
    for (const k of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
      const want = next.has(k), has = keys.current.has(k);
      if (want !== has) { setKey(k, want); want ? keys.current.add(k) : keys.current.delete(k); }
    }
    const stick = joystick.current?.querySelector("[data-stick]") as HTMLElement | null;
    if (stick) stick.style.transform = `translate(${Math.max(-limit, Math.min(limit, dx))}px, ${Math.max(-limit, Math.min(limit, dy))}px)`;
  };
  const start = (e: React.PointerEvent) => {
    e.preventDefault(); activePointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); center.current = { x: e.clientX, y: e.clientY }; move(e);
  };
  const end = (e: React.PointerEvent) => { e.preventDefault(); if (activePointer.current !== e.pointerId) return; activePointer.current = null; clear(); const stick = joystick.current?.querySelector("[data-stick]") as HTMLElement | null; if (stick) stick.style.transform = "translate(0,0)"; };

  return <div className="pointer-events-none fixed inset-0 z-30 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
    <div ref={joystick} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} className="pointer-events-auto absolute bottom-5 left-4 size-36 touch-none rounded-full border-4 border-white/70 bg-black/20 shadow-2xl backdrop-blur-sm">
      <div data-stick className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-ink bg-card/90 shadow-chunky transition-transform" />
    </div>
    <div className="absolute bottom-5 right-4 flex items-end gap-3">
      <HoldButton code="ShiftLeft" label="🛝" className="size-20 bg-secondary/95" />
      <HoldButton code="Space" label="⚽" className="size-24 bg-primary/95 text-primary-foreground" />
    </div>
    <div className="absolute bottom-40 left-5 rounded-full border-2 border-white/70 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">arraste para correr</div>
    {soccer && <div className="absolute bottom-36 right-7 flex gap-2 text-[10px] font-black uppercase tracking-wider text-white"><span>🛝 carrinho</span><span>⚽ chute/toque</span></div>}
  </div>;
}
