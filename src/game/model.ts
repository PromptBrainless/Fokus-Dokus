import {
  ARMORS,
  type ActionKind,
  type Character,
  CHARACTERS,
  type Difficulty,
  EDGES,
  type EchoKind,
  GEAR,
  type InfluenceMode,
  type MarkerKind,
  type ReactionKind,
  type RuleBreak,
  type Side,
  type StatusKind,
  SUGGESTED,
  WEAPONS,
  byId,
} from "./content";

export interface Echo {
  id: string;
  owner: Side;
  kind: EchoKind;
  field: number;
  charges: number;
  used: boolean;
  ttl: number;
}

export interface Core {
  kind: EchoKind;
  points: number;
  revealed: boolean;
}

export interface Marker {
  id: string;
  owner: Side;
  kind: MarkerKind;
  field: number;
  duration: number;
}

export interface Status {
  kind: StatusKind;
  rounds: number;
  power: number;
}

export interface Fighter {
  side: Side;
  characterId: string;
  weaponId: string;
  armorId: string;
  toolId: string;
  artifactId: string;
  items: { id: string; spent: boolean }[];
  field: number;
  body: number;
  bodyMax: number;
  energy: number;
  energyMax: number;
  bruch: number;
  bruchMax: number;
  statuses: Status[];
  echoes: Echo[];
  cores: Core[];
  lastAction: ActionKind | null;
  pattern: Record<ActionKind, number>;
  ruleBreak: boolean;
  collapse: boolean;
  stabilizeNext: boolean;
  marked: boolean;
  pursued: boolean;
  guardBonus: number;
  abilityRound: number;
  stoneRound: number;
  maskReady: boolean;
  nadelReady: boolean;
  convertReady: boolean;
  braceLeft: number;
  predictStrike: boolean;
  ketteUsed: boolean;
  spiegelUsed: boolean;
  leatherUsed: boolean;
  ignoreUsed: boolean;
  moved: boolean;
  flank: boolean;
  sheltered: boolean;
}

export interface Plan {
  action: ActionKind;
  energy: number;
  targetField: number | null;
  reaction: ReactionKind | null;
  itemId: string | null;
  ability: boolean;
  influence: InfluenceMode;
  echoId: string | null;
  ruleBreak: RuleBreak | null;
  retargetField: number | null;
  prediction: ActionKind | null;
  zeitnadel: boolean;
  mist: boolean;
  mask: boolean;
  freeConvert: boolean;
}

export interface GameState {
  round: number;
  startSide: Side;
  fighters: Record<Side, Fighter>;
  markers: Marker[];
  log: string[];
  winner: Side | null;
  winReason: string | null;
  over: boolean;
  seed: number;
  nextId: number;
  updatedRound: number;
}

export interface Setup {
  characterId: string;
  weaponId: string;
  armorId: string;
  toolId: string;
  artifactId: string;
  items: [string, string];
  field: number;
}

export interface Live {
  kraft: number;
  schutz: number;
  bewegung: number;
  kontrolle: number;
  tempo: number;
  kraftB: number;
  schutzB: number;
  moveB: number;
  konB: number;
  weapon: number;
  range: number;
  armor: number;
  moveRange: number;
}

const NEIGHBORS: Record<number, number[]> = {};
for (let i = 1; i <= 7; i++) NEIGHBORS[i] = [];
for (const [a, b] of EDGES) {
  NEIGHBORS[a].push(b);
  NEIGHBORS[b].push(a);
}

export function neighbors(id: number): number[] {
  return NEIGHBORS[id];
}

