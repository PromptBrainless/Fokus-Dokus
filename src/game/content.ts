export type Side = "A" | "B";
export type ActionKind = "attack" | "guard" | "move" | "influence";
export type EchoKind =
  | "attack"
  | "guard"
  | "move"
  | "influence"
  | "trap"
  | "barrier"
  | "mist"
  | "rift";
export type MarkerKind = "brand" | "mist" | "mirror" | "guard" | "rift" | "bind";
export type StatusKind = "open" | "bound" | "confused" | "wounded" | "guarded";
export type ReactionKind = "dodge" | "riposte" | "stabilize" | "secure";
export type InfluenceMode = "spur" | "kern" | "weaken" | "convert";
export type RuleBreak = "retarget" | "brace" | "refund";
export type Difficulty = "bedacht" | "taktisch" | "brutal";

export interface Character {
  id: string;
  name: string;
  line: string;
  kraft: number;
  schutz: number;
  bewegung: number;
  kontrolle: number;
  tempo: number;
  cores: EchoKind[];
  passive: string;
  ability: string;
  abilityCost: number;
  abilityAction: ActionKind;
  abilityText: string;
}

export interface Weapon {
  id: string;
  name: string;
  value: number;
  range: number;
  tempo: number;
  text: string;
}

export interface Armor {
  id: string;
  name: string;
  value: number;
  body: number;
  tempo: number;
  kontrolle: number;
  text: string;
}

export interface Gear {
  id: string;
  name: string;
  slot: "tool" | "artifact";
  text: string;
}

export interface Item {
  id: string;
  name: string;
  text: string;
}

export const CHARACTERS: Character[] = [
  {
    id: "brecher",
    name: "Brecher",
    line: "Schwerer Treffer",
    kraft: 8,
    schutz: 5,
    bewegung: 2,
    kontrolle: 2,
    tempo: 3,
    cores: ["attack", "attack", "guard"],
    passive: "Ab 5 Endschaden erhält das Ziel 1 zusätzlichen Bruch.",
    ability: "Aufbrechen",
    abilityCost: 3,
    abilityAction: "attack",
    abilityText: "Angriff, Reichweite 1. Treffer: +2 Rohschaden, Schutz endet, ein Schutz-Echo verliert 1 Ladung.",
  },
  {
    id: "laeuferin",
    name: "Läuferin",
    line: "Durchgang",
    kraft: 5,
    schutz: 5,
    bewegung: 8,
    kontrolle: 5,
    tempo: 8,
    cores: ["move", "move", "influence"],
    passive:
      "Ignoriert den ersten negativen Feldmarker, den sie in der Runde betritt. Hat sie sich einmal bewegt, tragen ihre Angriffe in diesem Kampf +2 Rohschaden und ignorieren 2 Schutzbonus und 2 Rüstung.",
    ability: "Seitenwechsel",
    abilityCost: 2,
    abilityAction: "move",
    abilityText: "Bis zu 2 Felder bewegen. Danach ein Bewegungs-Echo mit 1 Ladung. Der Weg öffnet den nächsten Angriff.",
  },
  {
    id: "archivar",
    name: "Archivar",
    line: "Speichern",
    kraft: 3,
    schutz: 6,
    bewegung: 4,
    kontrolle: 9,
    tempo: 4,
    cores: ["influence", "guard", "move"],
    passive:
      "Ein durch Einfluss ohne Item erzeugtes Echo erhält 1 zusätzliche Ladung. Ein eigenes Echo auf dem Feld gibt +2 Verteidigung. Der erste Treffer des Kampfes ist um 6 Körper niedriger und legt ein Schutz-Echo mit 2 Ladungen.",
    ability: "Verbindung",
    abilityCost: 3,
    abilityAction: "influence",
    abilityText:
      "Zwei eigene Echos verstärken sich um 1 Ladung und gelten diese Runde als benutzt. Fehlen sie, entsteht zuerst ein Schutz-Echo mit 2 Ladungen.",
  },
  {
    id: "waechter",
    name: "Wächter",
    line: "Standhalten",
    kraft: 4,
    schutz: 8,
    bewegung: 2,
    kontrolle: 5,
    tempo: 2,
    cores: ["guard", "guard", "influence"],
    passive: "Gegnerische Fähigkeiten verschieben höchstens um 2 Felder.",
    ability: "Sperre",
    abilityCost: 2,
    abilityAction: "guard",
    abilityText: "Schutzmarker auf dem eigenen Feld und bis zum Rundenende +1 Schutzbonus.",
  },
  {
    id: "jaeger",
    name: "Jäger",
    line: "Verfolgen",
    kraft: 7,
    schutz: 4,
    bewegung: 5,
    kontrolle: 4,
    tempo: 7,
    cores: ["attack", "move", "influence"],
    passive: "Verlässt der Gegner sein Feld, +1 Angriffswert gegen ihn bis zum Rundenende. Der erste Treffer des Kampfes ist um 4 Körper niedriger.",
    ability: "Markieren",
    abilityCost: 1,
    abilityAction: "influence",
    abilityText: "Ziel in Reichweite 3 markieren. Der nächste Angriff: +2 Angriffswert, ignoriert 2 Schutzbonus und 1 Rüstung, Angriffs-Echo mit 2 Ladungen.",
  },
];

