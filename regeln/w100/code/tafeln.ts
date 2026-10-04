import type { Zone } from "./regeln";

export interface Kritzeile {
  von: number;
  bis: number;
  name: string;
  wunden: number;
  tot: boolean;
  folge: string;
}

export const KRIT: Record<Zone, Kritzeile[]> = {
  kopf: [
    { von: 1, bis: 10, name: "Riss", wunden: 1, tot: false, folge: "Blutung." },
    { von: 11, bis: 40, name: "Betäubt", wunden: 2, tot: false, folge: "Die nächste Runde hat 1 Aktion weniger." },
    { von: 41, bis: 70, name: "Schädel", wunden: 3, tot: false, folge: "Alle Proben −20, bis die Wunden wieder über 0 sind." },
    { von: 71, bis: 90, name: "Bewusstlos", wunden: 4, tot: false, folge: "Keine Aktion, bis eine Runde vergeht." },
    { von: 91, bis: 100, name: "Zerbrochen", wunden: 0, tot: true, folge: "Der Kopf hält das nicht aus." },
  ],
  "arm-links": arm(),
  "arm-rechts": arm(),
  koerper: [
    { von: 1, bis: 10, name: "Kratzer", wunden: 1, tot: false, folge: "Blutung." },
    { von: 11, bis: 40, name: "Bauch", wunden: 2, tot: false, folge: "Betäubt. Die nächste Runde hat 1 Aktion weniger." },
    { von: 41, bis: 70, name: "Rippen", wunden: 3, tot: false, folge: "Bewegung −1 für den Rest des Kampfes." },
    { von: 71, bis: 90, name: "Durchstoßen", wunden: 5, tot: false, folge: "Keine Aktion in der nächsten Runde." },
    { von: 91, bis: 100, name: "Zertrennt", wunden: 0, tot: true, folge: "Der Körper gibt nach." },
  ],
  "bein-links": bein(),
  "bein-rechts": bein(),
};

function arm(): Kritzeile[] {
  return [
    { von: 1, bis: 10, name: "Prellung", wunden: 1, tot: false, folge: "Die Waffe sitzt schief. Nächster Angriff −10." },
    { von: 11, bis: 40, name: "Schnitt", wunden: 1, tot: false, folge: "Blutung." },
    { von: 41, bis: 70, name: "Verrenkt", wunden: 2, tot: false, folge: "Angriffe −20 für den Rest des Kampfes." },
    { von: 71, bis: 90, name: "Gebrochen", wunden: 3, tot: false, folge: "Dieser Arm schlägt nicht mehr." },
    { von: 91, bis: 100, name: "Abgetrennt", wunden: 0, tot: true, folge: "Der Arm ist verloren, der Kämpfer fällt." },
  ];
}

function bein(): Kritzeile[] {
  return [
    { von: 1, bis: 10, name: "Tritt", wunden: 1, tot: false, folge: "Einen Schritt zurück." },
    { von: 11, bis: 40, name: "Schnitt", wunden: 1, tot: false, folge: "Blutung. Bewegung −1." },
    { von: 41, bis: 70, name: "Gelenk", wunden: 2, tot: false, folge: "Bewegung halbiert, mindestens 1." },
    { von: 71, bis: 90, name: "Bruch", wunden: 3, tot: false, folge: "Kann nicht mehr gehen, nur noch schlagen, wenn jemand herankommt." },
    { von: 91, bis: 100, name: "Zerschmettert", wunden: 0, tot: true, folge: "Das Bein trägt nicht mehr." },
  ];
}

export function kritZeile(zone: Zone, wurf: number): Kritzeile {
  const n = wurf === 100 ? 100 : wurf;
  return KRIT[zone].find((row) => n >= row.von && n <= row.bis) ?? KRIT[zone][0];
}

export interface Patzerzeile {
  von: number;
  bis: number;
  name: string;
  folge: string;
}

export const PATZER: Patzerzeile[] = [
  { von: 1, bis: 20, name: "Eigenhieb", folge: "1 Wunde, Rüstung zählt nicht." },
  { von: 21, bis: 40, name: "Verhakt", folge: "Die nächste Runde hat 1 Aktion weniger." },
  { von: 41, bis: 60, name: "Stolpern", folge: "Ein Feld zurück, weg vom Gegner." },
  { von: 61, bis: 80, name: "Bloßgelegt", folge: "Die nächste Abwehr ist um 20 schlechter." },
  { von: 81, bis: 99, name: "Gestürzt", folge: "Liegt. Aufstehen kostet die nächste Bewegung." },
  { von: 100, bis: 100, name: "Waffe hin", folge: "Jeder weitere Angriff in diesem Kampf ist um 20 schlechter." },
];

export function patzerZeile(wurf: number): Patzerzeile {
  const n = wurf === 100 ? 100 : wurf;
  return PATZER.find((row) => n >= row.von && n <= row.bis) ?? PATZER[0];
}
