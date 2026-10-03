import { ARMORS, ECHO_LABEL, byId } from "./content.ts";
import type { ActionKind, EchoKind, Side } from "./content.ts";
import {
  actionValue,
  addStatus,
  clone,
  d6,
  distance,
  hasStatus,
  influenceRange,
  isOpen,
  liveStats,
  markerAt,
  moveSteps,
  note,
  neighbors,
  other,
  pathInteriors,
  placeMarker,
  pushEcho,
  reachable,
  removeStatus,
  shortestPath,
  type Echo,
  type Fighter,
  type GameState,
  type Plan,
} from "./model.ts";
import {
  BLOCK_DAMAGE,
  BLOCK_ENERGY_DAMAGE,
  BIND_BRUCH_REDUCTION,
  BLIND_BRUCH,
  BOUND_DURATION,
  BODY_LOSS_PER_ROUND_WOUNDED,
  CONFUSED_DURATION,
  CORE_ATTACK_POINTS,
  CORE_ATTACK_POINTS_WITH_THREE_ENERGY,
  CRITICAL_FACE,
  DEF_BASE,
  DESTROYED_CORE_BRUCH,
  DESTROYED_CORE_ENERGY_LOSS,
  ECHO_SPLITTER_CHARGES,
  ENERGY_CELL_AMOUNT,
  ENERGY_REGEN,
  ENERGY_RAW_BONUS,
  FIELD_MARKER_DURATION,
  HEAL_AMOUNT,
  HARD_HIT,
  MAX_ATTACK_ENERGY,
  MAX_BRUCH_PER_HIT,
  MAX_ECHO_CHARGES,
  MIN_ENERGY,
  MIN_HIT,
  WOUND_DURATION,
} from "./tuning.ts";

export interface Frame {
  kicker: string;
  title: string;
  detail: string;
  tone: "idle" | "hit" | "miss" | "guard" | "move" | "echo" | "break" | "win";
  focus: number[];
  actor: Side | null;
  dice: number | null;
  state: GameState;
}

export function armorReductionValue(protectionBonus: number, armor: number): number {
  return Math.ceil((Math.max(0, protectionBonus) + Math.max(0, armor)) / 2);
}

export function minimumHitDamage(raw: number, protectionBonus: number, armor: number): number {
  return Math.max(MIN_HIT, raw - armorReductionValue(protectionBonus, armor));
}

export function protectedDamage(damage: number, reduction: number): number {
  return Math.max(1, damage - reduction);
}

export function attackPreview(state: GameState, side: Side, plan: Plan) {
  const attacker = state.fighters[side];
  const defender = state.fighters[other(side)];
  const attackStats = liveStats(attacker);
  const defenseStats = liveStats(defender);
  const dist = distance(attacker.field, defender.field);
  const marked = defender.marked && attacker.characterId === "jaeger";
  const selectedEcho = attacker.echoes.find((echo) => echo.id === plan.echoId && echo.charges > 0);
  const attack =
    attackStats.weapon +
    attackStats.kraftB +
    plan.energy +
    (attacker.pursued ? 1 : 0) +
    (marked ? 2 : 0);
  let defense = DEF_BASE + defenseStats.schutzB + defenseStats.moveB;
  if (attacker.weaponId === "bogen") defense -= Math.min(defenseStats.moveB, 1);
  if (
    state.markers.some((marker) => marker.field === defender.field && marker.kind === "mist") ||
    defender.echoes.some((echo) => echo.kind === "mist" && echo.field === defender.field && echo.charges > 0)
  ) {
    defense += 2;
  }
  const threshold = defense - attack;
  const inRange =
    dist <= attackStats.range &&
    !(attacker.weaponId === "bogen" && hasStatus(attacker, "bound")) &&
    !(hasStatus(attacker, "confused") && plan.targetField !== defender.field);
  const raw =
    attackStats.weapon +
    attackStats.kraftB +
    (ENERGY_RAW_BONUS[Math.min(MAX_ATTACK_ENERGY, plan.energy)] ?? 0) +
    (selectedEcho?.kind === "attack" && selectedEcho.field === attacker.field ? 1 : 0) +
    (state.markers.some((marker) => marker.field === defender.field && marker.kind === "brand") ? 1 : 0) +
    (plan.ability && attacker.characterId === "brecher" ? 2 : 0) -
    (dist === 0 && attacker.weaponId === "speer" ? 1 : 0);
  const protection = Math.max(0, defenseStats.schutzB - (marked ? 1 : 0));
  const base = minimumHitDamage(raw, protection, defenseStats.armor);
  const openBonus = isOpen(defender) ? 1 : 0;
  const guarded = defender.statuses.find((status) => status.kind === "guarded");
  const successfulDamage = Array.from({ length: 6 }, (_, index) => {
    const die = index + 1;
    if (!inRange || die < threshold) return null;
    let damage = base + openBonus;
    if (guarded) damage = protectedDamage(damage, guarded.power || BLOCK_DAMAGE);
    return die === CRITICAL_FACE ? damage * 2 : damage;
  }).filter((value): value is number => value !== null);
  const protectedHits = Array.from({ length: 6 }, (_, index) => {
    const die = index + 1;
    if (!inRange || die < threshold) return null;
    const damage = protectedDamage(base + openBonus, plan.energy >= 1 ? BLOCK_ENERGY_DAMAGE : BLOCK_DAMAGE);
    return die === CRITICAL_FACE ? damage * 2 : damage;
  }).filter((value): value is number => value !== null);
  const successfulRolls = inRange ? Math.max(0, Math.min(6, 7 - threshold)) : 0;
  return {
    chance: Math.round((successfulRolls / 6) * 100),
    damage: damageRange(successfulDamage),
    protectedDamage: damageRange(protectedHits.map((damage) => protectedDamage(damage, BLOCK_DAMAGE))),
    bruch: inRange
      ? Math.min(
          MAX_BRUCH_PER_HIT,
          (plan.energy >= 2 ? 1 : 0) +
            (base + openBonus >= HARD_HIT ? 1 : 0) +
            (fullRules(state) ? 1 : 0),
        )
      : 1,
    cost: plan.energy,
  };
}

function damageRange(values: number[]): [number, number] {
  if (!values.length) return [0, 0];
  return [Math.min(...values), Math.max(...values)];
}