export const WEAPONS: Weapon[] = [
  {
    id: "kurzschwert",
    name: "Kurzschwert",
    value: 3,
    range: 1,
    tempo: 2,
    text: "Nach Treffer 1 Feld zurück. Keine Angriffe durch Barrieren.",
  },
  {
    id: "hammer",
    name: "Schwerer Hammer",
    value: 6,
    range: 1,
    tempo: -2,
    text: "Treffer: +1 Bruch. Verfehlt: Träger +1 Bruch.",
  },
  {
    id: "speer",
    name: "Speer",
    value: 4,
    range: 2,
    tempo: 0,
    text: "Darf durch einen Kämpfer hindurch treffen. Auf demselben Feld −1 Rohschaden.",
  },
  {
    id: "bogen",
    name: "Bogen",
    value: 4,
    range: 3,
    tempo: 1,
    text: "Ignoriert den ersten Bewegungsbonus des Ziels. Nicht bei Gebunden.",
  },
  {
    id: "kette",
    name: "Kettenklinge",
    value: 3,
    range: 2,
    tempo: 1,
    text: "Bei Treffer das Ziel 1 Feld näher ziehen, kostet 1 Energie.",
  },
];

export const ARMORS: Armor[] = [
  {
    id: "leder",
    name: "Leder",
    value: 1,
    body: 1,
    tempo: 1,
    kontrolle: 0,
    text: "Die erste Bewegung der Runde kostet 1 Energie weniger.",
  },
  {
    id: "ketten",
    name: "Kettenrüstung",
    value: 2,
    body: 3,
    tempo: -1,
    kontrolle: 0,
    text: "Der erste Bruch der Runde ist um 1 niedriger.",
  },
  {
    id: "platte",
    name: "Plattenrüstung",
    value: 3,
    body: 5,
    tempo: -2,
    kontrolle: 0,
    text: "Höchstens 1 Feld verschoben. Bewegungsweite −1.",
  },
  {
    id: "spiegel",
    name: "Spiegelfaser",
    value: 1,
    body: 1,
    tempo: 0,
    kontrolle: 1,
    text: "Einmal pro Runde +1 Verteidigung gegen einen Echo-Angriff.",
  },
];

export const GEAR: Gear[] = [
  { id: "greifhaken", name: "Greifhaken", slot: "tool", text: "Bewegungsbonus +1, Tempo +1, +1 Feld Weite." },
  { id: "rauch", name: "Rauchkapsel", slot: "tool", text: "Kontrollbonus +1. Nebel auf dem eigenen Feld, 2 Energie." },
  { id: "brecheisen", name: "Brecheisen", slot: "tool", text: "Kraftbonus +1. Einfluss gegen Barrieren und Schutzmarker trifft doppelt." },
  { id: "anker", name: "Ankerring", slot: "tool", text: "Schutzbonus +1, Bewegungsbonus −1. Nicht durch gegnerische Züge verschiebbar." },
  { id: "spiegelkern", name: "Spiegelkern", slot: "artifact", text: "Kontrolle +2, maximale Energie −1. Einmal ohne Energie umwandeln." },
  { id: "zeitnadel", name: "Zeitnadel", slot: "artifact", text: "Tempo +2, Körper −2. Einmal pro Kampf +2 Aktionswert." },
  { id: "bruchstein", name: "Bruchstein", slot: "artifact", text: "Bruchmaximum +2, Kontrolle −1. Einmal pro Runde 1 Bruch gegen 2 Energie." },
  { id: "maske", name: "Leere Maske", slot: "artifact", text: "Bewegungsbonus +1, Kontrolle +1. Einmal das Ziel um ein Feld verschieben." },
];

