import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { choosePlan } from "../src/game/ai";
import { CHARACTERS, type Difficulty, type Side } from "../src/game/content";
import { createGame, suggestedSetup } from "../src/game/model";
import { beginRound, resolveRound } from "../src/game/resolve";

const IDS = CHARACTERS.map((c) => c.id);
const NAMES: Record<string, string> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c.name]));
const GAMES = 16;
const MAX_ROUNDS = 28;
const DIFF: Difficulty = "taktisch";
const OUTPUT_DIR = resolve(process.argv[2] ?? process.env.ECHO_BRUCH_ARTIFACTS ?? "./artifacts");

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Bout {
  id: string;
  left: string;
  right: string;
  seed: number;
  rounds: number;
  winner: Side | null;
  reason: string | null;
  bodyA: number;
  bodyB: number;
  bruchA: number;
  bruchB: number;
  actions: Record<Side, Record<string, number>>;
  log: string[];
}

function play(left: string, right: string, seed: number): Bout {
  const random = Math.random;
  Math.random = mulberry32(seed * 997 + left.length * 13 + right.length);
  try {
    let pack = beginRound(createGame(suggestedSetup(left, "A"), suggestedSetup(right, "B"), seed));
    let state = pack.state;
    const actions: Bout["actions"] = {
      A: { attack: 0, guard: 0, move: 0, influence: 0 },
      B: { attack: 0, guard: 0, move: 0, influence: 0 },
    };
    let guard = 0;
    while (!state.over && guard < MAX_ROUNDS) {
      guard += 1;
      const planA = choosePlan(state, "A", DIFF);
      const planB = choosePlan(state, "B", DIFF);
      actions.A[planA.action] += 1;
      actions.B[planB.action] += 1;
      const frames = resolveRound(state, planA, planB);
      state = frames[frames.length - 1].state;
      if (!state.over) {
        pack = beginRound(state);
        state = pack.state;
      }
    }
    if (!state.over) {
      state.winner = null;
      state.winReason = "Zeit";
    }
    return {
      id: `${left}-vs-${right}-s${seed}`,
      left,
      right,
      seed,
      rounds: state.round,
      winner: state.winner,
      reason: state.winReason,
      bodyA: state.fighters.A.body,
      bodyB: state.fighters.B.body,
      bruchA: state.fighters.A.bruch,
      bruchB: state.fighters.B.bruch,
      actions,
      log: [...state.log].reverse(),
    };
  } finally {
    Math.random = random;
  }
}

interface Row {
  id: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  reasons: Record<string, number>;
  rounds: number;
  bodyLeft: number;
  attack: number;
  guard: number;
  move: number;
  influence: number;
}

function emptyRow(id: string): Row {
  return {
    id,
    name: NAMES[id],
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    reasons: {},
    rounds: 0,
    bodyLeft: 0,
    attack: 0,
    guard: 0,
    move: 0,
    influence: 0,
  };
}

const bouts: Bout[] = [];
for (const left of IDS) {
  for (const right of IDS) {
    for (let seed = 1; seed <= GAMES; seed++) bouts.push(play(left, right, seed));
  }
}

const rows = new Map<string, Row>(IDS.map((id) => [id, emptyRow(id)]));
const matrix = new Map<string, { games: number; leftWins: number; draws: number }>();

for (const bout of bouts) {
  const key = `${bout.left}>${bout.right}`;
  const cell = matrix.get(key) ?? { games: 0, leftWins: 0, draws: 0 };
  cell.games += 1;
  if (!bout.winner) cell.draws += 1;
  if (bout.winner === "A") cell.leftWins += 1;
  matrix.set(key, cell);

  for (const side of ["A", "B"] as Side[]) {
    const id = side === "A" ? bout.left : bout.right;
    const row = rows.get(id)!;
    row.games += 1;
    row.rounds += bout.rounds;
    const body = side === "A" ? bout.bodyA : bout.bodyB;
    row.bodyLeft += body;
    const acts = bout.actions[side];
    row.attack += acts.attack;
    row.guard += acts.guard;
    row.move += acts.move;
    row.influence += acts.influence;
    if (!bout.winner) row.draws += 1;
    else if ((side === "A" && bout.winner === "A") || (side === "B" && bout.winner === "B")) {
      row.wins += 1;
      const reason = bout.reason ?? "offen";
      row.reasons[reason] = (row.reasons[reason] ?? 0) + 1;
    } else row.losses += 1;
  }
}

