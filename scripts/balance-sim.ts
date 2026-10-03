import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { choosePlan } from "../src/game/ai.ts";
import { CHARACTERS, type ActionKind, type Difficulty, type RuleStage, type Side } from "../src/game/content.ts";
import { createGame, other, suggestedSetup, type GameState, type Plan } from "../src/game/model.ts";
import { beginRound, resolveRound } from "../src/game/resolve.ts";
import { MAX_ROUNDS } from "../src/game/tuning.ts";

const IDS = CHARACTERS.map((character) => character.id);
const NAMES = Object.fromEntries(CHARACTERS.map((character) => [character.id, character.name]));
const GAMES_PER_PAIR = 32;
const DIFFICULTY: Difficulty = "taktisch";
const STAGES: RuleStage[] = ["kern", "voll"];
const OUTPUT_DIR = resolve(process.argv[2] ?? process.env.ECHO_BRUCH_ARTIFACTS ?? "./artifacts");
const ENERGY_LEVELS = ["0", "1", "2", "3"] as const;

const MECHANICS = [
  "Echotyp: Angriff",
  "Echotyp: Schutz",
  "Echotyp: Bewegung",
  "Echotyp: Einfluss",
  "Umwandlung: Falle",
  "Umwandlung: Barriere",
  "Umwandlung: Nebel",
  "Umwandlung: Riss",
  "Kern-Treffer",
  "Vorhersage",
  "Regelbruch",
  "Reaktion: Ausweichen",
  "Reaktion: Gegenstoß",
  "Reaktion: Stabilisieren",
  "Reaktion: Echo sichern",
  "Reaktion: Parade",
  "Item: Heilmittel",
  "Item: Energiezelle",
  "Item: Bruchbinde",
  "Item: Echo-Splitter",
  "Item: Blendpulver",
  "Zustand: Gebunden",
  "Zustand: Verwirrt",
  "Zustand: Verletzt",
  "Zustand: Geschützt",
  "Marker: Brand",
  "Marker: Nebel",
  "Marker: Spiegel",
  "Marker: Riss",
  "Marker: Schutz",
  "Marker: Fessel",
] as const;

type MetricKey = (typeof MECHANICS)[number];

interface SideMetric {
  actions: Record<ActionKind, number>;
  attacks: number;
  hits: number;
  damageFraction: number;
  normalHits: number;
  normalDamageFraction: number;
  protectedHits: number;
  protectedDamageFraction: number;
  normalHits: number;
  normalDamageFraction: number;
  protectedHits: number;
  protectedDamageFraction: number;
  plans: number;
  energySpent: number;
  energyLevels: Record<(typeof ENERGY_LEVELS)[number], number>;
}

interface Bout {
  left: string;
  right: string;
  seed: number;
  ruleStage: RuleStage;
  startSide: Side;
  rounds: number;
  winner: Side | null;
  reason: string | null;
  mechanics: MetricKey[];
  sides: Record<Side, SideMetric>;
}

interface FighterRow {
  id: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  rounds: number;
  actions: Record<ActionKind, number>;
  attacks: number;
  hits: number;
  damageFraction: number;
  plans: number;
  energySpent: number;
  energyLevels: Record<(typeof ENERGY_LEVELS)[number], number>;
  winReasons: Record<string, number>;
}

function randomFrom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nameSeed(name: string): number {
  return [...name].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0);
}

function emptySideMetric(): SideMetric {
  return {
    actions: { attack: 0, guard: 0, move: 0, influence: 0 },
    attacks: 0,
    hits: 0,
    damageFraction: 0,
    normalHits: 0,
    normalDamageFraction: 0,
    protectedHits: 0,
    protectedDamageFraction: 0,
    normalHits: 0,
    normalDamageFraction: 0,
    protectedHits: 0,
    protectedDamageFraction: 0,
    plans: 0,
    energySpent: 0,
    energyLevels: { "0": 0, "1": 0, "2": 0, "3": 0 },
  };
}

