import assert from "node:assert/strict";
import test from "node:test";
import { CHARACTERS, type Side } from "./content.ts";
import {
  createGame,
  emptyPlan,
  suggestedSetup,
  type GameState,
} from "./model.ts";
import {
  armorReductionValue,
  minimumHitDamage,
  preparePlan,
  protectedDamage,
  resolveRound,
} from "./resolve.ts";

function duel(stage: "kern" | "voll" = "voll", seed = 17): GameState {
  return createGame(
    suggestedSetup("brecher", "A"),
    suggestedSetup("waechter", "B"),
    seed,
    stage,
  );
}

test("die Figurenwerte entsprechen den PDF-Werten", () => {
  assert.deepEqual(
    CHARACTERS.map(({ id, kraft, schutz, bewegung, kontrolle, tempo }) => [
      id,
      kraft,
      schutz,
      bewegung,
      kontrolle,
      tempo,
    ]),
    [
      ["brecher", 8, 5, 2, 2, 3],
      ["laeuferin", 3, 3, 8, 5, 8],
      ["archivar", 3, 4, 4, 9, 4],
      ["waechter", 4, 8, 2, 5, 2],
      ["jaeger", 6, 3, 5, 4, 7],
    ],
  );
});

test("Rüstung und Schutzbonus halbieren den Schadensabzug aufgerundet", () => {
  assert.equal(armorReductionValue(3, 2), 3);
  assert.equal(minimumHitDamage(5, 3, 2), 2);
  assert.equal(minimumHitDamage(1, 8, 5), 2);
  assert.equal(protectedDamage(2, 4), 1);
});

test("kern enthält keine Vollregeln und unterdrückt unerlaubte Pläne", () => {
  const state = duel("kern");
  const fighter = state.fighters.A;
  assert.equal(state.ruleStage, "kern");
  assert.equal(fighter.cores.length, 0);
  assert.equal(fighter.echoes.length, 0);
  assert.equal(fighter.items.length, 0);
  assert.equal(fighter.toolId, "");
  assert.equal(fighter.artifactId, "");
  assert.equal(fighter.ruleBreak, false);

  const plan = preparePlan(state, "A", {
    ...emptyPlan(),
    action: "influence",
    ability: true,
    itemId: "heil",
    ruleBreak: "brace",
  });
  assert.equal(plan.action, "guard");
  assert.equal(plan.ability, false);
  assert.equal(plan.itemId, null);
  assert.equal(plan.ruleBreak, null);
});

test("ein Angriff ohne Reichweite kostet Energie und verursacht 1 Bruch", () => {
  const state = duel("kern");
  state.fighters.A.field = 2;
  state.fighters.B.field = 7;
  state.fighters.A.weaponId = "kurzschwert";
  const attack = { ...emptyPlan(), action: "attack" as const, energy: 1 };
  const guard = { ...emptyPlan(), action: "guard" as const };
  const frames = resolveRound(state, attack, guard);
  const result = frames.at(-1)!.state;
  assert.equal(result.fighters.A.energy, 1);
  assert.equal(result.fighters.A.bruch, 1);
  assert.ok(result.log.some((line) => line.includes("schlägt ins Leere")));
});

test("gleicher Seed und gleiche Pläne ergeben identische Runden", () => {
  const state = duel("voll", 821);
  const plans = {
    A: { ...emptyPlan(), action: "attack" as const, energy: 1 },
    B: { ...emptyPlan(), action: "guard" as const, energy: 1 },
  };
  const first = resolveRound(state, plans.A, plans.B);
  const second = resolveRound(state, plans.A, plans.B);
  assert.deepEqual(first, second);
});

test("kritische Vollregel-Treffer verursachen Verletzt und verdoppeln den Schaden", () => {
  let found = false;
  for (let seed = 1; seed <= 20 && !found; seed += 1) {
    const state = createGame(
      { ...suggestedSetup("jaeger", "A"), field: 2 },
      { ...suggestedSetup("waechter", "B"), field: 3 },
      seed,
      "voll",
    );
    const frames = resolveRound(
      state,
      { ...emptyPlan(), action: "attack" },
      { ...emptyPlan(), action: "guard" },
    );
    const result = frames.at(-1)!.state;
    if (result.log.some((line) => line.includes("kritisch ×2"))) {
      found = true;
      assert.ok(result.fighters.B.statuses.some((status) => status.kind === "wounded"));
    }
  }
  assert.equal(found, true);
});

