import { choosePlan } from "./ai.ts";
import type { Difficulty, Side } from "./content.ts";
import { createGame, suggestedSetup } from "./model.ts";
import { beginRound, resolveRound } from "./resolve.ts";

function play(left: string, right: string, diff: Difficulty, seed: number) {
  let pack = beginRound(createGame(suggestedSetup(left, "A"), suggestedSetup(right, "B"), seed));
  let state = pack.state;
  let guard = 0;
  while (!state.over && guard < 25) {
    guard += 1;
    const frames = resolveRound(state, choosePlan(state, "A", "taktisch"), choosePlan(state, "B", diff));
    if (frames.length < 2) throw new Error("Keine Szenen");
    state = frames[frames.length - 1].state;
    for (const side of ["A", "B"] as Side[]) {
      const f = state.fighters[side];
      if (f.body < 0 || f.energy < 0 || f.bruch < 0 || f.energy > f.energyMax || f.echoes.length > 4) {
        throw new Error(`Werte ${left} ${right} ${seed}`);
      }
    }
    if (!state.over) {
      pack = beginRound(state);
      state = pack.state;
    }
  }
  return state.round;
}

const samples = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => play("jaeger", "archivar", "taktisch", seed));
const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
console.log(samples.join(","), "avg", avg.toFixed(1));
if (samples.some((n) => n < 1) || avg < 2) throw new Error("Duelllänge unplausibel");
console.log("ok", play("waechter", "brecher", "brutal", 4), play("laeuferin", "jaeger", "bedacht", 9));