function mechanicCoverage(state: GameState, stage: RuleStage): MetricKey[] {
  if (stage === "kern") return [];
  const log = state.log.join("\n").toLocaleLowerCase("de");
  const matches: [MetricKey, RegExp][] = [
    ["Echotyp: Angriff", /angriffs-echo/],
    ["Echotyp: Schutz", /schutz-echo/],
    ["Echotyp: Bewegung", /bewegungs-echo/],
    ["Echotyp: Einfluss", /einfluss-echo/],
    ["Umwandlung: Falle", /wandelt.*falle/],
    ["Umwandlung: Barriere", /wandelt.*barriere/],
    ["Umwandlung: Nebel", /wandelt.*nebel/],
    ["Umwandlung: Riss", /wandelt.*riss/],
    ["Kern-Treffer", /bricht ein kern-echo|kern.*noch \d+ punkte|zerbricht/],
    ["Vorhersage", /liest richtig|liest falsch/],
    ["Regelbruch", /regelbruch|bricht die regel|energiestufe zurück/],
    ["Reaktion: Ausweichen", /weicht aus/],
    ["Reaktion: Gegenstoß", /gegenstoß/],
    ["Reaktion: Stabilisieren", /stabilisiert/],
    ["Reaktion: Echo sichern", /sichert ein echo/],
    ["Reaktion: Parade", /pariert/],
    ["Item: Heilmittel", /heilmittel/],
    ["Item: Energiezelle", /energiezelle/],
    ["Item: Bruchbinde", /bindet den bruch/],
    ["Item: Echo-Splitter", /splitter/],
    ["Item: Blendpulver", /blendpulver/],
    ["Zustand: Gebunden", /gebunden/],
    ["Zustand: Verwirrt", /verwirrt|blendpulver/],
    ["Zustand: Verletzt", /blutet|verletzt/],
    ["Zustand: Geschützt", /geschützt/],
    ["Marker: Brand", /brand-marker|brand auf feld/],
    ["Marker: Nebel", /nebelmarker|rauchkapsel/],
    ["Marker: Spiegel", /mirror-marker|spiegel-marker|spiegel auf feld/],
    ["Marker: Riss", /rift-marker|riss-marker|riss auf feld/],
    ["Marker: Schutz", /schutzmarker|sperrt das feld/],
    ["Marker: Fessel", /bind-marker|fessel-marker|fessel auf feld/],
  ];
  return matches.filter(([, expression]) => expression.test(log)).map(([key]) => key);
}

function play(left: string, right: string, seed: number, ruleStage: RuleStage): Bout {
  const originalRandom = Math.random;
  Math.random = randomFrom(seed * 997 + nameSeed(left) * 13 + nameSeed(right) + (ruleStage === "voll" ? 37 : 0));
  try {
    let state = createGame(
      suggestedSetup(left, "A"),
      suggestedSetup(right, "B"),
      seed,
      ruleStage,
    );
    state.startSide = seed % 2 === 0 ? "B" : "A";
    const startSide = state.startSide;
    state = beginRound(state).state;
    const sides: Record<Side, SideMetric> = { A: emptySideMetric(), B: emptySideMetric() };
    let rounds = 0;

    while (!state.over && rounds < MAX_ROUNDS) {
      rounds += 1;
      const plans: Record<Side, Plan> = {
        A: choosePlan(state, "A", DIFFICULTY),
        B: choosePlan(state, "B", DIFFICULTY),
      };
      for (const side of ["A", "B"] as Side[]) {
        const metric = sides[side];
        const plan = plans[side];
        metric.actions[plan.action] += 1;
        metric.plans += 1;
        metric.energySpent += plan.energy;
        metric.energyLevels[String(Math.min(3, plan.energy)) as keyof SideMetric["energyLevels"]] += 1;
      }

      const frames = resolveRound(state, plans.A, plans.B);
      let previous = state;
      for (const frame of frames) {
        if (frame.actor && (frame.tone === "hit" || frame.tone === "miss")) {
          const plan = plans[frame.actor];
          if (plan.action === "attack") {
            const metric = sides[frame.actor];
            metric.attacks += 1;
            if (frame.tone === "hit") {
              metric.hits += 1;
              const targetSide = other(frame.actor);
              const targetMax = previous.fighters[targetSide].bodyMax;
              const hitLine = frame.state.log.find((line) => line.includes(" trifft "));
              const endDamage = Number(hitLine?.match(/Endschaden (\d+)/)?.[1] ?? 0);
              metric.damageFraction += endDamage / targetMax;
              if (hitLine?.includes("; Geschützt")) {
                metric.protectedHits += 1;
                metric.protectedDamageFraction += endDamage / targetMax;
              } else {
                metric.normalHits += 1;
                metric.normalDamageFraction += endDamage / targetMax;
              }
            }
          }
        }
        previous = frame.state;
      }
      state = frames[frames.length - 1].state;
      if (!state.over && rounds < MAX_ROUNDS) state = beginRound(state).state;
    }
    if (!state.over) state.winReason = "Zeit";
    return {
      left,
      right,
      seed,
      ruleStage,
      startSide,
      rounds: state.round,
      winner: state.winner,
      reason: state.winReason,
      mechanics: mechanicCoverage(state, ruleStage),
      sides,
    };
  } finally {
    Math.random = originalRandom;
  }
}

