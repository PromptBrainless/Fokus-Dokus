# ECHO//BRUCH – Simulationsbericht

> Messstand: 03.10.2026. Taktischer Bot, `SUGGESTED`-Ausrüstung, 32 Seeds pro geordneter Paarung, beide Sitzseiten, 800 Duelle je Regelstufe. Der Bericht ist ein Entwicklungsstand und keine Balancefreigabe.

## Ergebnisampel

| Abnahmewert | `kern` | `voll` | Ziel |
|---|---:|---:|---:|
| Duelllänge Ø | 6,66 Runden 🟢 | 6,65 Runden 🟢 | 5–8 |
| P90 / Anteil 3–12 Runden | 12 / 87,3 % 🔴 | 13 / 77,5 % 🔴 | P90 ≤ 12 / ≥ 90 % |
| Zeitlimit-Unentschieden | 0,38 % 🟢 | 0,50 % 🟢 | < 2 % |
| Figuren-Siegquote (Minimum–Maximum) | 10,6–78,1 % 🔴 | 10,6–86,6 % 🔴 | jede Figur 45–55 % |
| Trefferquote (Minimum–Maximum geordnete Paarung) | 5,6–100 % 🔴 | 10,7–100 % 🔴 | 40–92 % |
| Ungeschützter Trefferschaden, Anteil Körper | 16,5–31,7 % 🔴 | 21,0–35,8 % 🔴 | 15–25 % |
| Geschützter Trefferschaden, Anteil Körper | 0–17,5 % 🔴 | 10,2–16,1 % 🔴 | 5–12 % |
| Energie je Planung, Figurenspanne | 0,53–0,75 🔴 | 0,60–0,80 🔴 | 1,0–1,6 |
| Planungen mit 3 Energie | 0 % 🟢 | 0–1,4 % 🟢 | höchstens 20 % |
| Planungen mit 0 Energie | 30,8–49,8 % 🟢 | 27,3–44,2 % 🟢 | mindestens 20 % |
| Siegwege Körper / Bruch / Echo | 97,0 / 3,0 / 0 % 🔴 | 96,3 / 2,4 / 1,3 % 🔴 | 55–70 / 15–25 / 10–20 % (Echo nur `voll`) |
| Spiegelduell-Startvorteil, größte Differenz | 31,3 Prozentpunkte 🔴 | 25,0 Prozentpunkte 🔴 | höchstens 8 |

Die Kategorien mit grüner Ampel erfüllen nur den jeweils daneben genannten isolierten Korridor; sie heben die Gesamt-Nichtabnahme nicht auf. Treffer-/Schadensbereiche sind über geordnete Paarungen beziehungsweise Figuren gemittelt. Eine Paarungsmatrix und alle Rohmetriken erzeugt das Simulationsskript zusätzlich als JSON.

## Figurenquoten

| Figur | `kern` | `voll` | Ziel |
|---|---:|---:|---:|
| Brecher | 78,1 % | 86,6 % | 45–55 % |
| Läuferin | 64,1 % | 41,9 % | 45–55 % |
| Archivar | 10,6 % | 10,6 % | 45–55 % |
| Wächter | 61,3 % | 67,2 % | 45–55 % |
| Jäger | 35,0 % | 41,6 % | 45–55 % |

## Aktions- und Energiemetriken

Anteile je Figur, Aktionen Angriff / Schutz / Bewegung / Einfluss:

| Regelstufe | Brecher | Läuferin | Archivar | Wächter | Jäger |
|---|---|---|---|---|---|
| `kern` | 88,5 / 11,5 / 0 / 0 % | 67,7 / 8,5 / 23,7 / 0 % | 49,4 / 50,6 / 0 / 0 % | 85,1 / 14,9 / 0 / 0 % | 73,5 / 26,5 / 0 / 0 % |
| `voll` | 95,7 / 4,3 / 0 / 0 % | 48,3 / 15,4 / 14,0 / 22,3 % | 8,8 / 41,5 / 0 / 49,6 % | 88,1 / 11,3 / 0 / 0,7 % | 68,5 / 17,2 / 0 / 14,3 % |

Der Zielkorridor 8–60 % je Grundaktion und Figur wird mehrfach verfehlt. Durchschnittlich eingesetzte Energie pro Planung: `kern` Brecher 0,75, Läuferin 0,60, Archivar 0,53, Wächter 0,73, Jäger 0,67; `voll` 0,80 / 0,72 / 0,60 / 0,73 / 0,74.

## Siegwege und Mechanikabdeckung

Siegweg-Anteile aus den entschiedenen Duellen (Zeitlimit-Unentschieden ausgeschlossen):

| Stufe | Körper | Bruch | Echo |
|---|---:|---:|---:|
| `kern` | 97,0 % | 3,0 % | nicht verfügbar |
| `voll` | 96,3 % | 2,4 % | 1,3 % |

Mechanikabdeckung `voll` (Anteil der 800 Duelle mit mindestens einer protokollierten Wirkung):

| Mechanik | Abdeckung | Mechanik | Abdeckung |
|---|---:|---|---:|
| Angriffsecho | 66,9 % | Schutzecho | 0 % |
| Bewegungsecho | 16,5 % | Einflussecho | 53,8 % |
| Falle / Barriere / Nebel / Riss | jeweils 0 % | Kern-Treffer | 45,9 % |
| Vorhersage | 8,8 % | Regelbruch | 50,3 % |
| Ausweichen / Gegenstoß / Echo sichern | jeweils 0 % | Stabilisieren | 28,6 % |
| Parade | 12,4 % | Heilmittel | 9,8 % |
| Energiezelle / Bruchbinde / Echo-Splitter | 0,1 / 0,9 / 0 % | Blendpulver | 63,1 % |
| Gebunden / Verwirrt / Verletzt / Geschützt | 0,9 / 63,1 / 37,1 / 99,5 % | Brand / Nebel / Spiegel / Riss / Schutz / Fesselmarker | jeweils 0 % |

Mechaniken, die durch bloße Logtextsuche nicht zuverlässig erfasst werden, benötigen zusätzliche strukturierte Ereignismetriken. Die Werte sind deshalb ein Mindestnachweis, kein Beleg für korrekte Wirkung in jedem Pfad.

## Reproduzierbarkeit

Aufruf: `npx tsx scripts/balance-sim.ts <ausgabeordner>`. Die Simulation schreibt Text-, JSON-Bilanz und Protokoll. Die jüngste bestätigte Ausführung schrieb nach `/tmp/echo-bruch-verified`; temporäre Rohdateien werden nicht als freigegebene Spieldokumentation behandelt.