const ordered = [...rows.values()].sort((a, b) => b.wins / b.games - a.wins / a.games);
const lines: string[] = [];
lines.push("ECHO//BRUCH · Simulationsprotokoll");
lines.push("Ausgleich erweitert die schwachen Figuren. Brecher und Wächter sind nicht reduziert.");
lines.push("Läuferin: Kraft 5, Schutz 5. Einmal bewegt, bleiben +2 Rohschaden und das Ignorieren von 2 Schutzbonus und 2 Rüstung für den Kampf.");
lines.push("Archivar: Schutz 6. Echo auf dem Feld +2 Verteidigung. Erster Treffer −6 und Schutz-Echo. Verbindung legt bei Bedarf ein Schutz-Echo.");
lines.push("Jäger: Kraft 7, Schutz 4, Bogen 4. Erster Treffer −4. Markierung ignoriert 2 Schutzbonus und 1 Rüstung.");
lines.push(`Paarungen ${IDS.length}×${IDS.length} · ${GAMES} Samen · Schwierigkeit ${DIFF} · Deckel ${MAX_ROUNDS} Runden`);
lines.push(`Duelle ${bouts.length} · vollständig, nicht gekürzt`);
lines.push("");
const vorherPath = resolve(OUTPUT_DIR, "echo-bruch-bilanz-vorher.txt");
if (existsSync(vorherPath)) {
  lines.push("VORHER");
  lines.push(readFileSync(vorherPath, "utf8").trim());
  lines.push("");
  lines.push("NACHHER");
}
lines.push("Siegquote je Figur (beide Seiten, Standardausrüstung)");
lines.push("Figur | Spiele | Siege | Niederlagen | Unentschieden | Quote | Ø Runden | Ø Körper übrig | Siege nach Grund");
for (const row of ordered) {
  const rate = ((row.wins / row.games) * 100).toFixed(1);
  const reasons = Object.entries(row.reasons)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  lines.push(
    `${row.name} | ${row.games} | ${row.wins} | ${row.losses} | ${row.draws} | ${rate}% | ${(row.rounds / row.games).toFixed(1)} | ${(row.bodyLeft / row.games).toFixed(1)} | ${reasons || "—"}`,
  );
}
lines.push("");
lines.push("Aktionen je Figur (Summe über alle eigenen Züge)");
for (const row of ordered) {
  const sum = row.attack + row.guard + row.move + row.influence || 1;
  const pct = (n: number) => `${Math.round((n / sum) * 100)}%`;
  lines.push(
    `${row.name} | Angriff ${pct(row.attack)} | Schutz ${pct(row.guard)} | Bewegung ${pct(row.move)} | Einfluss ${pct(row.influence)}`,
  );
}
lines.push("");
lines.push("Matrix · Siege der linken Figur / Spiele (Unentschieden in Klammern)");
lines.push(["", ...IDS.map((id) => NAMES[id])].join(" | "));
for (const left of IDS) {
  const cells = IDS.map((right) => {
    const cell = matrix.get(`${left}>${right}`)!;
    return `${cell.leftWins}/${cell.games}${cell.draws ? ` (${cell.draws})` : ""}`;
  });
  lines.push([NAMES[left], ...cells].join(" | "));
}

lines.push("");
lines.push("=== VOLLSTÄNDIGE DUELLPROTOKOLLE ===");
for (const bout of bouts) {
  const who =
    bout.winner === "A" ? NAMES[bout.left] : bout.winner === "B" ? NAMES[bout.right] : "unentschieden";
  lines.push("");
  lines.push(`--- ${bout.id} ---`);
  lines.push(
    `${NAMES[bout.left]} (A) gegen ${NAMES[bout.right]} (B) · Samen ${bout.seed} · Runde ${bout.rounds} · ${who} · ${bout.reason ?? "offen"} · Körper ${bout.bodyA}/${bout.bodyB} · Bruch ${bout.bruchA}/${bout.bruchB}`,
  );
  for (const line of bout.log) lines.push(line);
}

const text = lines.join("\n");
mkdirSync(OUTPUT_DIR, { recursive: true });
const out = resolve(OUTPUT_DIR, "echo-bruch-protokoll.txt");
writeFileSync(out, text);
const summary = lines.slice(0, lines.findIndex((line) => line.startsWith("=== "))).join("\n");
writeFileSync(resolve(OUTPUT_DIR, "echo-bruch-bilanz.txt"), summary);
console.log(summary);
console.log("\nGespeichert", out, "Zeichen", text.length);