const CONVERT: Partial<Record<EchoKind, EchoKind>> = {
  attack: "trap",
  guard: "barrier",
  move: "mist",
  influence: "rift",
};

function name(f: Fighter): string {
  const map: Record<string, string> = {
    brecher: "Brecher",
    laeuferin: "Läuferin",
    archivar: "Archivar",
    waechter: "Wächter",
    jaeger: "Jäger",
  };
  return map[f.characterId] ?? f.characterId;
}

function push(frames: Frame[], state: GameState, frame: Omit<Frame, "state">) {
  frames.push({ ...frame, state: clone(state) });
}

function livingCores(f: Fighter) {
  return f.cores.filter((c) => c.points > 0);
}

function fullRules(state: GameState): boolean {
  return state.ruleStage !== "kern";
}

function killBody(state: GameState, side: Side): boolean {
  if (state.fighters[side].body > 0) return false;
  state.over = true;
  state.winner = other(side);
  state.winReason = "Körper";
  return true;
}

function killEcho(state: GameState, side: Side): boolean {
  if (livingCores(state.fighters[side]).length > 0) return false;
  state.over = true;
  state.winner = other(side);
  state.winReason = "Echo";
  return true;
}

function gainBruch(state: GameState, f: Fighter, amount: number, plan: Plan | null): number {
  let n = amount;
  if (n <= 0) return 0;
  if (f.armorId === "ketten" && !f.ketteUsed) {
    n = Math.max(0, n - 1);
    f.ketteUsed = true;
  }
  if (plan?.reaction === "stabilize" && n >= 2 && f.energy >= 1) {
    n -= 1;
    f.energy -= 1;
    f.stabilizeNext = true;
    note(state, `${name(f)} stabilisiert und verhindert 1 Bruch.`);
  }
  if (f.braceLeft > 0 && n > 0) {
    const prevented = Math.min(f.braceLeft, n, 2);
    n -= prevented;
    f.braceLeft -= prevented;
    if (prevented) note(state, `${name(f)} bricht die Regel und hält ${prevented} Bruch ab.`);
  }
  f.bruch = Math.min(f.bruchMax, f.bruch + n);
  if (f.bruch >= f.bruchMax) f.collapse = true;
  return n;
}

function hurt(state: GameState, f: Fighter, amount: number): number {
  const dealt = Math.max(0, amount);
  f.body = Math.max(0, f.body - dealt);
  return dealt;
}

function tickStatuses(f: Fighter, kinds: Fighter["statuses"][number]["kind"][]) {
  f.statuses = f.statuses
    .map((s) => (kinds.includes(s.kind) ? { ...s, rounds: s.rounds - 1 } : s))
    .filter((s) => s.rounds > 0);
}

export function beginRound(input: GameState): { state: GameState; line: string } {
  const state = clone(input);
  if (state.over) return { state, line: "Das Duell ist entschieden." };
  state.round += 1;
  const lines: string[] = [];
  for (const side of ["A", "B"] as Side[]) {
    const f = state.fighters[side];
    const gain = f.stabilizeNext ? Math.max(0, ENERGY_REGEN - 1) : ENERGY_REGEN;
    f.stabilizeNext = false;
    f.energy = Math.min(f.energyMax, f.energy + gain);
    f.guardBonus = 0;
    f.braceLeft = 0;
    f.predictStrike = false;
    f.ketteUsed = false;
    f.spiegelUsed = false;
    f.leatherUsed = false;
    f.ignoreUsed = false;
    f.pursued = false;
    f.moved = false;
    for (const echo of f.echoes) echo.used = false;
    tickStatuses(f, ["bound", "confused", "open", "guarded"]);
    lines.push(`${name(f)} +${gain} Energie`);
  }
  state.markers = state.markers
    .map((m) => ({ ...m, duration: m.duration - 1 }))
    .filter((m) => m.duration > 0);
  state.updatedRound = state.round;
  const line = `Runde ${state.round}. ${lines.join(" · ")}.`;
  note(state, line);
  return { state, line };
}

function spendEchoSecure(state: GameState, f: Fighter, echo: Echo, plan: Plan | null): boolean {
  if (echo.charges > 0) return false;
  if (plan?.reaction === "secure" && f.energy >= 2) {
    f.energy -= 2;
    echo.charges = 1;
    gainBruch(state, f, 1, null);
    note(state, `${name(f)} sichert ein Echo und nimmt 1 Bruch.`);
    return true;
  }
  return false;
}

function dropDeadEchoes(state: GameState, f: Fighter, plan: Plan | null) {
  const kept: Echo[] = [];
  for (const echo of f.echoes) {
    if (echo.charges <= 0) {
      if (spendEchoSecure(state, f, echo, plan)) kept.push(echo);
      continue;
    }
    kept.push(echo);
  }
  f.echoes = kept;
}

function ownEcho(f: Fighter, id: string | null): Echo | undefined {
  if (!id) return f.echoes[0];
  return f.echoes.find((e) => e.id === id) ?? f.echoes[0];
}

function applyItem(state: GameState, f: Fighter, foe: Fighter, plan: Plan) {
  if (!plan.itemId) return;
  const item = f.items.find((i) => i.id === plan.itemId && !i.spent);
  if (!item) return;
  item.spent = true;
  if (item.id === "heil") {
    f.body = Math.min(f.bodyMax, f.body + HEAL_AMOUNT);
    removeStatus(f, "wounded");
    note(state, `${name(f)} nimmt das Heilmittel. +${HEAL_AMOUNT} Körper.`);
  } else if (item.id === "zelle") {
    f.energy = Math.min(f.energyMax, f.energy + ENERGY_CELL_AMOUNT);
    note(state, `${name(f)} setzt die Energiezelle ein.`);
  } else if (item.id === "binde") {
    f.bruch = Math.max(0, f.bruch - BIND_BRUCH_REDUCTION);
    if (f.bruch < f.bruchMax) f.collapse = false;
    addStatus(f, "bound", BOUND_DURATION);
    note(state, `${name(f)} bindet den Bruch und wird gebunden.`);
  } else if (item.id === "splitter") {
    const echo = ownEcho(f, plan.echoId);
    if (echo) {
      echo.charges = Math.min(MAX_ECHO_CHARGES, echo.charges + ECHO_SPLITTER_CHARGES);
      echo.used = true;
      note(state, `${name(f)} speist ein Echo mit dem Splitter.`);
    }
  } else if (item.id === "blend") {
    if (hasStatus(foe, "confused")) gainBruch(state, foe, BLIND_BRUCH, null);
    else addStatus(foe, "confused", CONFUSED_DURATION);
    note(state, `${name(f)} wirft Blendpulver.`);
  }
}