function emptyRow(id: string): FighterRow {
  return {
    id,
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    rounds: 0,
    actions: { attack: 0, guard: 0, move: 0, influence: 0 },
    attacks: 0,
    hits: 0,
    damageFraction: 0,
    plans: 0,
    energySpent: 0,
    energyLevels: { "0": 0, "1": 0, "2": 0, "3": 0 },
    winReasons: {},
  };
}

function summarize(ruleStage: RuleStage, bouts: Bout[]) {
  const rows = new Map(IDS.map((id) => [id, emptyRow(id)]));
  const matrix = new Map<string, { games: number; wins: number; draws: number; attacks: number; hits: number }>();
  const coverage = Object.fromEntries(MECHANICS.map((mechanic) => [mechanic, 0])) as Record<MetricKey, number>;
  const durations: number[] = [];
  const mirrorStarts = new Map<string, { A: { games: number; wins: number }; B: { games: number; wins: number } }>();

  for (const bout of bouts) {
    durations.push(bout.rounds);
    const pairKey = `${bout.left}>${bout.right}`;
    const pair = matrix.get(pairKey) ?? { games: 0, wins: 0, draws: 0, attacks: 0, hits: 0 };
    pair.games += 1;
    if (bout.winner === "A") pair.wins += 1;
    if (!bout.winner) pair.draws += 1;
    pair.attacks += bout.sides.A.attacks;
    pair.hits += bout.sides.A.hits;
    matrix.set(pairKey, pair);
    if (bout.left === bout.right) {
      const starts = mirrorStarts.get(bout.left) ?? {
        A: { games: 0, wins: 0 },
        B: { games: 0, wins: 0 },
      };
      const startStats = starts[bout.startSide];
      startStats.games += 1;
      if (bout.winner === bout.startSide) startStats.wins += 1;
      mirrorStarts.set(bout.left, starts);
    }
    for (const mechanic of bout.mechanics) coverage[mechanic] += 1;

    for (const side of ["A", "B"] as Side[]) {
      const id = side === "A" ? bout.left : bout.right;
      const row = rows.get(id)!;
      const metric = bout.sides[side];
      row.games += 1;
      row.rounds += bout.rounds;
      row.attacks += metric.attacks;
      row.hits += metric.hits;
      row.damageFraction += metric.damageFraction;
      row.normalHits += metric.normalHits;
      row.normalDamageFraction += metric.normalDamageFraction;
      row.protectedHits += metric.protectedHits;
      row.protectedDamageFraction += metric.protectedDamageFraction;
      row.plans += metric.plans;
      row.energySpent += metric.energySpent;
      for (const action of Object.keys(row.actions) as ActionKind[]) row.actions[action] += metric.actions[action];
      for (const level of ENERGY_LEVELS) row.energyLevels[level] += metric.energyLevels[level];
      if (!bout.winner) row.draws += 1;
      else if ((side === "A" && bout.winner === "A") || (side === "B" && bout.winner === "B")) {
        row.wins += 1;
        const reason = bout.reason ?? "unbekannt";
        row.winReasons[reason] = (row.winReasons[reason] ?? 0) + 1;
      } else row.losses += 1;
    }
  }

  durations.sort((a, b) => a - b);
  const fighters = [...rows.values()].map((row) => {
    const actionTotal = Object.values(row.actions).reduce((sum, value) => sum + value, 0) || 1;
    return {
      id: row.id,
      name: NAMES[row.id],
      games: row.games,
      wins: row.wins,
      winRate: row.wins / row.games,
      losses: row.losses,
      draws: row.draws,
      meanRounds: row.rounds / row.games,
      actionShare: Object.fromEntries(
        (Object.keys(row.actions) as ActionKind[]).map((action) => [action, row.actions[action] / actionTotal]),
      ),
      attackHitRate: row.attacks ? row.hits / row.attacks : 0,
      meanHitDamageOfBody: row.hits ? row.damageFraction / row.hits : 0,
      meanUnprotectedHitDamageOfBody: row.normalHits ? row.normalDamageFraction / row.normalHits : 0,
      meanProtectedHitDamageOfBody: row.protectedHits ? row.protectedDamageFraction / row.protectedHits : 0,
      meanEnergyPerPlan: row.plans ? row.energySpent / row.plans : 0,
      energyShares: Object.fromEntries(
        ENERGY_LEVELS.map((energy) => [energy, row.energyLevels[energy] / row.plans]),
      ),
      winReasons: row.winReasons,
    };
  });
  const totalDuelCount = bouts.length || 1;
  return {
    ruleStage,
    duelCount: bouts.length,
    meanRounds: durations.reduce((sum, value) => sum + value, 0) / totalDuelCount,
    p90Rounds: durations[Math.min(durations.length - 1, Math.ceil(durations.length * 0.9) - 1)] ?? 0,
    betweenThreeAndTwelveRoundsRate: bouts.filter((bout) => bout.rounds >= 3 && bout.rounds <= 12).length / totalDuelCount,
    timeLimitDrawRate: bouts.filter((bout) => bout.reason === "Zeit").length / totalDuelCount,
    fighters,
    matrix: Object.fromEntries(matrix),
    mirrorStarts: Object.fromEntries(
      [...mirrorStarts].map(([id, starts]) => [
        id,
        {
          sideAWinRate: starts.A.games ? starts.A.wins / starts.A.games : 0,
          sideBWinRate: starts.B.games ? starts.B.wins / starts.B.games : 0,
          difference: starts.A.games && starts.B.games
            ? Math.abs(starts.A.wins / starts.A.games - starts.B.wins / starts.B.games)
            : null,
        },
      ]),
    ),
    mechanics: Object.fromEntries(
      MECHANICS.map((mechanic) => [mechanic, { duels: coverage[mechanic], rate: coverage[mechanic] / totalDuelCount }]),
    ),
    bouts,
  };
}

