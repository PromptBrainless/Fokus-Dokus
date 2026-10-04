/** Gitter 64×64. Drei Formen: Nah entlang der Linie, Schuss bis zum ersten Hindernis, Bogen über Bau hinweg. */

export const BREITE = 64;

export type Form = "nah" | "schuss" | "bogen";

export interface Feld {
  x: number;
  y: number;
}

const BAU_X0 = 24;
const BAU_Y0 = 24;
const BAU_KANTE = 16;

export const BAU: Feld[] = [];
for (let y = BAU_Y0; y < BAU_Y0 + BAU_KANTE; y += 1) {
  for (let x = BAU_X0; x < BAU_X0 + BAU_KANTE; x += 1) BAU.push({ x, y });
}

const BAU_IDS = new Set(BAU.map((feld) => feld.y * BREITE + feld.x));

export function index(feld: Feld): number {
  return feld.y * BREITE + feld.x;
}

export function vonIndex(id: number): Feld {
  return { x: id % BREITE, y: Math.floor(id / BREITE) };
}

export function gleich(a: Feld, b: Feld): boolean {
  return a.x === b.x && a.y === b.y;
}

export function imFeld(feld: Feld): boolean {
  return feld.x >= 0 && feld.y >= 0 && feld.x < BREITE && feld.y < BREITE;
}

export function istBau(feld: Feld): boolean {
  return BAU_IDS.has(index(feld));
}

const RICHTUNG: Feld[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function nachbarn(feld: Feld): Feld[] {
  return RICHTUNG.map((r) => ({ x: feld.x + r.x, y: feld.y + r.y })).filter(imFeld);
}

export function schrittZurueck(von: Feld, gegner: Feld): Feld | null {
  const frei = nachbarn(von).filter((feld) => !istBau(feld) && !gleich(feld, gegner));
  frei.sort((a, b) => abstand(b, gegner) - abstand(a, gegner));
  return frei[0] ?? null;
}

export function abstand(a: Feld, b: Feld): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function erreichbar(von: Feld, weite: number, block: Feld[]): Feld[] {
  const gesehen = new Set<number>([index(von)]);
  let rand = [von];
  const treffer: Feld[] = [];
  for (let schritt = 0; schritt < weite; schritt += 1) {
    const naechste: Feld[] = [];
    for (const feld of rand) {
      for (const nachbar of nachbarn(feld)) {
        const id = index(nachbar);
        if (gesehen.has(id) || istBau(nachbar) || block.some((item) => gleich(item, nachbar))) continue;
        gesehen.add(id);
        treffer.push(nachbar);
        naechste.push(nachbar);
      }
    }
    rand = naechste;
  }
  return treffer;
}

/** Volle Linie in vier Richtungen. Nah und Schuss enden am Bau und am Gegner. Bogen lässt den Bau aus. Unter mindest zählt das Feld nicht. */
export function ziele(form: Form, von: Feld, weite: number, gegner: Feld, mindest = 1): Feld[] {
  const liste: Feld[] = [];
  for (const richtung of RICHTUNG) {
    for (let schritt = 1; schritt <= weite; schritt += 1) {
      const feld = { x: von.x + richtung.x * schritt, y: von.y + richtung.y * schritt };
      if (!imFeld(feld)) break;
      if (istBau(feld)) {
        if (form === "bogen") continue;
        break;
      }
      if (schritt < mindest) continue;
      liste.push(feld);
      if (form !== "bogen" && gleich(feld, gegner)) break;
    }
  }
  return liste;
}

export function kannTreffen(form: Form, von: Feld, weite: number, gegner: Feld, mindest = 1): boolean {
  return ziele(form, von, weite, gegner, mindest).some((feld) => gleich(feld, gegner));
}