function freeNeighbor(f: Fighter, foe: Fighter, awayFrom?: number): number | null {
  const options = neighbors(f.field).filter((n) => n !== foe.field);
  if (!options.length) return null;
  if (awayFrom == null) return options[0];
  options.sort((a, b) => distance(b, awayFrom) - distance(a, awayFrom));
  return options[0];
}

function shift(state: GameState, f: Fighter, foe: Fighter, dest: number): boolean {
  if (dest === foe.field) return false;
  const trapped = fullRules(state)
    ? foe.echoes.find((e) => e.kind === "trap" && e.field === dest && e.charges > 0)
    : undefined;
  f.field = dest;
  f.moved = true;
  if (foe.characterId === "jaeger") foe.pursued = true;
  if (trapped && !(f.characterId === "laeuferin" && !f.ignoreUsed)) {
    trapped.charges -= 1;
    trapped.used = true;
    hurt(state, f, 2);
    gainBruch(state, f, 1, null);
    note(state, `${name(f)} läuft in eine Falle.`);
    dropDeadEchoes(state, foe, null);
  } else if (trapped && f.characterId === "laeuferin") {
    f.ignoreUsed = true;
  }
  return true;
}

function leaveField(state: GameState, f: Fighter, plan: Plan | null) {
  const marker = markerAt(state, f.field);
  if (marker?.kind === "rift") {
    gainBruch(state, f, 1, plan);
    marker.duration -= 1;
    note(state, `${name(f)} reißt sich vom Riss los.`);
  }
  const rift = [...state.fighters.A.echoes, ...state.fighters.B.echoes].find(
    (e) => e.kind === "rift" && e.field === f.field && e.charges > 0 && e.owner !== f.side,
  );
  if (rift) {
    gainBruch(state, f, 1, plan);
    rift.charges -= 1;
    rift.used = true;
  }
}

function doMove(state: GameState, f: Fighter, foe: Fighter, plan: Plan, steps: number, dest: number) {
  const path = shortestPath(f.field, dest, foe.field);
  if (!path || path.length - 1 > steps || path.length < 2) {
    note(state, `${name(f)} findet keinen Weg.`);
    return;
  }
  if (f.armorId === "leder" && !f.leatherUsed && plan.energy > 0) {
    f.energy = Math.min(f.energyMax, f.energy + 1);
    f.leatherUsed = true;
  }
  const moveEcho = fullRules(state)
    ? f.echoes.find((echo) => echo.id === plan.echoId && echo.kind === "move" && echo.charges > 0)
    : undefined;
  const bind = markerAt(state, f.field);
  const crossesBind =
    fullRules(state) &&
    (hasStatus(f, "bound") ||
      (!moveEcho && (path.some((field) => markerAt(state, field)?.kind === "bind") || bind?.kind === "bind")));
  if (crossesBind && f.energy < 1) {
    note(state, `${name(f)} kann die zusätzliche Energie für Gebundenheit oder die Fessel nicht zahlen.`);
    return;
  }
  if (crossesBind) f.energy -= 1;
  if (moveEcho) {
    moveEcho.charges -= 1;
    moveEcho.used = true;
    note(state, `${name(f)} aktiviert ein Bewegungs-Echo und erhält +1 Feld Weite.`);
  }
  leaveField(state, f, plan);
  const land = path[path.length - 1];
  shift(state, f, foe, land);
  if (fullRules(state) && (plan.energy >= 2 || (plan.ability && f.characterId === "laeuferin"))) {
    const mirror = markerAt(state, f.field);
    let charges = 1;
    if (mirror?.kind === "mirror") {
      charges += 1;
      state.markers = state.markers.filter((m) => m.id !== mirror.id);
    }
    pushEcho(state, { owner: f.side, kind: "move", field: f.field, charges: Math.min(MAX_ECHO_CHARGES, charges) });
    note(state, `${name(f)} hinterlässt ein Bewegungs-Echo auf Feld ${f.field}.`);
  }
  note(state, `${name(f)} geht nach Feld ${f.field}.`);
  if (moveEcho) dropDeadEchoes(state, f, plan);
}

function attackEchoBonus(f: Fighter, echoId: string | null): { raw: number; bruch: number; echo: boolean } {
  const echo = f.echoes.find(
    (e) => e.id === echoId && e.kind === "attack" && e.field === f.field && e.charges > 0,
  );
  if (!echo) return { raw: 0, bruch: 0, echo: false };
  const bruch = echo.charges >= 2 ? 1 : 0;
  echo.charges -= 1;
  echo.used = true;
  return { raw: 1, bruch, echo: true };
}

function guardEchoSoak(f: Fighter, echoId: string | null): { dmg: number; bruch: number } {
  const echo = f.echoes.find(
    (e) => e.id === echoId && e.kind === "guard" && e.field === f.field && e.charges > 0,
  );
  if (!echo) return { dmg: 0, bruch: 0 };
  const bruch = echo.charges >= 2 ? 1 : 0;
  echo.charges -= 1;
  echo.used = true;
  return { dmg: 2, bruch };
}