const results = STAGES.map((ruleStage) => {
  const bouts: Bout[] = [];
  for (const left of IDS) {
    for (const right of IDS) {
      for (let seed = 1; seed <= GAMES_PER_PAIR; seed += 1) {
        bouts.push(play(left, right, seed, ruleStage));
      }
    }
  }
  return summarize(ruleStage, bouts);
});

const report = {
  generatedAt: new Date().toISOString(),
  difficulty: DIFFICULTY,
  seedsPerOrderedPair: GAMES_PER_PAIR,
  maxRounds: MAX_ROUNDS,
  results,
};

const lines = [
  "ECHO//BRUCH · Simulationsbericht",
  `Erzeugt: ${report.generatedAt}`,
  `Schwierigkeit: ${DIFFICULTY} · Samen je geordneter Paarung: ${GAMES_PER_PAIR} · Rundendeckel: ${MAX_ROUNDS}`,
  "Jede geordnete Paarung tritt auf beiden Startseiten auf; Standardausrüstung aus SUGGESTED.",
];

for (const result of results) {
  lines.push("", `=== Regelstufe ${result.ruleStage} ===`);
  lines.push(`Duelle: ${result.duelCount} · Ø Runden: ${result.meanRounds.toFixed(2)} · P90: ${result.p90Rounds} · 3–12 Runden: ${(result.betweenThreeAndTwelveRoundsRate * 100).toFixed(1)}% · Zeit-Unentschieden: ${(result.timeLimitDrawRate * 100).toFixed(2)}%`);
  lines.push("Figur | Siege | Quote | Ø Runden | Trefferquote | ungeschützte Treffer/Körper | geschützte Treffer/Körper | Ø Energie | Angriff | Schutz | Bewegung | Einfluss");
  for (const fighter of result.fighters) {
    const actions = fighter.actionShare;
    lines.push(
      `${fighter.name} | ${fighter.wins}/${fighter.games} | ${(fighter.winRate * 100).toFixed(1)}% | ${fighter.meanRounds.toFixed(2)} | ${(fighter.attackHitRate * 100).toFixed(1)}% | ${(fighter.meanUnprotectedHitDamageOfBody * 100).toFixed(1)}% | ${(fighter.meanProtectedHitDamageOfBody * 100).toFixed(1)}% | ${fighter.meanEnergyPerPlan.toFixed(2)} | ${(actions.attack * 100).toFixed(1)}% | ${(actions.guard * 100).toFixed(1)}% | ${(actions.move * 100).toFixed(1)}% | ${(actions.influence * 100).toFixed(1)}%`,
    );
  }
  lines.push("", "Paarungsmatrix · Siege der Zeilenfigur / Duelle (geordnete Aufstellung)");
  lines.push(["", ...IDS.map((id) => NAMES[id])].join(" | "));
  for (const left of IDS) {
    lines.push(
      [NAMES[left], ...IDS.map((right) => {
        const cell = result.matrix[`${left}>${right}`];
        return `${cell.wins}/${cell.games}${cell.draws ? ` (${cell.draws})` : ""}`;
      })].join(" | "),
    );
  }
  lines.push("", "Trefferquote je geordneter Paarung");
  lines.push(["", ...IDS.map((id) => NAMES[id])].join(" | "));
  for (const left of IDS) {
    lines.push(
      [NAMES[left], ...IDS.map((right) => {
        const cell = result.matrix[`${left}>${right}`];
        return cell.attacks ? `${((cell.hits / cell.attacks) * 100).toFixed(1)}%` : "–";
      })].join(" | "),
    );
  }
  lines.push("", "Startspielervorteil in Spiegelduellen · Siegquoten A-Start / B-Start");
  for (const id of IDS) {
    const starts = result.mirrorStarts[id];
    lines.push(
      `${NAMES[id]} | ${(starts.sideAWinRate * 100).toFixed(1)}% / ${(starts.sideBWinRate * 100).toFixed(1)}% | Unterschied ${starts.difference == null ? "—" : `${(starts.difference * 100).toFixed(1)} Prozentpunkte`}`,
    );
  }
  lines.push("", "Energieverteilung je Figur (Planungen 0 / 1 / 2 / 3)");
  for (const fighter of result.fighters) {
    lines.push(`${fighter.name} | ${ENERGY_LEVELS.map((level) => `${(fighter.energyShares[level] * 100).toFixed(1)}%`).join(" / ")}`);
  }
  lines.push("", "Mechanikabdeckung · Duelle mit mindestens einer wirksamen Nutzung");
  for (const mechanic of MECHANICS) {
    const metric = result.mechanics[mechanic];
    lines.push(`${mechanic} | ${metric.duels}/${result.duelCount} | ${(metric.rate * 100).toFixed(1)}%`);
  }
}

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(resolve(OUTPUT_DIR, "echo-bruch-protokoll.txt"), lines.join("\n"));
writeFileSync(resolve(OUTPUT_DIR, "echo-bruch-bilanz.txt"), lines.join("\n"));
writeFileSync(resolve(OUTPUT_DIR, "echo-bruch-bilanz.json"), JSON.stringify(report, null, 2));
console.log(lines.join("\n"));
console.log(`\nGespeichert in ${OUTPUT_DIR}`);
