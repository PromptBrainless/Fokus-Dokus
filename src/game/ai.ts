import type { ActionKind, Difficulty, Side } from "./content";
import {
  distance,
  emptyPlan,
  isOpen,
  liveStats,
  moveSteps,
  other,
  reachable,
  type GameState,
  type Plan,
} from "./model";
import { preparePlan } from "./resolve";

function bestPattern(state: GameState, side: Side): ActionKind | null {
  if (state.ruleStage === "kern") return null;
  const pattern = state.fighters[side].pattern;
  const entries = (Object.keys(pattern) as ActionKind[]).filter((key) => pattern[key] >= 3);
  return entries[0] ?? null;
}

export function choosePlan(state: GameState, side: Side, difficulty: Difficulty): Plan {
  const me = state.fighters[side];
  const foe = state.fighters[other(side)];
  const stats = liveStats(me);
  const foeStats = liveStats(foe);
  const dist = distance(me.field, foe.field);
  const candidates: Plan[] = [];
  const energyCap = Math.min(3, me.energy);

  for (let energy = 0; energy <= energyCap; energy++) {
    if (dist <= stats.range && !(me.weaponId === "bogen" && me.statuses.some((s) => s.kind === "bound"))) {
      candidates.push({ ...emptyPlan(), action: "attack", energy, targetField: foe.field });
    }
    candidates.push({ ...emptyPlan(), action: "guard", energy, targetField: me.field });
    const steps = moveSteps(me, energy, false);
    for (const field of reachable(me.field, steps, foe.field)) {
      candidates.push({ ...emptyPlan(), action: "move", energy, targetField: field });
    }
    if (state.ruleStage !== "kern") {
      candidates.push({ ...emptyPlan(), action: "influence", energy, influence: "spur", targetField: me.field });
      if (energy >= 1 && dist <= 3) {
        candidates.push({ ...emptyPlan(), action: "influence", energy, influence: "kern", targetField: foe.field });
      }
    }
  }

  if (state.ruleStage !== "kern" && me.characterId === "brecher" && me.energy >= 3 && dist <= 1 && me.abilityRound !== state.round) {
    candidates.push({ ...emptyPlan(), action: "attack", energy: 3, ability: true, targetField: foe.field });
  }
  if (state.ruleStage !== "kern" && me.characterId === "laeuferin" && me.energy >= 2 && me.abilityRound !== state.round) {
    for (const field of reachable(me.field, 2, foe.field)) {
      candidates.push({ ...emptyPlan(), action: "move", energy: 2, ability: true, targetField: field });
    }
  }
  if (state.ruleStage !== "kern" && me.characterId === "waechter" && me.energy >= 2 && me.abilityRound !== state.round) {
    candidates.push({ ...emptyPlan(), action: "guard", energy: 2, ability: true, targetField: me.field });
  }
  if (state.ruleStage !== "kern" && me.characterId === "jaeger" && me.energy >= 1 && dist <= 3 && me.abilityRound !== state.round && !foe.marked) {
    candidates.push({
      ...emptyPlan(),
      action: "influence",
      energy: 1,
      ability: true,
      influence: "spur",
      targetField: foe.field,
    });
  }
  if (state.ruleStage !== "kern" && me.characterId === "archivar" && me.energy >= 3 && me.echoes.length >= 2 && me.abilityRound !== state.round) {
    candidates.push({
      ...emptyPlan(),
      action: "influence",
      energy: 3,
      ability: true,
      influence: "spur",
      targetField: me.field,
    });
  }

  let best = candidates[0] ?? emptyPlan();
  let bestScore = -Infinity;
  for (const plan of candidates) {
    let score = Math.random() * (difficulty === "brutal" ? 2 : 4);
    score -= plan.energy * 2.5;
    const nextDist = plan.action === "move" && plan.targetField ? distance(plan.targetField, foe.field) : dist;
    if (plan.action === "attack") {
      score += 18 + stats.weapon + stats.kraftB + plan.energy * 2;
      if (foe.body <= foe.bodyMax * 0.45) score += 16;
      if (isOpen(foe)) score += 8;
      if (foe.marked) score += 10;
      if (difficulty === "brutal") score += 14;
      if (difficulty === "bedacht" && me.body < me.bodyMax * 0.35) score -= 8;
    }
    if (plan.action === "guard") {
      score += dist <= foeStats.range ? 12 : 2;
      if (me.body < me.bodyMax * 0.4) score += 18;
      if (isOpen(me) || me.bruch >= me.bruchMax - 2) score += 10;
      if (difficulty === "bedacht") score += 8;
      if (difficulty === "brutal") score -= 8;
      score -= plan.energy;
    }
    if (plan.action === "move") {
      score += (dist - nextDist) * 9;
      if (dist > stats.range) score += 16;
      if (difficulty === "bedacht" && me.body < me.bodyMax * 0.4) score += (nextDist - dist) * 7;
      if (plan.energy >= 2) score += 2;
    }
    if (plan.action === "influence") {
      score += stats.konB * 2;
      if (plan.influence === "kern" && foe.cores.some((c) => c.revealed)) score += 20;
      if (plan.influence === "kern") score += 6;
      if (difficulty === "taktisch") score += 7;
      if (me.echoes.length === 0 && plan.influence === "spur") score += 5;
    }
    if (plan.ability && plan.action === "attack") score += 8;
    if (plan.ability && plan.action !== "attack") score += plan.action === "guard" ? 6 : 8;
    if (me.characterId === "jaeger" && plan.ability && foeStats.schutzB + foeStats.armor >= 4) score += 16;
    if (me.characterId === "laeuferin" && dist > stats.range && plan.action === "move") score += 12;
    if (me.characterId === "archivar" && me.body < me.bodyMax * 0.55 && plan.action === "guard") score += 16;
    if (me.characterId === "archivar" && plan.influence === "kern") score += 8;
    if (difficulty === "bedacht") score -= plan.energy * 1.5;
    if (score > bestScore) {
      bestScore = score;
      best = plan;
    }
  }

  const ready = preparePlan(state, side, best);
  if (state.ruleStage === "kern") return ready;
  const heal = me.items.find((i) => i.id === "heil" && !i.spent);
  const cell = me.items.find((i) => i.id === "zelle" && !i.spent);
  const brace = me.items.find((i) => i.id === "binde" && !i.spent);
  const dust = me.items.find((i) => i.id === "blend" && !i.spent);
  if (heal && me.body <= me.bodyMax * 0.45) ready.itemId = "heil";
  else if (brace && me.bruch >= me.bruchMax - 2) ready.itemId = "binde";
  else if (cell && me.energy <= 1) ready.itemId = "zelle";
  else if (dust && difficulty !== "bedacht" && ready.action === "attack") ready.itemId = "blend";

  if (difficulty !== "brutal") {
    if (ready.action === "move" && me.energy - ready.energy >= 2) ready.reaction = "dodge";
    else if (me.bruch >= 2 && me.energy - ready.energy >= 1) ready.reaction = "stabilize";
  } else if (ready.action === "attack" && me.energy - ready.energy >= 2) {
    ready.reaction = "riposte";
  }

  const predicted = bestPattern(state, side);
  if (predicted && difficulty !== "brutal") ready.prediction = predicted;
  if (me.nadelReady && difficulty === "brutal" && ready.action === "attack") ready.zeitnadel = true;
  if ((me.toolId === "rauch" || me.artifactId === "rauch") && me.energy - ready.energy >= 2 && dist <= 2) {
    ready.mist = difficulty !== "brutal";
  }
  return preparePlan(state, side, ready);
}