function resolveAttack(
  state: GameState,
  attacker: Fighter,
  defender: Fighter,
  plan: Plan,
  defenderPlan: Plan | null,
  opts: { rawMod: number; attackMod: number; ignoreSchutz: number; noCrit: boolean; tag: string },
): { hit: boolean; ended: boolean } {
  const aStats = liveStats(attacker);
  const dStats = liveStats(defender);
  const range = plan.ability && attacker.characterId === "brecher" ? 1 : aStats.range;
  const dist = distance(attacker.field, defender.field);
  const interiors = pathInteriors(attacker.field, defender.field);
  const blockedByBarrier = interiors.some((field) =>
    [...attacker.echoes, ...defender.echoes].some(
      (e) => e.kind === "barrier" && e.field === field && e.charges > 0,
    ),
  );
  if (attacker.weaponId === "bogen" && hasStatus(attacker, "bound")) {
    note(state, `${name(attacker)} kann gebunden den Bogen nicht spannen.`);
    return { hit: false, ended: false };
  }
  if (
    dist > range ||
    (plan.targetField != null && plan.targetField !== defender.field) ||
    (attacker.weaponId === "kurzschwert" && blockedByBarrier)
  ) {
    if (dist > range) {
      gainBruch(state, attacker, 1, null);
      note(state, `${name(attacker)} schlägt ins Leere und erhält 1 Bruch. Kosten bleiben verbraucht.`);
    } else {
      note(state, `${name(attacker)} verfehlt. Das Ziel ist bei der Ausführung ungültig.`);
    }
    return { hit: false, ended: false };
  }

  let attack =
    aStats.weapon +
    aStats.kraftB +
    plan.energy +
    opts.attackMod +
    (fullRules(state) && attacker.pursued ? 1 : 0);
  const marked = fullRules(state) && defender.marked && attacker.characterId === "jaeger";
  if (marked) attack += 2;
  const echoB = fullRules(state)
    ? attackEchoBonus(attacker, plan.echoId)
    : { raw: 0, bruch: 0, echo: false };
  if (echoB.echo) note(state, `${name(attacker)} aktiviert ein Angriffs-Echo.`);
  let defense = DEF_BASE + dStats.schutzB + dStats.moveB;
  if (attacker.weaponId === "bogen") defense -= Math.min(dStats.moveB, 1);
  const mist =
    markerAt(state, defender.field)?.kind === "mist" ||
    defender.echoes.some((e) => e.kind === "mist" && e.field === defender.field && e.charges > 0);
  if (mist) defense += 2;
  if (fullRules(state) && echoB.echo && defender.armorId === "spiegel" && !defender.spiegelUsed) {
    defense += 1;
    defender.spiegelUsed = true;
  }
  const die = d6(state);
  const hit = die + attack >= defense;
  const diceNote = `Würfel ${die}. Angriff ${attack} gegen Verteidigung ${defense}.`;
  if (!hit) {
    if (marked) defender.marked = false;
    if (attacker.weaponId === "hammer") {
      gainBruch(state, attacker, 1, plan);
      note(state, `${name(attacker)} verfehlt mit dem Hammer und nimmt 1 Bruch. ${diceNote}`);
    } else note(state, `${name(attacker)} verfehlt. ${diceNote}`);
    return { hit: false, ended: false };
  }

  const energyRaw = ENERGY_RAW_BONUS[Math.min(MAX_ATTACK_ENERGY, plan.energy)] ?? 0;
  const energyBruch = plan.energy >= 2 ? 1 : 0;
  const brand = fullRules(state) && markerAt(state, defender.field)?.kind === "brand" ? 1 : 0;
  const raw =
    aStats.weapon +
    aStats.kraftB +
    energyRaw +
    echoB.raw +
    brand +
    opts.rawMod -
    (dist === 0 && attacker.weaponId === "speer" ? 1 : 0);
  const protection = Math.max(0, dStats.schutzB - (marked ? 1 : 0) - opts.ignoreSchutz);
  const protectionReduction = armorReductionValue(protection, aArmor(defender));
  let end = Math.max(MIN_HIT, raw - protectionReduction);
  if (plan.ability && attacker.characterId === "brecher") {
    removeStatus(defender, "guarded");
    const shield = defender.echoes.find((e) => e.kind === "guard");
    if (shield) shield.charges = Math.max(0, shield.charges - 1);
  }
  if (blockedByBarrier) end = Math.max(0, end - 2);
  const soak = guardEchoSoak(defender, defenderPlan?.echoId ?? null);
  if (soak.dmg) note(state, `${name(defender)} aktiviert ein Schutz-Echo und verhindert ${soak.dmg} Schaden.`);
  end = Math.max(0, end - soak.dmg);
  const guarded = defender.statuses.find((s) => s.kind === "guarded");
  let bruchMod = energyBruch + echoB.bruch - soak.bruch;
  if (guarded) {
    end = Math.max(1, end - (guarded.power || BLOCK_DAMAGE));
    bruchMod -= 1;
    removeStatus(defender, "guarded");
  }
  const parried = Boolean(
    guarded && defenderPlan?.reaction === "parry" && defenderPlan.action === "guard",
  );
  if (parried) {
    end = Math.max(1, end - 2);
    defender.energy = Math.min(defender.energyMax, defender.energy + 1);
    note(state, `${name(defender)} pariert: zusätzlich 2 Schaden verhindert und 1 Energie erhalten.`);
  }
  const fieldGuard = markerAt(state, defender.field);
  if (fieldGuard?.kind === "guard") {
    end = Math.max(guarded ? 1 : 0, end - 2);
    state.markers = state.markers.filter((m) => m.id !== fieldGuard.id);
  }
  if (isOpen(defender)) {
    end += 1;
    bruchMod += 1;
  }
  const crit = die === CRITICAL_FACE && !opts.noCrit;
  if (crit) {
    end *= 2;
    bruchMod += 1;
  }
  if (attacker.weaponId === "hammer") bruchMod += 1;
  if (defenderPlan?.reaction === "dodge" && defenderPlan.action === "move" && defender.energy >= 2) {
    defender.energy -= 2;
    const away = freeNeighbor(defender, attacker, attacker.field);
    if (away != null) {
      leaveField(state, defender, defenderPlan);
      shift(state, defender, attacker, away);
    }
    end = Math.max(guarded ? 1 : 0, end - 2);
    note(state, `${name(defender)} weicht aus. −2 Körper.`);
  }

  if (end >= HARD_HIT) bruchMod += 1;
  const calculatedDamage = end;
  const dealt = hurt(state, defender, calculatedDamage);
  const bruch = gainBruch(
    state,
    defender,
    Math.min(MAX_BRUCH_PER_HIT, Math.max(0, bruchMod)),
    defenderPlan,
  );
  if (marked) {
    pushEcho(state, { owner: attacker.side, kind: "attack", field: attacker.field, charges: 2 });
    note(state, `${name(attacker)} erzeugt ein Angriffs-Echo mit 2 Ladungen.`);
  }
  defender.marked = false;
  if (crit && fullRules(state)) {
    pushEcho(state, { owner: attacker.side, kind: "attack", field: attacker.field, charges: 2 });
    note(state, `${name(attacker)} erzeugt durch den kritischen Treffer ein Angriffs-Echo mit 2 Ladungen.`);
    if (!guarded && dealt > 0) addStatus(defender, "wounded", WOUND_DURATION);
  }
  if (fullRules(state)) dropDeadEchoes(state, attacker, plan);
  if (attacker.weaponId === "kurzschwert") {
    const back = freeNeighbor(attacker, defender, defender.field);
    if (back != null) attacker.field = back;
  }
  if (
    attacker.weaponId === "kette" &&
    attacker.energy >= 1 &&
    defender.artifactId !== "anker" &&
    defender.toolId !== "anker"
  ) {
    const closer = neighbors(defender.field)
      .filter((n) => n !== attacker.field && distance(n, attacker.field) < distance(defender.field, attacker.field))
      .sort((a, b) => distance(a, attacker.field) - distance(b, attacker.field))[0];
    if (closer != null && closer !== attacker.field) {
      attacker.energy -= 1;
      defender.field = closer;
      note(state, `${name(attacker)} zieht ${name(defender)} heran.`);
    }
  }
  note(
    state,
    `${name(attacker)} trifft ${name(defender)}${opts.tag}. ${diceNote} Rohschaden ${aStats.weapon} Waffe + ${aStats.kraftB} Kraft + ${energyRaw} Energie + Echo/Spur − ${protectionReduction} Schutz/Rüstung = ${Math.max(MIN_HIT, raw - protectionReduction)}; ${guarded ? `Geschützt −${guarded.power || BLOCK_DAMAGE}` : "ohne Geschützt"}; Endschaden ${calculatedDamage}, Körperverlust ${dealt}, Bruch ${bruch}${crit ? " (kritisch ×2)" : ""}.`,
  );
  dropDeadEchoes(state, defender, defenderPlan);
  if (killBody(state, defender.side)) return { hit: true, ended: true };
  if (
    defenderPlan?.reaction === "riposte" &&
    defenderPlan.action === "attack" &&
    defender.energy >= 2 &&
    defender.body > 0
  ) {
    defender.energy -= 2;
    const back = resolveAttack(state, defender, attacker, { ...defenderPlan, energy: 0, ability: false }, null, {
      rawMod: -2,
      attackMod: 0,
      ignoreSchutz: 0,
      noCrit: true,
      tag: " im Gegenstoß",
    });
    if (back.ended) return { hit: true, ended: true };
  }
  return { hit: true, ended: false };
}