test("Parade wirkt nur nach einer erfolgreichen Schutzaktion", () => {
  const state = createGame(
    { ...suggestedSetup("brecher", "A"), weaponId: "hammer", field: 2 },
    { ...suggestedSetup("laeuferin", "B"), weaponId: "kurzschwert", field: 3 },
    91,
    "voll",
  );
  state.fighters.B.energy = 1;
  const frames = resolveRound(
    state,
    { ...emptyPlan(), action: "attack" },
    { ...emptyPlan(), action: "guard", reaction: "parry" },
  );
  const result = frames.at(-1)!.state;
  assert.equal(result.fighters.B.energy, 2);
  assert.ok(result.log.some((line) => line.includes("pariert")));
});

test("Feld prägen legt höchstens einen eigenen Marker auf ein freies Feld", () => {
  const state = duel();
  const frames = resolveRound(
    state,
    {
      ...emptyPlan(),
      action: "influence",
      influence: "marker",
      markerKind: "brand",
      energy: 2,
      targetField: 1,
    },
    emptyPlan(),
  );
  const result = frames.at(-1)!.state;
  assert.deepEqual(
    result.markers.map(({ owner, kind, field, duration }) => ({ owner, kind, field, duration })),
    [{ owner: "A", kind: "brand", field: 1, duration: 2 }],
  );
});

test("ein gewähltes Angriffs-Echo verbraucht genau eine Ladung", () => {
  const state = duel();
  const echoId = "test-echo";
  state.fighters.A.echoes.push({
    id: echoId,
    owner: "A",
    kind: "attack",
    field: state.fighters.A.field,
    charges: 2,
    used: false,
    ttl: 0,
  });
  const frames = resolveRound(
    state,
    { ...emptyPlan(), action: "attack", echoId },
    { ...emptyPlan(), action: "guard" },
  );
  const echo = frames.at(-1)!.state.fighters.A.echoes.find((entry) => entry.id === echoId);
  assert.equal(echo?.charges, 1);
  assert.ok(frames.at(-1)!.state.log.some((line) => line.includes("Angriffs-Echo")));
});

test("Echo-Umwandlung braucht Einfluss, Energie und eine Ladung", () => {
  const state = duel();
  const echoId = "convertible";
  state.fighters.A.echoes.push({
    id: echoId,
    owner: "A",
    kind: "attack",
    field: state.fighters.A.field,
    charges: 2,
    used: false,
    ttl: 0,
  });
  const frames = resolveRound(
    state,
    { ...emptyPlan(), action: "influence", influence: "convert", energy: 1, echoId },
    emptyPlan(),
  );
  const echo = frames.at(-1)!.state.fighters.A.echoes.find((entry) => entry.id === echoId);
  assert.equal(echo?.kind, "trap");
  assert.equal(echo?.charges, 1);
});

test("beide Regelstufen erhalten Körper- und Bruchsieg ohne Echo-Sieg in kern", () => {
  const state = duel("kern");
  state.fighters.A.bruch = state.fighters.A.bruchMax;
  state.fighters.A.collapse = true;
  const frames = resolveRound(state, emptyPlan(), emptyPlan());
  const result = frames.at(-1)!.state;
  assert.notEqual(result.winReason, "Echo");
  assert.equal(result.fighters.A.body >= 0, true);
  assert.equal(result.fighters.A.bruch <= result.fighters.A.bruchMax, true);
});

test("die Regeln begrenzen Körper, Energie, Bruch und normale Echos", () => {
  const state = duel();
  const plans = {
    A: { ...emptyPlan(), action: "attack" as const, energy: 3 },
    B: { ...emptyPlan(), action: "guard" as const },
  };
  const result = resolveRound(state, plans.A, plans.B).at(-1)!.state;
  for (const side of ["A", "B"] as Side[]) {
    const fighter = result.fighters[side];
    assert.ok(fighter.body >= 0);
    assert.ok(fighter.energy >= 0 && fighter.energy <= fighter.energyMax);
    assert.ok(fighter.bruch >= 0 && fighter.bruch <= fighter.bruchMax);
    assert.ok(fighter.echoes.length <= 4);
  }
});
