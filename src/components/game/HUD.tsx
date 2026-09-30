import { colorForId } from "../Sumo";

type Row = { id: string; name: string; falls: number };

export function HUD({
  roomCode,
  rows,
  meId,
  onCopy,
  copied,
}: {
  roomCode: string;
  rows: Row[];
  meId: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      <div className="flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-2xl border-4 border-ink bg-card px-4 py-3 shadow-chunky">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Sala
          </p>
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl tracking-widest text-foreground">
              {roomCode}
            </span>
            <button
              onClick={onCopy}
              className="rounded-full border-2 border-ink bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground transition-transform hover:scale-105"
            >
              {copied ? "copiado!" : "copiar link"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border-4 border-ink bg-card px-4 py-3 shadow-chunky">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Tombos
          </p>
          <ul className="space-y-1">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm font-bold">
                <span
                  className="inline-block size-3 rounded-full border-2 border-ink"
                  style={{ backgroundColor: colorForId(r.id) }}
                />
                <span className={r.id === meId ? "text-primary" : "text-foreground"}>
                  {r.name}
                  {r.id === meId ? " (você)" : ""}
                </span>
                <span className="ml-auto tabular-nums text-muted-foreground">
                  {r.falls}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border-4 border-ink bg-card px-5 py-2 text-sm font-bold shadow-chunky">
        WASD para correr · ESPAÇO para dar o esbarrão
      </div>
    </div>
  );
}