function aArmor(f: Fighter): number {
  return byId(ARMORS, f.armorId).value;
}

function doGuard(state: GameState, f: Fighter, plan: Plan) {
  const power = plan.energy >= 1 ? BLOCK_ENERGY_DAMAGE : BLOCK_DAMAGE;
  if (fullRules(state) && plan.ability && f.characterId === "waechter") {
    placeMarker(state, f.side, "guard", f.field, 1);
    f.guardBonus += 1;
    note(state, `${name(f)} sperrt das Feld und steht fester.`);
    return;
  }
  addStatus(f, "guarded", 1, power);
  if (plan.energy >= 2) {
    const bad = f.statuses.find((s) => s.kind === "wounded" || s.kind === "bound" || s.kind === "confused");
    if (bad) removeStatus(f, bad.kind);
  }
  if (fullRules(state) && plan.energy >= 3) {
    pushEcho(state, { owner: f.side, kind: "guard", field: f.field, charges: 2 });
    note(state, `${name(f)} steht geschützt und setzt ein Schutz-Echo.`);
  } else note(state, `${name(f)} steht geschützt. Nächster Treffer −${power} Schaden und −1 Bruch.`);
}

function crackCore(state: GameState, attacker: Fighter, defender: Fighter, points: number): boolean {
  const revealed = defender.cores.filter((c) => c.revealed && c.points > 0);
  const target = revealed[0] ?? null;
  if (!target) return false;
  target.points = Math.max(0, target.points - points);
  note(state, `${name(attacker)} bricht ein Kern-Echo. Noch ${target.points} ${target.points === 1 ? "Punkt" : "Punkte"}.`);
  if (target.points === 0) {
    defender.energyMax = Math.max(MIN_ENERGY, defender.energyMax - DESTROYED_CORE_ENERGY_LOSS);
    defender.energy = Math.min(defender.energy, defender.energyMax);
    gainBruch(state, defender, DESTROYED_CORE_BRUCH, null);
    addStatus(defender, "open", 1);
    note(state, `Ein Kern von ${name(defender)} zerbricht.`);
    if (killEcho(state, defender.side)) return true;
  }
  return false;
}

