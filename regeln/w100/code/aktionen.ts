/**
 * Aktionen nach https://board-game-rules.com/game-mechanics/actions/
 * Eine Runde folgt der dort beschriebenen Folge:
 * 1. Prüfen, was legal ist.
 * 2. Eine Option wählen.
 * 3. Die Kosten zahlen.
 * 4. Die Wirkung sofort ausführen.
 * 5. Abschließen, wenn keine Aktionen übrig sind.
 * Das Budget ist Action Points: zwei Punkte pro Runde.
 * Die Karte zeigt die Wirkung, bevor sie eintritt, wie bei Into the Breach.
 */

export type Aktionsart = "bewegen" | "schlagen" | "parieren" | "ausweichen" | "passen";

export interface Aktion {
  id: Aktionsart;
  name: string;
  kosten: number;
  text: string;
}

export const AKTIONEN: Aktion[] = [
  { id: "bewegen", name: "Bewegen", kosten: 1, text: "Felder entlang der Linien, bis zur Bewegungsweite. Nicht durch Gegner oder Bau." },
  { id: "schlagen", name: "Schlagen", kosten: 1, text: "W100, wenn das Ziel in der Form liegt. Nahkampf vergleicht, Fernkampf ist eine einfache Probe." },
  { id: "parieren", name: "Parieren", kosten: 1, text: "Der nächste Schlag gegen dich ist eine Vergleichsprobe mit deiner Waffenfertigkeit." },
  { id: "ausweichen", name: "Ausweichen", kosten: 1, text: "Der nächste Schlag gegen dich ist eine Vergleichsprobe mit deiner Ausweichen-Fertigkeit." },
  { id: "passen", name: "Passen", kosten: 0, text: "Die Runde endet. Was angekündigt ist, wird jetzt gewürfelt." },
];

export const AKTIONSPUNKTE = 2;

export const FOLGE = [
  "Prüfen, was legal ist.",
  "Eine Option wählen.",
  "Einen Aktionspunkt zahlen.",
  "Die Wirkung sofort ausführen.",
  "Abschließen, wenn keine Punkte übrig sind.",
];
