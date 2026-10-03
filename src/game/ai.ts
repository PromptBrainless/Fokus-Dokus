import type { ActionKind, Difficulty, MarkerKind, Side } from "./content.ts";
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
} from "./model.ts";
import { preparePlan } from "./resolve.ts";

function bestPattern(state: GameState, side: Side): ActionKind | null {
  if (state.ruleStage === "kern") return null;
  const pattern = state.fighters[side].pattern;
  const entries = (Object.keys(pattern) as ActionKind[]).filter((key) => pattern[key] >= 3);
  return entries[0] ?? null;
}

function energyCost(energy: number, difficulty: Difficulty): number {
  const costs =
    difficulty === "bedacht"
      ? [0, 5, 10, 17]
      : difficulty === "brutal"
        ? [0, 2, 5, 9]
        : [0, 4, 9, 16];
  return costs[Math.min(3, energy)];
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
        if (foe.echoes.some((echo) => echo.charges > 0)) {
          candidates.push({ ...emptyPlan(), action: "influence", energy, influence: "weaken", targetField: foe.field });
        }
        if (me.echoes.some((echo) => echo.charges > 0)) {
          candidates.push({ ...emptyPlan(), action: "influence", energy, influence: "convert", targetField: me.field });
        }
      }
      if (!state.markers.some((marker) => marker.owner === side)) {
        const markerKinds: MarkerKind[] = ["mirror", "brand", "rift", "bind"];
        for (const markerKind of markerKinds) {
          const cost = markerKind === "mirror" ? 1 : 2;
          if (energy < cost) continue;
          for (const field of [1, 2, 3, 4, 5, 6, 7]) {
            if (
              field !== me.field &&
              field !== foe.field &&
              distance(me.field, field) <= 3 &&
              !state.markers.some((marker) => marker.field === field)
            ) {
              candidates.push({
                ...emptyPlan(),
                action: "influence",
                energy,
                influence: "marker",
                markerKind,
                targetField: field,
              });
            }
          }
        }
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
    const nextDist = plan.action === "move" && plan.targetField ? distance(plan.targetField, foe.field) : dist;
    if (me.lastAction === plan.action) score -= 4;
    if (plan.action === "attack") {
      score += 18 + stats.weapon + stats.kraftB + plan.energy * 2;
      if (plan.energy >= 1) score += 3;
      if (plan.energy >= 2) score += 1;
      if (foe.body <= foe.bodyMax * 0.45) score += 16;
      if (isOpen(foe)) score += 8;
      if (foe.marked) score += 10;
      if (difficulty === "brutal") score += 14;
      if (difficulty === "bedacht" && me.body < me.bodyMax * 0.35) score -= 8;
    }
    if (plan.action === "guard") {
      score += dist <= foeStats.range ? 18 : 2;
      if (plan.energy === 1) score += 3;
      if (plan.energy >= 2 && me.statuses.some((status) => ["wounded", "bound", "confused"].includes(status.kind))) {
        score += 4;
      }
      if (plan.energy >= 3 && state.ruleStage !== "kern") score += 2;
      if (me.body < me.bodyMax * 0.4) score += 18;
      if (isOpen(me) || me.bruch >= me.bruchMax - 2) score += 10;
      if (difficulty === "bedacht") score += 8;
      if (difficulty === "brutal") score -= 8;
    }
    if (plan.action === "move") {
      score += (dist - nextDist) * 9;
      score += plan.energy * 2.5;
      if (dist > stats.range) score += 16;
      if (dist <= foeStats.range && me.body < me.bodyMax * 0.75) score += (nextDist - dist) * 9;
      if (difficulty === "bedacht" && me.body < me.bodyMax * 0.4) score += (nextDist - dist) * 7;
      if (plan.energy >= 2) score += 2;
    }
    if (plan.action === "influence") {
      score += stats.konB * 2;
      if (plan.energy >= 1) score += 2;
      if (plan.energy >= 2) score += 2;
      if (plan.influence === "kern") {
        const cores = foe.cores.filter((core) => core.points > 0);
        const revealed = cores.some((core) => core.revealed);
        score += revealed ? 20 : 15;
        if (plan.energy === 3 && cores.some((core) => core.points === 2)) score += 8;
      }
      if (plan.influence === "convert") score += 5;
      if (plan.influence === "weaken") score += 3;
      if (plan.influence === "marker") score += plan.markerKind === "mirror" ? 2 : 1;
      if (me.echoes.length === 0 && plan.influence === "spur") score += 15;
      if (plan.influence === "marker" && plan.markerKind === "brand" && plan.targetField != null) {
        if (distance(plan.targetField, foe.field) === 1) score += 10;
      }
    }
    if (plan.ability && plan.action === "attack") score += 2;
    if (plan.ability && plan.action !== "attack") score += plan.action === "guard" ? 3 : 2;
    if (me.characterId === "jaeger" && plan.ability && foeStats.schutzB + foeStats.armor >= 4) score += 16;
    if (me.characterId === "laeuferin" && dist > stats.range && plan.action === "move") score += 12;
    if (me.characterId === "archivar" && me.body < me.bodyMax * 0.55 && plan.action === "guard") score += 16;
    if (plan.action === "guard" && plan.energy >= 3 && state.ruleStage === "voll") score += 5;
    score -= energyCost(plan.energy, difficulty);
    if (score > bestScore) {
      bestScore = score;
      best = plan;
    }
  }

  const ready = preparePlan(state, side, best);
  if (state.ruleStage === "kern") return ready;
  if (ready.action === "attack") {
    ready.echoId = me.echoes.find((echo) => echo.kind === "attack" && echo.field === me.field && echo.charges > 0)?.id ?? null;
  } else if (ready.action === "guard") {
    ready.echoId = me.echoes.find((echo) => echo.kind === "guard" && echo.field === me.field && echo.charges > 0)?.id ?? null;
  } else if (ready.action === "move") {
    ready.echoId = me.echoes.find((echo) => echo.kind === "move" && echo.field === me.field && echo.charges > 0)?.id ?? null;
  } else if (ready.influence === "convert") {
    ready.echoId = me.echoes.find((echo) => echo.charges > 0)?.id ?? null;
  } else {
    ready.echoId = me.echoes.find((echo) => echo.kind === "influence" && echo.field === me.field && echo.charges > 0)?.id ?? null;
  }
  if (ready.influence === "marker" && ready.markerKind === "mirror") ready.energy = Math.max(ready.energy, 1);
  const heal = me.items.find((i) => i.id === "heil" && !i.spent);
  const cell = me.items.find((i) => i.id === "zelle" && !i.spent);
  const brace = me.items.find((i) => i.id === "binde" && !i.spent);
  const dust = me.items.find((i) => i.id === "blend" && !i.spent);
  if (heal && me.body <= me.bodyMax * 0.4) ready.itemId = "heil";
  else if (brace && me.bruch >= me.bruchMax - 2) ready.itemId = "binde";
  else if (cell && me.energy <= 1) ready.itemId = "zelle";
  else if (dust && difficulty !== "bedacht" && ready.action === "attack") ready.itemId = "blend";

  if (difficulty !== "brutal") {
    if (ready.action === "move" && dist <= foeStats.range && me.energy - ready.energy >= 2) ready.reaction = "dodge";
    else if (me.bruch >= 2 && dist <= foeStats.range && me.energy - ready.energy >= 1) ready.reaction = "stabilize";
    else if (ready.action === "guard" && dist <= foeStats.range) ready.reaction = "parry";
  } else if (ready.action === "attack" && me.energy - ready.energy >= 2) {
    ready.reaction = "riposte";
  }

  const predicted = bestPattern(state, side);
  if (predicted && difficulty !== "brutal") ready.prediction = predicted;
  if (me.ruleBreak) {
    if (me.bruch >= me.bruchMax - 1) ready.ruleBreak = "brace";
    else if (ready.energy >= 2) ready.ruleBreak = "refund";
  }
  if (me.nadelReady && difficulty === "brutal" && ready.action === "attack") ready.zeitnadel = true;
  if ((me.toolId === "rauch" || me.artifactId === "rauch") && me.energy - ready.energy >= 2 && dist <= 2) {
    ready.mist = difficulty !== "brutal";
  }
  return preparePlan(state, side, ready);
}