function doInfluence(state: GameState, f: Fighter, foe: Fighter, plan: Plan): boolean {
  if (!fullRules(state)) return false;
  if (plan.influence === "marker") {
    const kind = plan.markerKind;
    const field = plan.targetField;
    const cost = kind === "mirror" ? 1 : 2;
    const ownMarker = state.markers.some((marker) => marker.owner === f.side);
    if (
      kind &&
      ["brand", "mirror", "rift", "bind"].includes(kind) &&
      field != null &&
      plan.energy >= cost &&
      distance(f.field, field) <= 3 &&
      field !== f.field &&
      field !== foe.field &&
      !markerAt(state, field) &&
      !ownMarker
    ) {
      placeMarker(state, f.side, kind, field, FIELD_MARKER_DURATION);
      note(state, `${name(f)} prägt einen ${kind}-Marker auf Feld ${field} für ${FIELD_MARKER_DURATION} Runden.`);
    } else {
      note(state, `${name(f)} kann den Feldmarker dort nicht prägen.`);
    }
    return false;
  }
  const dist = distance(f.field, foe.field);
  const influenceEcho =
    plan.influence !== "convert"
      ? f.echoes.find(
          (echo) =>
            echo.id === plan.echoId &&
            echo.kind === "influence" &&
            echo.field === f.field &&
            echo.charges > 0,
        )
      : undefined;
  if (influenceEcho) {
    influenceEcho.charges -= 1;
    influenceEcho.used = true;
    note(state, `${name(f)} aktiviert ein Einfluss-Echo.`);
  }
  const reach = influenceRange(state, f, influenceEcho?.id);
  const inReach = dist <= reach;
  if (inReach) foe.cores.forEach((c) => (c.revealed = true));
  if (plan.ability && f.characterId === "archivar") {
    if (f.echoes.length < 2) {
      pushEcho(state, { owner: f.side, kind: "guard", field: f.field, charges: 2 });
    }
    const echoes = f.echoes.slice(0, 2);
    for (const echo of echoes) {
      echo.charges = Math.min(MAX_ECHO_CHARGES, echo.charges + 1);
      echo.used = true;
    }
    note(state, `${name(f)} verbindet die eigenen Echos.`);
    return false;
  }
  if (plan.ability && f.characterId === "jaeger") {
    if (dist <= 3) {
      foe.marked = true;
      note(state, `${name(f)} markiert ${name(foe)}.`);
    } else note(state, `${name(f)} verliert die Markierung aus den Augen.`);
    return false;
  }
  if (plan.influence === "kern" && plan.energy >= 1 && inReach) {
    const points = plan.energy >= 3 ? CORE_ATTACK_POINTS_WITH_THREE_ENERGY : CORE_ATTACK_POINTS;
    if (crackCore(state, f, foe, points)) return true;
  } else if (plan.influence === "weaken" && inReach) {
    const loss = plan.energy >= 3 ? 2 : 1;
    const echo = foe.echoes.find((e) => e.charges > 0);
    if (echo) {
      echo.charges = Math.max(0, echo.charges - loss);
      echo.used = true;
      note(state, `${name(f)} schwächt ein Echo von ${name(foe)}.`);
      dropDeadEchoes(state, foe, null);
    } else if (f.toolId === "brecheisen" || f.artifactId === "brecheisen") {
      const marker = state.markers.find((m) => m.field === foe.field && (m.kind === "guard" || m.kind === "mist"));
      if (marker) {
        state.markers = state.markers.filter((m) => m.id !== marker.id);
        note(state, `${name(f)} bricht einen Feldmarker auf.`);
      }
    }
  } else if (plan.influence === "convert" || plan.freeConvert) {
    const echo = ownEcho(f, plan.echoId);
    const next = echo ? CONVERT[echo.kind] : undefined;
    if (echo && next && (plan.energy >= 1 || plan.freeConvert)) {
      if (plan.freeConvert) f.convertReady = false;
      echo.kind = next;
      echo.charges = Math.max(1, echo.charges - (plan.freeConvert ? 0 : 1));
      echo.used = true;
      if (next === "barrier") echo.ttl = 2;
      note(state, `${name(f)} wandelt ein Echo in ${ECHO_LABEL[next]}.`);
    }
  } else {
    let charges = 1 + (plan.energy >= 2 ? 1 : 0);
    if (f.characterId === "archivar" && !plan.itemId) charges += 1;
    const mirror = markerAt(state, f.field);
    if (mirror?.kind === "mirror") {
      charges += 1;
      state.markers = state.markers.filter((m) => m.id !== mirror.id);
    }
    pushEcho(state, {
      owner: f.side,
      kind: "influence",
      field: f.field,
      charges: Math.min(MAX_ECHO_CHARGES, charges),
    });
    note(state, `${name(f)} legt ein Einfluss-Echo auf Feld ${f.field}.`);
  }
  if (plan.energy >= 2 && plan.influence !== "spur") {
    const echo = f.echoes[0];
    if (echo) {
      echo.charges = Math.min(MAX_ECHO_CHARGES, echo.charges + 1);
      echo.used = true;
    }
  }
  if (influenceEcho) dropDeadEchoes(state, f, plan);
  return false;
}

function perform(
  state: GameState,
  side: Side,
  plan: Plan,
  foePlan: Plan,
): { ended: boolean; tone: Frame["tone"]; title: string; detail: string; dice: number | null } {
  const f = state.fighters[side];
  const foe = state.fighters[other(side)];
  if (f.body <= 0) {
    return { ended: true, tone: "win", title: `${name(f)} fällt`, detail: "Die Aktion verfällt.", dice: null };
  }
  if (plan.energy > f.energy) plan.energy = f.energy;
  f.energy -= plan.energy;
  if (plan.ability) f.abilityRound = state.round;
  applyItem(state, f, foe, plan);
  if (plan.mist && (f.toolId === "rauch" || f.artifactId === "rauch") && f.energy >= 2) {
    f.energy -= 2;
    placeMarker(state, f.side, "mist", f.field, 2);
    note(state, `${name(f)} öffnet die Rauchkapsel.`);
  }
  if (plan.action === "attack") {
    const result = resolveAttack(state, f, foe, plan, foePlan, {
      rawMod: plan.ability && f.characterId === "brecher" ? 2 : 0,
      attackMod: 0,
      ignoreSchutz: 0,
      noCrit: false,
      tag: plan.ability ? " mit Aufbrechen" : "",
    });
    const detail = state.log[0] ?? "Angriff.";
    return {
      ended: result.ended || state.over,
      tone: result.hit ? "hit" : "miss",
      title: result.hit ? `${name(f)} trifft` : `${name(f)} verfehlt`,
      detail,
      dice: null,
    };
  }
  if (plan.action === "guard") {
    doGuard(state, f, plan);
    return { ended: false, tone: "guard", title: `${name(f)} schützt sich`, detail: state.log[0] ?? "", dice: null };
  }
  if (plan.action === "move") {
    const steps = moveSteps(f, plan.energy, plan.ability, plan.echoId);
    const dest = plan.targetField ?? f.field;
    const legal = reachable(f.field, steps, foe.field);
    if (!legal.includes(dest)) {
      note(state, `${name(f)} kommt nicht auf Feld ${dest}.`);
    } else doMove(state, f, foe, plan, steps, dest);
    if (killBody(state, f.side)) {
      return { ended: true, tone: "win", title: `${name(f)} fällt`, detail: state.log[0] ?? "", dice: null };
    }
    return { ended: state.over, tone: "move", title: `${name(f)} bewegt sich`, detail: state.log[0] ?? "", dice: null };
  }
  const ended = doInfluence(state, f, foe, plan);
  return {
    ended: ended || state.over,
    tone: "echo",
    title: `${name(f)} nimmt Einfluss`,
    detail: state.log[0] ?? "",
    dice: null,
  };
}