export function other(side: Side): Side {
  return side === "A" ? "B" : "A";
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function bonus(value: number): number {
  if (value <= 2) return 0;
  if (value <= 4) return 1;
  if (value <= 6) return 2;
  if (value <= 8) return 3;
  return 4;
}

export function roll(state: GameState): number {
  state.seed = (state.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(state.seed ^ (state.seed >>> 15), 1 | state.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function d6(state: GameState): number {
  return 1 + Math.floor(roll(state) * 6);
}

export function uid(state: GameState, prefix: string): string {
  state.nextId += 1;
  return `${prefix}${state.nextId}`;
}

export function characterOf(id: string): Character {
  return byId(CHARACTERS, id);
}

export function hasStatus(f: Fighter, kind: StatusKind): boolean {
  return f.statuses.some((s) => s.kind === kind);
}

export function isOpen(f: Fighter): boolean {
  return f.bruch >= Math.ceil(f.bruchMax / 2) || hasStatus(f, "open");
}

export function liveStats(f: Fighter): Live {
  const c = characterOf(f.characterId);
  const weapon = byId(WEAPONS, f.weaponId);
  const armor = byId(ARMORS, f.armorId);
  let kraft = c.kraft;
  let schutz = c.schutz;
  let bewegung = c.bewegung;
  let kontrolle = c.kontrolle + armor.kontrolle;
  let tempo = c.tempo + weapon.tempo + armor.tempo;
  let kraftB = bonus(kraft);
  let schutzB = bonus(schutz) + f.guardBonus;
  let moveB = bonus(bewegung);
  let konB = bonus(kontrolle);
  let moveRange = 1 + Math.floor(bewegung / 3);
  if (f.armorId === "platte") moveRange -= 1;
  if (f.toolId === "greifhaken" || f.artifactId === "greifhaken") {
    moveB += 1;
    tempo += 1;
    moveRange += 1;
  }
  if (f.toolId === "rauch" || f.artifactId === "rauch") konB += 1;
  if (f.toolId === "brecheisen" || f.artifactId === "brecheisen") kraftB += 1;
  if (f.toolId === "anker" || f.artifactId === "anker") {
    schutzB += 1;
    moveB -= 1;
  }
  if (f.toolId === "spiegelkern" || f.artifactId === "spiegelkern") konB += 2;
  if (f.toolId === "zeitnadel" || f.artifactId === "zeitnadel") tempo += 2;
  if (f.toolId === "bruchstein" || f.artifactId === "bruchstein") konB -= 1;
  if (f.toolId === "maske" || f.artifactId === "maske") {
    moveB += 1;
    konB += 1;
  }
  if (f.toolId === "greifhaken") {
    /* already applied */
  }
  moveB = Math.max(0, moveB);
  konB = Math.max(0, konB);
  return {
    kraft,
    schutz,
    bewegung,
    kontrolle,
    tempo,
    kraftB,
    schutzB,
    moveB,
    konB,
    weapon: weapon.value,
    range: weapon.range,
    armor: armor.value,
    moveRange: Math.max(1, moveRange),
  };
}

export function derivedMax(setup: Setup): { body: number; energy: number; bruch: number } {
  const c = characterOf(setup.characterId);
  const armor = byId(ARMORS, setup.armorId);
  const gear = [setup.toolId, setup.artifactId];
  let body = 12 + c.schutz + armor.body;
  let energy = 4 + Math.floor(c.bewegung / 3);
  let bruch = 4 + Math.floor(c.schutz / 2);
  if (gear.includes("spiegelkern")) energy -= 1;
  if (gear.includes("zeitnadel")) body -= 2;
  if (gear.includes("bruchstein")) bruch += 2;
  energy = Math.max(3, Math.min(8, energy));
  return { body, energy, bruch };
}

export function suggestedSetup(characterId: string, side: Side): Setup {
  const kit = SUGGESTED[characterId];
  return {
    characterId,
    weaponId: kit.weaponId,
    armorId: kit.armorId,
    toolId: kit.toolId,
    artifactId: kit.artifactId,
    items: [...kit.items],
    field: side === "A" ? 2 : 5,
  };
}

export function createFighter(setup: Setup, side: Side): Fighter {
  const max = derivedMax(setup);
  const c = characterOf(setup.characterId);
  const gear = [setup.toolId, setup.artifactId];
  return {
    side,
    characterId: setup.characterId,
    weaponId: setup.weaponId,
    armorId: setup.armorId,
    toolId: setup.toolId,
    artifactId: setup.artifactId,
    items: setup.items.map((id) => ({ id, spent: false })),
    field: setup.field,
    body: max.body,
    bodyMax: max.body,
    energy: 2,
    energyMax: max.energy,
    bruch: 0,
    bruchMax: max.bruch,
    statuses: [],
    echoes: [],
    cores: c.cores.map((kind) => ({ kind, points: 3, revealed: false })),
    lastAction: null,
    pattern: { attack: 0, guard: 0, move: 0, influence: 0 },
    ruleBreak: true,
    collapse: false,
    stabilizeNext: false,
    marked: false,
    pursued: false,
    guardBonus: 0,
    abilityRound: 0,
    stoneRound: 0,
    maskReady: gear.includes("maske"),
    nadelReady: gear.includes("zeitnadel"),
    convertReady: gear.includes("spiegelkern"),
    braceLeft: 0,
    predictStrike: false,
    ketteUsed: false,
    spiegelUsed: false,
    leatherUsed: false,
    ignoreUsed: false,
    moved: false,
    flank: false,
    sheltered: false,
  };
}

export function createGame(a: Setup, b: Setup, seed = Date.now() % 1_000_000): GameState {
  return {
    round: 0,
    startSide: "A",
    fighters: { A: createFighter(a, "A"), B: createFighter(b, "B") },
    markers: [],
    log: [],
    winner: null,
    winReason: null,
    over: false,
    seed,
    nextId: 1,
    updatedRound: 0,
  };
}

export function emptyPlan(): Plan {
  return {
    action: "guard",
    energy: 0,
    targetField: null,
    reaction: null,
    itemId: null,
    ability: false,
    influence: "spur",
    echoId: null,
    ruleBreak: null,
    retargetField: null,
    prediction: null,
    zeitnadel: false,
    mist: false,
    mask: false,
    freeConvert: false,
  };
}

export function distance(from: number, to: number): number {
  if (from === to) return 0;
  const seen = new Set<number>([from]);
  let edge = [from];
  let steps = 0;
  while (edge.length) {
    steps += 1;
    const next: number[] = [];
    for (const id of edge) {
      for (const n of neighbors(id)) {
        if (seen.has(n)) continue;
        if (n === to) return steps;
        seen.add(n);
        next.push(n);
      }
    }
    edge = next;
  }
  return 99;
}

export function shortestPath(from: number, to: number, blocked: number | null): number[] | null {
  if (from === to) return [from];
  const prev = new Map<number, number>();
  const seen = new Set<number>([from]);
  let edge = [from];
  while (edge.length) {
    const next: number[] = [];
    for (const id of edge) {
      for (const n of neighbors(id)) {
        if (seen.has(n)) continue;
        if (blocked != null && n === blocked && n !== to) continue;
        seen.add(n);
        prev.set(n, id);
        if (n === to) {
          const path = [to];
          let cur = to;
          while (cur !== from) {
            cur = prev.get(cur)!;
            path.push(cur);
          }
          return path.reverse();
        }
        next.push(n);
      }
    }
    edge = next;
  }
  return null;
}

export function reachable(from: number, steps: number, blocked: number): number[] {
  const found = new Set<number>();
  let edge = [from];
  const seen = new Set<number>([from]);
  for (let i = 0; i < steps; i++) {
    const next: number[] = [];
    for (const id of edge) {
      for (const n of neighbors(id)) {
        if (seen.has(n) || n === blocked) continue;
        seen.add(n);
        found.add(n);
        next.push(n);
      }
    }
    edge = next;
  }
  return [...found].sort((a, b) => a - b);
}

export function pathInteriors(from: number, to: number): number[] {
  const path = shortestPath(from, to, null);
  if (!path || path.length < 3) return [];
  return path.slice(1, -1);
}

export function note(state: GameState, line: string) {
  state.log.unshift(line);
}

export function addStatus(f: Fighter, kind: StatusKind, rounds: number, power = 0) {
  const existing = f.statuses.find((s) => s.kind === kind);
  if (existing) {
    existing.rounds = Math.max(existing.rounds, rounds);
    existing.power = Math.max(existing.power, power);
    return;
  }
  f.statuses.push({ kind, rounds, power });
}

export function removeStatus(f: Fighter, kind: StatusKind) {
  f.statuses = f.statuses.filter((s) => s.kind !== kind);
}

export function markerAt(state: GameState, field: number): Marker | undefined {
  return state.markers.find((m) => m.field === field);
}

export function placeMarker(
  state: GameState,
  owner: Side,
  kind: MarkerKind,
  field: number,
  duration: number,
) {
  state.markers = state.markers.filter((m) => m.field !== field);
  state.markers.push({ id: uid(state, "m"), owner, kind, field, duration });
}

export function pushEcho(state: GameState, echo: Omit<Echo, "id" | "used" | "ttl"> & { ttl?: number }) {
  const owner = state.fighters[echo.owner];
  if (owner.echoes.length >= 4) {
    owner.echoes.sort((a, b) => a.charges - b.charges);
    owner.echoes.shift();
  }
  owner.echoes.push({
    id: uid(state, "e"),
    used: true,
    ttl: echo.ttl ?? 0,
    ...echo,
  });
}

export function influenceRange(state: GameState, f: Fighter): number {
  const echo = f.echoes.find((e) => e.kind === "influence" && e.field === f.field && e.charges > 0);
  return echo ? 4 : 3;
}

export function moveSteps(f: Fighter, energy: number, ability: boolean): number {
  if (ability && f.characterId === "laeuferin") return 2;
  const stats = liveStats(f);
  let steps = stats.moveRange;
  if (energy >= 1) steps += 1;
  if (energy >= 2) steps += 1;
  if (hasStatus(f, "bound")) steps -= 1;
  return Math.max(0, steps);
}

export function actionTempo(action: ActionKind): number {
  if (action === "guard") return -1;
  if (action === "move") return 2;
  return 0;
}

export function actionValue(f: Fighter, plan: Plan): number {
  const stats = liveStats(f);
  let value = stats.tempo + actionTempo(plan.action) + plan.energy;
  if (plan.zeitnadel) value += 2;
  if (f.predictStrike && plan.action) value += 2;
  return value;
}

export function botSetup(player: Setup, difficulty: Difficulty): Setup {
  if (difficulty === "brutal") return suggestedSetup("brecher", "B");
  if (difficulty === "bedacht") return suggestedSetup("waechter", "B");
  const c = characterOf(player.characterId);
  if (c.bewegung >= 7) return suggestedSetup("jaeger", "B");
  if (c.kraft >= 7) return suggestedSetup("waechter", "B");
  if (c.kontrolle >= 8) return suggestedSetup("laeuferin", "B");
  return suggestedSetup("archivar", "B");
}

export function gearName(id: string): string {
  return byId(GEAR, id).name;
}