export const ITEMS: Item[] = [
  { id: "heil", name: "Heilmittel", text: "4 Körper. Entfernt Verletzt." },
  { id: "zelle", name: "Energiezelle", text: "3 Energie, nicht über das Maximum." },
  { id: "binde", name: "Bruchbinde", text: "2 Bruch weniger. Gebunden bis Ende der nächsten Runde." },
  { id: "splitter", name: "Echo-Splitter", text: "Ein eigenes Echo erhält 2 Ladungen, höchstens 3." },
  { id: "blend", name: "Blendpulver", text: "Ziel wird Verwirrt. Ist es das schon, 1 Bruch." },
];

export const ACTIONS: { id: ActionKind; name: string; tempo: number; text: string }[] = [
  { id: "attack", name: "Angriff", tempo: 0, text: "Treffer nach Würfel, Kraft und Waffe." },
  { id: "guard", name: "Schutz", tempo: -1, text: "Der nächste Treffer wird schwächer." },
  { id: "move", name: "Bewegung", tempo: 2, text: "Felder entlang der Verbindungen." },
  { id: "influence", name: "Einfluss", tempo: 0, text: "Echos, Kerne und Spuren." },
];

export const REACTIONS: { id: ReactionKind; name: string; cost: number; text: string }[] = [
  { id: "dodge", name: "Ausweichen", cost: 2, text: "Nach Treffer, wenn du Bewegung gewählt hast: 1 Feld, 2 Schaden weniger." },
  { id: "riposte", name: "Gegenstoß", cost: 2, text: "Nach Treffer, wenn du Angriff gewählt hast: Gegenangriff, −2 Rohschaden, kein Krit." },
  { id: "stabilize", name: "Stabilisieren", cost: 1, text: "Wenn du mindestens 2 Bruch erhieltest: 1 verhindern. Nächste Runde −1 Energie." },
  { id: "secure", name: "Echo sichern", cost: 2, text: "Ein Echo, das zerstört würde, bleibt mit 1 Ladung. Du erhältst 1 Bruch." },
];

export const EDGES: [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [2, 4],
  [2, 5],
  [3, 4],
  [3, 5],
  [4, 5],
  [4, 6],
  [4, 7],
  [5, 6],
  [5, 7],
  [6, 7],
];

export const POS: Record<number, [number, number]> = {
  1: [500, 160],
  2: [290, 400],
  3: [710, 400],
  4: [230, 700],
  5: [770, 700],
  6: [320, 1010],
  7: [680, 1010],
};

export const STARTS: Record<Side, number[]> = { A: [2, 4], B: [3, 5] };

export const ECHO_LABEL: Record<EchoKind, string> = {
  attack: "Angriff",
  guard: "Schutz",
  move: "Bewegung",
  influence: "Einfluss",
  trap: "Falle",
  barrier: "Barriere",
  mist: "Nebel",
  rift: "Riss",
};

export const ACTION_LABEL: Record<ActionKind, string> = {
  attack: "Angriff",
  guard: "Schutz",
  move: "Bewegung",
  influence: "Einfluss",
};

export function byId<T extends { id: string }>(list: T[], id: string): T {
  const found = list.find((x) => x.id === id);
  if (!found) throw new Error(`Unbekannt: ${id}`);
  return found;
}

export const SUGGESTED: Record<
  string,
  { weaponId: string; armorId: string; toolId: string; artifactId: string; items: [string, string] }
> = {
  brecher: {
    weaponId: "hammer",
    armorId: "platte",
    toolId: "brecheisen",
    artifactId: "anker",
    items: ["heil", "binde"],
  },
  laeuferin: {
    weaponId: "kurzschwert",
    armorId: "leder",
    toolId: "greifhaken",
    artifactId: "maske",
    items: ["zelle", "blend"],
  },
  archivar: {
    weaponId: "kette",
    armorId: "spiegel",
    toolId: "rauch",
    artifactId: "spiegelkern",
    items: ["splitter", "zelle"],
  },
  waechter: {
    weaponId: "speer",
    armorId: "ketten",
    toolId: "anker",
    artifactId: "bruchstein",
    items: ["heil", "binde"],
  },
  jaeger: {
    weaponId: "bogen",
    armorId: "leder",
    toolId: "greifhaken",
    artifactId: "zeitnadel",
    items: ["blend", "splitter"],
  },
};
