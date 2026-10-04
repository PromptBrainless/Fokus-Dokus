/**
 * W100 nach Warhammer Fantasy Roleplay 4.
 * Vorteil gibt +10 auf die Probe, nicht nachträglich auf die Grade.
 * Nahkampf: Erfolgsgrade + Waffenbonus + Stärkebonus.
 * Fernkampf: Erfolgsgrade + Waffenbonus, ohne Stärke.
 * Abzug: Zähigkeitsbonus + Rüstung der Zone. Der Rest kann 0 sein.
 * Ein Pasch bei Erfolg ist sofort eine kritische Wunde, die Rüstung zählt dann nicht.
 */

export type Zone = "kopf" | "arm-links" | "arm-rechts" | "koerper" | "bein-links" | "bein-rechts";

export const ZONE_NAME: Record<Zone, string> = {
  kopf: "Kopf",
  "arm-links": "Linker Arm",
  "arm-rechts": "Rechter Arm",
  koerper: "Körper",
  "bein-links": "Linkes Bein",
  "bein-rechts": "Rechtes Bein",
};

export function w100(rng: () => number = Math.random): number {
  return 1 + Math.floor(rng() * 100);
}

export function istPasch(wurf: number): boolean {
  return [11, 22, 33, 44, 55, 66, 77, 88, 99, 100].includes(wurf);
}

export function umdrehen(wurf: number): number {
  const text = wurf === 100 ? "00" : String(wurf).padStart(2, "0");
  const rev = Number(text[1] + text[0]);
  return rev === 0 ? 100 : rev;
}

export function zoneAusWurf(wurf: number): Zone {
  const n = umdrehen(wurf);
  if (n <= 9) return "kopf";
  if (n <= 24) return "arm-links";
  if (n <= 44) return "arm-rechts";
  if (n <= 79) return "koerper";
  if (n <= 89) return "bein-links";
  return "bein-rechts";
}

export interface Probe {
  wurf: number;
  fertigkeit: number;
  bestanden: boolean;
  sl: number;
  kritisch: boolean;
  patzer: boolean;
}

export function probe(fertigkeit: number, wurf: number): Probe {
  const wert = Math.max(5, fertigkeit);
  const autoErfolg = wurf <= 5;
  const autoFehl = wurf >= 96;
  const bestanden = autoFehl ? false : autoErfolg ? true : wurf <= wert;
  const zehnerWurf = wurf === 100 ? 0 : Math.floor(wurf / 10);
  let sl = Math.floor(wert / 10) - zehnerWurf;
  if (bestanden && sl < 0) sl = 0;
  if (!bestanden && sl > 0) sl = -sl;
  return { wurf, fertigkeit: wert, bestanden, sl, kritisch: bestanden && istPasch(wurf), patzer: !bestanden && istPasch(wurf) };
}

export interface Treffer {
  getroffen: boolean;
  zone: Zone | null;
  sl: number;
  schaden: number;
  wunden: number;
  kritisch: boolean;
  patzer: boolean;
  werfer: Probe;
  abwehr: Probe | null;
  text: string;
}

export function vergleich(
  angriff: Probe,
  abwehr: Probe | null,
  waffe: number,
  widerstand: number,
  ruestung: number,
): Treffer {
  const gegen = abwehr?.sl ?? 0;
  const sl = angriff.sl - gegen;
  const getroffen = abwehr ? angriff.sl > abwehr.sl && !angriff.patzer : angriff.bestanden && !angriff.patzer;
  if (!getroffen) {
    return {
      getroffen: false,
      zone: null,
      sl,
      schaden: 0,
      wunden: 0,
      kritisch: false,
      patzer: angriff.patzer,
      werfer: angriff,
      abwehr,
      text: angriff.patzer
        ? `Patzer. Wurf ${angriff.wurf} gegen ${angriff.fertigkeit}.`
        : `Vorbei. Wurf ${angriff.wurf}, Erfolgsgrade ${angriff.sl} gegen ${gegen}.`,
    };
  }
  const zone = zoneAusWurf(angriff.wurf);
  const roh = sl + waffe - (widerstand + ruestung);
  const wunden = Math.max(0, roh);
  const gehalten = wunden === 0 ? " Die Rüstung hält." : "";
  return {
    getroffen: true,
    zone,
    sl,
    schaden: roh,
    wunden,
    kritisch: angriff.kritisch,
    patzer: false,
    werfer: angriff,
    abwehr,
    text: `Wurf ${angriff.wurf} wird ${umdrehen(angriff.wurf)}, ${ZONE_NAME[zone]}. Erfolgsgrade ${sl}. Waffe ${waffe} minus Zähigkeit ${widerstand} und Rüstung ${ruestung}: ${wunden} Wunden.${gehalten}${angriff.kritisch ? " Kritisch." : ""}`,
  };
}
