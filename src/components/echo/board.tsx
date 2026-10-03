import { EDGES, ECHO_LABEL, POS } from "@/game/content";
import type { EchoKind, Side } from "@/game/content";
import { neighbors, other, type GameState } from "@/game/model";

const ECHO_CLASS: Record<EchoKind, string> = {
  attack: "var(--color-accent)",
  guard: "var(--color-steel)",
  move: "var(--color-olive)",
  influence: "var(--color-soft)",
  trap: "var(--color-accent)",
  barrier: "var(--color-steel)",
  mist: "var(--color-muted)",
  rift: "var(--color-soft)",
};

export function Board({
  state,
  legal,
  selected,
  focus,
  shake,
  tone = "idle",
  actor = null,
  beatId,
  onPick,
}: {
  state: GameState;
  legal: number[];
  selected: number | null;
  focus: number[];
  shake: boolean;
  tone?: "idle" | "hit" | "miss" | "guard" | "move" | "echo" | "break" | "win";
  actor?: Side | null;
  beatId?: string;
  onPick?: (field: number) => void;
}) {
  const marks = new Map<number, { echoes: { kind: EchoKind; owner: Side; charges: number }[]; marker?: string }>();
  for (let id = 1; id <= 7; id++) marks.set(id, { echoes: [] });
  for (const side of ["A", "B"] as Side[]) {
    for (const echo of state.fighters[side].echoes) {
      marks.get(echo.field)?.echoes.push(echo);
    }
  }
  for (const marker of state.markers) {
    const slot = marks.get(marker.field);
    if (slot) slot.marker = marker.kind;
  }
  const effectSide = tone === "hit" || tone === "miss" ? (actor ? other(actor) : null) : actor;
  const effectField = effectSide ? state.fighters[effectSide].field : focus[0];
  const effectPosition = effectField ? POS[effectField] : null;

  return (
    <svg
      viewBox="0 0 1000 1200"
      className={`battle-board h-full w-full ${shake ? "shake" : ""}`}
      data-tone={tone}
      data-actor={actor ?? undefined}
      role="img"
      aria-label="Spielfeld mit sieben Feldern"
    >
      <defs>
        <linearGradient id="board-ground" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-board)" />
          <stop offset="0.54" stopColor="var(--color-bg)" />
          <stop offset="1" stopColor="var(--color-board-edge)" />
        </linearGradient>
        <radialGradient id="board-well">
          <stop offset="0" stopColor="var(--color-soft)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--color-soft)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="field-glass" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="var(--color-raised)" />
          <stop offset="1" stopColor="var(--color-surface)" />
        </linearGradient>
        <pattern id="board-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="var(--color-grid)" strokeWidth="1" />
        </pattern>
        <filter id="token-shadow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="12" />
          <feOffset dy="12" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.42" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="1000" height="1200" fill="url(#board-ground)" />
      <rect width="1000" height="1200" fill="url(#board-grid)" opacity="0.48" />
      <ellipse cx="500" cy="590" rx="390" ry="470" fill="url(#board-well)" />
      <path className="board-frame" d="M72 96H928V1104H72z" />
      <path className="board-crack" d="M514 78 470 214l58 72-84 96 48 82-77 72 61 78-51 85 66 76-63 95 42 93-52 93 45 74-39 87" />
      <path className="board-crack board-crack--thin" d="m470 214-91 25m149 47 81-34m-165 130-84 6m132 76 95-4m-172 76-76-43m137 199 91 12m-154 64-94 45m173 50 93-29m-151 122-79-8m130 101 79 43" />
      <g className="board-core" aria-hidden="true">
        <circle cx="500" cy="590" r="114" />
        <circle cx="500" cy="590" r="91" />
        <path d="m500 520 62 70-62 70-62-70z" />
        <path d="M500 486v62m0 84v62M396 590h62m84 0h62" />
        <circle cx="500" cy="590" r="9" />
      </g>
      {EDGES.map(([a, b]) => {
        const hot = a === selected || b === selected || focus.includes(a) || focus.includes(b);
        return (
          <line
            key={`${a}-${b}`}
            x1={POS[a][0]}
            y1={POS[a][1]}
            x2={POS[b][0]}
            y2={POS[b][1]}
            className={`board-link ${hot ? "is-lit" : ""}`}
            strokeWidth={hot ? 7 : 3}
          />
        );
      })}
      {[1, 2, 3, 4, 5, 6, 7].map((id) => {
        const [x, y] = POS[id];
        const isLegal = legal.includes(id);
        const isSel = selected === id;
        const isFocus = focus.includes(id);
        const slot = marks.get(id)!;
        const label = `Feld ${id}, ${neighbors(id).length} Verbindungen`;
        return (
          <g
            key={id}
            transform={`translate(${x} ${y})`}
            onClick={() => onPick?.(id)}
            className={`board-field ${isSel ? "is-selected" : ""} ${isFocus ? "is-focused" : ""} ${isLegal ? "is-legal" : ""} ${onPick ? "is-clickable" : ""}`}
            role={onPick ? "button" : undefined}
            aria-label={label}
            aria-pressed={onPick ? isSel : undefined}
          >
            {(isLegal || isFocus || isSel) && <circle className="field-halo" r="64" />}
            <circle className="field-ring" r="53" />
            <circle className="field-disc" r="45" />
            <circle className="field-etch" r="34" />
            <text
              y="1"
              textAnchor="middle"
              dominantBaseline="central"
              className="field-number"
              fontFamily="Fraunces, Palatino, serif"
              fontSize="27"
              fontWeight={600}
            >
              {id}
            </text>
            <text
              x="29"
              y="34"
              textAnchor="middle"
              className="field-degree"
              fontFamily="Outfit, sans-serif"
              fontSize="13"
            >
              {neighbors(id).length}
            </text>
            {slot.echoes.slice(0, 4).map((echo, index) => (
              <circle
                key={`${echo.kind}-${index}`}
                cx={-21 + index * 14}
                cy="57"
                r="4.5"
                fill={ECHO_CLASS[echo.kind]}
                className="echo-bead"
              >
                <title>
                  {ECHO_LABEL[echo.kind]} {echo.charges}
                </title>
              </circle>
            ))}
            {slot.marker && (
              <g className="field-marker" transform="translate(0 -67)">
                <rect x="-37" y="-12" width="74" height="24" rx="12" />
                <text textAnchor="middle" dominantBaseline="central" y="1">
                  {slot.marker === "brand"
                    ? "Brand"
                    : slot.marker === "mist"
                      ? "Nebel"
                      : slot.marker === "guard"
                        ? "Schutz"
                        : slot.marker === "bind"
                          ? "Fessel"
                          : slot.marker === "rift"
                            ? "Riss"
                            : "Spiegel"}
                </text>
              </g>
            )}
            <title>{label}</title>
          </g>
        );
      })}
      {(["A", "B"] as Side[]).map((side) => {
        const fighter = state.fighters[side];
        const [x, y] = POS[fighter.field];
        const glyph = fighter.characterId === "laeuferin"
          ? "L"
          : fighter.characterId === "waechter"
            ? "W"
            : fighter.characterId === "archivar"
              ? "A"
              : fighter.characterId === "brecher"
                ? "B"
                : "J";
        const acting = actor === side && tone !== "idle";
        const targeted = actor !== null && actor !== side && (tone === "hit" || tone === "miss");
        return (
          <g
            key={side}
            transform={`translate(${x} ${y})`}
            className={`fighter-token fighter-token--${side.toLowerCase()} ${acting ? "is-acting" : ""} ${targeted ? "is-targeted" : ""} ${tone === "echo" && acting ? "is-echoing" : ""}`}
            aria-hidden="true"
          >
            <circle className="fighter-shadow" r="54" />
            <circle className="fighter-outline" r="48" />
            <circle className="fighter-core" r="40" />
            <path className="fighter-cut" d="m0-30 26 15v30L0 30l-26-15v-30z" />
            <text y="1" textAnchor="middle" dominantBaseline="central" className="fighter-glyph">
              {glyph}
            </text>
            <text y="58" textAnchor="middle" className="fighter-side">
              {side}
            </text>
          </g>
        );
      })}
      {beatId && effectPosition && (
        <g key={beatId} className={`board-beat board-beat--${tone}`} aria-hidden="true">
          <circle cx={effectPosition[0]} cy={effectPosition[1]} r="42" className="beat-ripple" />
          {tone === "hit" && (
            <path
              className="impact-flash"
              d={`M${effectPosition[0] - 26} ${effectPosition[1] - 30}l15 18-9 2 19 23-5-19 12-1-22-25z`}
            />
          )}
        </g>
      )}
    </svg>
  );
}
