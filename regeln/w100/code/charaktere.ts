import type { Form } from "./karte";
import type { Zone } from "./regeln";

export type CharakterId = "brecher" | "laeuferin" | "archivar" | "waechter" | "jaeger";
export type Effekt = "sturz" | "blutung" | "fessel";

export interface Charakter {
  id: CharakterId;
  name: string;
  zeile: string;
  ws: number;
  bs: number;
  staerke: number;
  widerstand: number;
  wille: number;
  ausweichen: number;
  wunden: number;
  bewegung: number;
  form: Form;
  reichweite: number;
  mindest: number;
  schaden: number;
  laenge: number;
  effekt: Effekt | "keine";
  ortwahl: boolean;
  ruestung: Record<Zone, number>;
}

export function bonus(wert: number): number {
  return Math.floor(wert / 10);
}

const leder: Record<Zone, number> = {
  kopf: 0,
  "arm-links": 1,
  "arm-rechts": 1,
  koerper: 1,
  "bein-links": 1,
  "bein-rechts": 1,
};

const kette: Record<Zone, number> = {
  kopf: 1,
  "arm-links": 1,
  "arm-rechts": 1,
  koerper: 2,
  "bein-links": 1,
  "bein-rechts": 1,
};

const platte: Record<Zone, number> = {
  kopf: 2,
  "arm-links": 3,
  "arm-rechts": 3,
  koerper: 4,
  "bein-links": 2,
  "bein-rechts": 2,
};

export const CHARAKTERE: Charakter[] = [
  {
    id: "brecher",
    name: "Brecher",
    zeile: "Hammer +6, Länge Durchschnitt. Ein klarer Treffer wirft um.",
    ws: 45,
    bs: 25,
    staerke: 45,
    widerstand: 45,
    wille: 35,
    ausweichen: 25,
    wunden: 15,
    bewegung: 24,
    form: "nah",
    reichweite: 8,
    mindest: 1,
    schaden: 6,
    laenge: 2,
    effekt: "sturz",
    ortwahl: false,
    ruestung: kette,
  },
  {
    id: "laeuferin",
    name: "Läuferin",
    zeile: "Schwert +4, kurz. Ein klarer Treffer öffnet eine Blutung.",
    ws: 40,
    bs: 30,
    staerke: 30,
    widerstand: 30,
    wille: 30,
    ausweichen: 55,
    wunden: 12,
    bewegung: 40,
    form: "nah",
    reichweite: 8,
    mindest: 1,
    schaden: 4,
    laenge: 1,
    effekt: "blutung",
    ortwahl: false,
    ruestung: leder,
  },
  {
    id: "archivar",
    name: "Archivar",
    zeile: "Kette +5, über den Bau, nicht unter 16 Felder. Klarer Treffer fesselt.",
    ws: 30,
    bs: 45,
    staerke: 30,
    widerstand: 30,
    wille: 45,
    ausweichen: 35,
    wunden: 13,
    bewegung: 32,
    form: "bogen",
    reichweite: 40,
    mindest: 16,
    schaden: 5,
    laenge: 3,
    effekt: "fessel",
    ortwahl: true,
    ruestung: leder,
  },
  {
    id: "waechter",
    name: "Wächter",
    zeile: "Speer +4, sehr lang. Im Nahbereich sperrig.",
    ws: 40,
    bs: 25,
    staerke: 35,
    widerstand: 50,
    wille: 35,
    ausweichen: 30,
    wunden: 16,
    bewegung: 24,
    form: "nah",
    reichweite: 16,
    mindest: 1,
    schaden: 4,
    laenge: 4,
    effekt: "blutung",
    ortwahl: false,
    ruestung: platte,
  },
  {
    id: "jaeger",
    name: "Jäger",
    zeile: "Bogen 4, ohne Stärke, stoppt am Bau.",
    ws: 30,
    bs: 50,
    staerke: 30,
    widerstand: 30,
    wille: 30,
    ausweichen: 45,
    wunden: 12,
    bewegung: 32,
    form: "schuss",
    reichweite: 48,
    mindest: 1,
    schaden: 4,
    laenge: 0,
    effekt: "keine",
    ortwahl: false,
    ruestung: leder,
  },
];

export function charakter(id: CharakterId): Charakter {
  return CHARAKTERE.find((item) => item.id === id)!;
}
