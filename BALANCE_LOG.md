# Balance-Log ECHO//BRUCH

> Stand: 03.10.2026. Dieses Log dokumentiert Messungen, keine Freigabe. Die aktuelle Balance verfehlt mehrere Abnahmekriterien; Änderungen sind nicht abgeschlossen.

## Messprotokoll

| Stand | Messung | Ergebnis |
|---|---|---|
| Ausgangslage | Taktischer Bot, 5×5 Paarungen, 16 Seeds, 400 Duelle | Brecher 80,0 %, Wächter 56,3 %, Läuferin 40,6 %, Jäger 40,0 %, Archivar 26,9 %. |
| Aktueller Kern | 03.10.2026, 32 Seeds je geordneter Paarung, beide Sitzseiten, 800 Duelle | Brecher 78,1 %, Läuferin 64,1 %, Archivar 10,6 %, Wächter 61,3 %, Jäger 35,0 %. |
| Aktuelles Vollregelspiel | 03.10.2026, gleiche Simulationsparameter, 800 Duelle | Brecher 86,6 %, Läuferin 41,9 %, Archivar 10,6 %, Wächter 67,2 %, Jäger 41,6 %. |

Die aktuelle Ausführung ist in `SIMULATIONSBERICHT.md` zusammengefasst. Die Simulation kann als Text- und JSON-Bericht ausgeführt werden:

```sh
npx tsx scripts/balance-sim.ts ./artifacts
```

Alternativ kann `ECHO_BRUCH_ARTIFACTS` den Ausgabeordner festlegen. Die alten Dateien in `public/` bleiben unverändert.

## Änderungen und Messbefund

| Änderung | Messbefund |
|---|---|
| PDF-Figurenwerte für Läuferin, Archivar und Jäger sowie Bogenwert angeglichen; nicht durch das PDF belegte Zusatzpassive entfernt. | Der Gesamtstand bleibt unausgeglichen: aktuelle Siegraten siehe oben; Archivar nur 10,6 % in beiden Stufen. |
| Gemeinsame Stellschrauben nach `src/game/tuning.ts` verlagert; Rohschaden zählt Kraft; Rüstung/Schutzbonus werden halbiert aufgerundet angerechnet; Mindesttreffer, kritischer Treffer, Bruchdeckel und Parade ergänzt. | Trefferquoten und Schaden sind weiterhin außerhalb des Zielkorridors: einzelne Paarungen liegen bei 5,6–100 %; Vollregel-Schaden ohne Schutz liegt je Figur bei 21,0–35,8 % des Körpers. |
| Regelstufen `kern` und `voll` ergänzt; dieselbe Auflösungsfunktion wird verwendet. | Kern: 87,3 % der Duelle dauern 3–12 Runden, P90 12, Zeitlimit-Unentschieden 0,38 %. Voll: 77,5 %, P90 13, Zeitlimit 0,50 %. Ziel 90 % / P90 ≤ 12 wird verfehlt. |
| Echoauswahl, Regelbruch, ausgewählte Zustände, Items, Markerprägung und zusätzliche Bot-Kandidaten ergänzt. | Vollregeln: Angriffsecho 66,9 %, Bewegungsecho 16,5 %, Einflussecho 53,8 %, Kern-Treffer 45,9 %, Regelbruch 50,3 %. Schutz-Echo, alle vier Umwandlungen, Ausweichen, Gegenstoß, Echo sichern und sämtliche Feldmarker: 0 %. |
| Standardausrüstung angepasst (Brecher mit Speer, Archivar mit Brecheisen). | Kein isolierter Vorher-/Nachher-Lauf für diese einzelne Änderung vorhanden. Die aktuelle 800-Duell-Messung erlaubt daher keine kausale Zuordnung. |

## Auslegungen

- Bei Energie-Bonus zum Rohschaden gilt die Tabelle der Aufgabenstellung: 1 Energie +1, 2 Energie +1 und +1 Bruch, 3 Energie +2 und +1 Bruch.
- Echoaktivierung wird als Verbrauch einer Ladung behandelt.
- `kern` unterdrückt Vollregel-Inhalte, behält aber die gemeinsame Auflösungslogik.
- Nicht alle PDF-Mechaniken sind im aktuellen Code wirksam oder vom Bot erreichbar. Sie werden hier ausdrücklich als offene Arbeit und nicht als freigegebene Auslegung geführt.

## Noch nicht erreicht / nächste Messschritte

1. Figurenquoten und Paarungsmatrix beider Stufen ausbalancieren; vorher einzelne Stellschrauben isoliert messen.
2. Trefferquote je Paarung auf 40–92 % begrenzen; den Startspielervorteil in Spiegelduellen unter 8 Prozentpunkte bringen.
3. Abdeckung der Echos, Umwandlungen, Reaktionen, Items, Zustände und Marker einzeln instrumentieren und unterrepräsentierte Mechaniken entweder erreichbar machen oder begründet streichen.
4. Aktionen und Energienutzung auf die vorgegebenen Korridore bringen.
5. Pro Balanceänderung Vorher-/Nachher-Läufe mit gleicher Simulation und Seeds ergänzen.

**Status: nicht ausbalanciert, nicht vollständig implementiert, nicht freigabefähig.**
