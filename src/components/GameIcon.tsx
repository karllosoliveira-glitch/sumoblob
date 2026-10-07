import { Flag, Hand, Volleyball, type LucideProps } from "lucide-react";
import type { Mode } from "./game/match";

export function BlobIcon({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 6c14 0 24 12 24 27 0 14-10 25-24 25S8 47 8 33C8 18 18 6 32 6Z" fill="currentColor" stroke="#241b35" strokeWidth="4" />
      <circle cx="24" cy="30" r="4.5" fill="#241b35" /><circle cx="40" cy="30" r="4.5" fill="#241b35" />
      <circle cx="25.5" cy="28.5" r="1.5" fill="#fff" /><circle cx="41.5" cy="28.5" r="1.5" fill="#fff" />
      <path d="M24 42c5 5 11 5 16 0" fill="none" stroke="#241b35" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function ModeIcon({ mode, ...p }: { mode: Mode } & LucideProps) {
  if (mode === "futebol") return <Volleyball {...p} />;
  if (mode === "corrida") return <Flag {...p} />;
  return <Hand {...p} />;
}