function endRound(state: GameState) {
  for (const side of ["A", "B"] as Side[]) {
    const f = state.fighters[side];
    if (fullRules(state) && hasStatus(f, "wounded")) {
      hurt(state, f, BODY_LOSS_PER_ROUND_WOUNDED);
      note(state, `${name(f)} blutet. −1 Körper.`);
    }
    tickStatuses(f, ["wounded"]);
    f.echoes = f.echoes.flatMap((echo) => {
      let charges = echo.charges;
      let ttl = echo.ttl;
      if (!echo.used) charges -= 1;
      if (ttl > 0) ttl -= 1;
      if (charges <= 0 || (echo.kind === "barrier" && ttl === 0 && echo.ttl > 0)) return [];
      return [{ ...echo, charges, ttl }];
    });
  }
  for (const side of ["A", "B"] as Side[]) {
    if (killBody(state, side)) return;
    if (fullRules(state) && killEcho(state, side)) return;
  }
  const losers = (["A", "B"] as Side[]).filter(
    (s) => state.fighters[s].collapse && state.fighters[s].bruch >= state.fighters[s].bruchMax,
  );
  if (losers.length === 1) {
    state.over = true;
    state.winner = other(losers[0]);
    state.winReason = "Bruch";
    note(state, `${name(state.fighters[losers[0]])} bricht zusammen.`);
  } else if (losers.length === 2) {
    state.over = true;
    state.winner = null;
    state.winReason = "Bruch";
    note(state, "Beide Kämpfer brechen zusammen.");
  }
  if (!state.over) {
    state.startSide = other(state.startSide);
    removeRoundFlags(state);
  }
}

function removeRoundFlags(state: GameState) {
  for (const side of ["A", "B"] as Side[]) {
    state.fighters[side].moved = false;
    state.fighters[side].pursued = false;
  }
}

export function resolveRound(input: GameState, planA: Plan, planB: Plan): Frame[] {
  const state = clone(input);
  const plans: Record<Side, Plan> = {
    A: preparePlan(state, "A", clone(planA)),
    B: preparePlan(state, "B", clone(planB)),
  };
  const frames: Frame[] = [];

  for (const side of ["A", "B"] as Side[]) {
    const f = state.fighters[side];
    const plan = plans[side];
    const foePlan = plans[other(side)];
    if (!fullRules(state)) continue;
    if (plan.prediction && f.pattern[plan.prediction] >= 3) {
      if (foePlan.action === plan.prediction) {
        f.predictStrike = true;
        f.pattern[plan.prediction] = 0;
        gainBruch(state, state.fighters[other(side)], 1, null);
        note(state, `${name(f)} liest ${foePlan.action} richtig.`);
      } else {
        f.pattern = { attack: 0, guard: 0, move: 0, influence: 0 };
        const foe = state.fighters[other(side)];
        foe.energy = Math.min(foe.energyMax, foe.energy + 1);
        note(state, `${name(f)} liest falsch. Die Muster fallen.`);
      }
    }
  }

  for (const side of ["A", "B"] as Side[]) {
    const f = state.fighters[side];
    const plan = plans[side];
    if (!fullRules(state)) continue;
    if (f.lastAction === plan.action) {
      const foe = state.fighters[other(side)];
      foe.pattern[plan.action] = Math.min(3, foe.pattern[plan.action] + 1);
    }
    f.lastAction = plan.action;
    if (plan.ruleBreak && f.ruleBreak) {
      f.ruleBreak = false;
      if (plan.ruleBreak === "refund" && plan.energy > 0) {
        plan.energy -= 1;
        note(state, `${name(f)} nimmt eine Energiestufe zurück.`);
      }
      if (plan.ruleBreak === "brace") f.braceLeft = 2;
      if (plan.ruleBreak === "retarget" && plan.retargetField) plan.targetField = plan.retargetField;
    }
    if (plan.mask && f.maskReady && plan.retargetField) {
      f.maskReady = false;
      plan.targetField = plan.retargetField;
      note(state, `${name(f)} verschiebt das Ziel mit der Maske.`);
    }
    if (plan.zeitnadel && f.nadelReady) {
      f.nadelReady = false;
    } else plan.zeitnadel = false;
    if (plan.freeConvert && !f.convertReady) plan.freeConvert = false;
  }

  const order = orderSides(state, plans);
  push(frames, state, {
    kicker: `Runde ${state.round} · Aufdecken`,
    title: `${label(plans[order[0]].action)} vor ${label(plans[order[1]].action)}`,
    detail: `${name(state.fighters[order[0]])} handelt zuerst. Aktionswert ${actionValue(state.fighters[order[0]], plans[order[0]])} gegen ${actionValue(state.fighters[order[1]], plans[order[1]])}.`,
    tone: "idle",
    focus: [state.fighters[order[0]].field, state.fighters[order[1]].field],
    actor: order[0],
    dice: null,
  });

  for (const side of order) {
    if (state.over) break;
    const result = perform(state, side, plans[side], plans[other(side)]);
    const die = extractDie(result.detail);
    push(frames, state, {
      kicker: `Runde ${state.round} · ${label(plans[side].action)}`,
      title: result.title,
      detail: result.detail,
      tone: state.over ? "win" : result.tone,
      focus: [state.fighters[side].field, state.fighters[other(side)].field],
      actor: side,
      dice: die,
    });
    if (result.ended || state.over) break;
  }

  if (!state.over) {
    endRound(state);
    push(frames, state, {
      kicker: `Runde ${state.round} · Ende`,
      title: state.over ? winTitle(state) : "Die Spur kühlt ab",
      detail: state.over
        ? winDetail(state)
        : "Ungenutzte Echos verlieren Ladung. Der Start wechselt.",
      tone: state.over ? "win" : "break",
      focus: [state.fighters.A.field, state.fighters.B.field],
      actor: null,
      dice: null,
    });
  } else {
    push(frames, state, {
      kicker: `Runde ${state.round} · Entscheidung`,
      title: winTitle(state),
      detail: winDetail(state),
      tone: "win",
      focus: [state.fighters.A.field, state.fighters.B.field],
      actor: state.winner,
      dice: null,
    });
  }
  return frames;
}

function orderSides(state: GameState, plans: Record<Side, Plan>): [Side, Side] {
  const score = (side: Side) => actionValue(state.fighters[side], plans[side]);
  const first: Side = state.startSide;
  const second = other(first);
  const pair: Side[] = [first, second];
  pair.sort((a, b) => {
    const va = score(a);
    const vb = score(b);
    if (va !== vb) return vb - va;
    if (plans[a].energy !== plans[b].energy) return plans[a].energy - plans[b].energy;
    const ta = liveStats(state.fighters[a]).tempo;
    const tb = liveStats(state.fighters[b]).tempo;
    if (ta !== tb) return tb - ta;
    if (state.fighters[a].body !== state.fighters[b].body) return state.fighters[a].body - state.fighters[b].body;
    const ra = d6(state);
    const rb = d6(state);
    return rb - ra;
  });
  return [pair[0], pair[1]];
}

function label(action: ActionKind): string {
  if (action === "attack") return "Angriff";
  if (action === "guard") return "Schutz";
  if (action === "move") return "Bewegung";
  return "Einfluss";
}

function extractDie(detail: string): number | null {
  const match = detail.match(/Würfel (\d)/);
  return match ? Number(match[1]) : null;
}

function winTitle(state: GameState): string {
  if (!state.winner) return "Beide brechen";
  return `${name(state.fighters[state.winner])} siegt`;
}

function winDetail(state: GameState): string {
  if (state.winReason === "Körper") return "Der Körper des Gegners ist auf 0.";
  if (state.winReason === "Echo") return "Alle drei Kern-Echos sind zerstört.";
  if (state.winReason === "Bruch") return "Das Bruchmaximum ist erreicht, die letzte Runde ist vorbei.";
  return "Das Duell endet.";
}

export function preparePlan(state: GameState, side: Side, plan: Plan): Plan {
  const next = clone(plan);
  const f = state.fighters[side];
  const foe = state.fighters[other(side)];
  if (!fullRules(state)) {
    next.ability = false;
    next.itemId = null;
    next.influence = "spur";
    next.echoId = null;
    next.markerKind = null;
    next.ruleBreak = null;
    next.prediction = null;
    next.zeitnadel = false;
    next.mist = false;
    next.mask = false;
    next.freeConvert = false;
    if (next.action === "influence") {
      next.action = "guard";
      next.energy = 0;
    }
    if (next.reaction !== "dodge") next.reaction = null;
  }
  if (next.ability) {
    const cost =
      f.characterId === "brecher" ? 3 : f.characterId === "laeuferin" || f.characterId === "waechter" ? 2 : f.characterId === "jaeger" ? 1 : 3;
    const action: ActionKind =
      f.characterId === "brecher" ? "attack" : f.characterId === "laeuferin" ? "move" : f.characterId === "waechter" ? "guard" : "influence";
    if (f.energy < cost || f.abilityRound === state.round) next.ability = false;
    else {
      next.action = action;
      next.energy = cost;
    }
  }
  next.energy = Math.max(0, Math.min(MAX_ATTACK_ENERGY, next.energy, f.energy));
  if (next.echoId) {
    const selected = f.echoes.find((echo) => echo.id === next.echoId && echo.charges > 0);
    const valid =
      selected &&
      ((next.action === "attack" && selected.kind === "attack" && selected.field === f.field) ||
        (next.action === "guard" && selected.kind === "guard" && selected.field === f.field) ||
        (next.action === "move" && selected.kind === "move" && selected.field === f.field) ||
        (next.itemId === "splitter" && next.action !== "influence") ||
        (next.action === "influence" && (next.influence === "convert" || selected.kind === "influence")));
    if (!valid) next.echoId = null;
  }
  if (next.itemId && !f.items.some((i) => i.id === next.itemId && !i.spent)) next.itemId = null;
  if (next.prediction && f.pattern[next.prediction] < 3) next.prediction = null;
  if (next.ruleBreak && !f.ruleBreak) next.ruleBreak = null;
  if (next.zeitnadel && !f.nadelReady) next.zeitnadel = false;
  if (next.mask && !f.maskReady) next.mask = false;
  if (next.freeConvert && !f.convertReady) next.freeConvert = false;
  if (!f.toolId.includes("rauch") && f.artifactId !== "rauch" && f.toolId !== "rauch") next.mist = false;

  if (next.action === "attack") {
    if (f.weaponId === "bogen" && hasStatus(f, "bound")) {
      next.targetField = f.field;
    } else if (hasStatus(f, "confused")) {
      next.targetField ??= f.field;
    } else {
      next.targetField = foe.field;
    }
  }
  if (next.action === "move") {
    const steps = moveSteps(f, next.energy, next.ability, next.echoId);
    const legal = reachable(f.field, steps, foe.field);
    if (next.targetField == null || !legal.includes(next.targetField)) next.targetField = legal[0] ?? null;
    if (next.targetField == null) {
      next.action = "guard";
      next.energy = 0;
      next.ability = false;
    }
  }
  if (next.action === "guard") next.targetField = f.field;
  if (next.action === "influence") {
    if (next.influence === "kern" && (next.energy < 1 || distance(f.field, foe.field) > influenceRange(state, f, next.echoId))) {
      next.influence = "spur";
    }
    if (next.influence === "marker") {
      const markerCost = next.markerKind === "mirror" ? 1 : 2;
      const field = next.targetField;
      const allowed = ["brand", "mirror", "rift", "bind"].includes(next.markerKind ?? "");
      if (
        !allowed ||
        next.energy < markerCost ||
        field == null ||
        distance(f.field, field) > 3 ||
        field === f.field ||
        field === foe.field ||
        markerAt(state, field) ||
        state.markers.some((marker) => marker.owner === side)
      ) {
        next.influence = "spur";
        next.markerKind = null;
        next.targetField = f.field;
      }
    } else next.targetField = foe.field;
  }
  if (next.reaction) {
    const cost = next.reaction === "stabilize" ? 1 : next.reaction === "parry" ? 0 : 2;
    const compatible =
      (next.reaction === "dodge" && next.action === "move") ||
      (next.reaction === "riposte" && next.action === "attack") ||
      (next.reaction === "stabilize" && fullRules(state)) ||
      (next.reaction === "secure" && fullRules(state)) ||
      (next.reaction === "parry" && next.action === "guard" && fullRules(state));
    if (!compatible) next.reaction = null;
    if (f.energy - next.energy < cost) next.reaction = null;
  }
  return next;
}

export function pressStone(input: GameState, side: Side): GameState {
  const state = clone(input);
  const f = state.fighters[side];
  const gear = f.toolId === "bruchstein" || f.artifactId === "bruchstein";
  if (!gear || f.stoneRound === state.round || f.bruch >= f.bruchMax) return state;
  f.stoneRound = state.round;
  gainBruch(state, f, 1, null);
  f.energy = Math.min(f.energyMax, f.energy + 2);
  note(state, `${name(f)} drückt den Bruchstein. +2 Energie, +1 Bruch.`);
  return state;
}
