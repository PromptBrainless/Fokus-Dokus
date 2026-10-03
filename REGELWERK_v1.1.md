# ECHO//BRUCH – Regelwerk v1.1 (Arbeitsentwurf)

> **Nicht freigegeben.** Dieser Entwurf hält den gegenwärtigen Implementierungsstand fest, nicht das vollständige Zielregelwerk. Simulationen zeigen erhebliche Balancefehler und nicht erreichte Mechaniken; siehe `SIMULATIONSBERICHT.md` und `BALANCE_LOG.md`. Die Überschrift v1.1 ist ein Arbeitsname und keine Versionsfreigabe.

## 1. Regelstufen

- **Einfach (`kern`)**: gemeinsamer Kampfablauf mit Angriff, Schutz und Bewegung. Echos, Items, Kerne, Gear, Muster und Regelbruch sind nicht Teil dieser Stufe. Körper- und Bruchsieg bleiben aktiv.
- **Vollregeln (`voll`)**: schaltet die zusätzlichen Systeme für Echos, Einfluss, Kerne und Items frei.
- Beide Stufen verwenden dieselbe Rundenauflösung. Die Stufenwahl erfolgt vor dem Duell.

## 2. Runde und Planung

Beide Seiten planen verdeckt. Aktionswert und Tempo bestimmen die Reihenfolge der Aktionen. Die aktuelle Implementierung berechnet den Aktionswert aus Figuren-Tempo, Aktionsbonus, Energie und unterstützenden Boni. Eine vollständige UI-Vorschau für alle Aktionen ist noch offen.

## 3. Treffer und Abwehr (implementierter Stand)

- Ein Angriff trifft, wenn W6 plus Angriffswert mindestens den Verteidigungswert erreicht.
- Angriffswert enthält Waffenwert, Kraftbonus, eingesetzte Energie und anwendbare Boni.
- Verteidigungswert verwendet den zentral konfigurierten Grundwert und Schutz-/Bewegungs-/Aktionsboni.
- Rohschaden berücksichtigt Waffe, Kraft, Energiebonus und Echo-/Spurboni. Rüstungswert und Schutzbonus werden gemeinsam halbiert und aufgerundet abgezogen; ein Treffer verursacht mindestens den konfigurierten Mindestschaden.
- Die Schutzaktion gewährt eine Schadens- und Bruchminderung. Eine erfolgreiche Parade-Reaktion kann weiteren Schaden verhindern und Energie gewähren.
- Ein Angriff ohne Reichweite verbraucht seine geplanten Kosten und verursacht beim Angreifer Bruch.
- Kritische Treffer, Offen-Zustand und maximaler Bruch pro Treffer sind implementiert.

Die exakten Werte liegen in `src/game/tuning.ts`. Sie sind wegen des nicht erreichten Balancekorridors vorläufig.

## 4. Figuren und Ausrüstung

Die Basiswerte wurden an die in der Aufgabenstellung benannten PDF-Werte angeglichen; nicht belegte Zusatzpassive wurden entfernt. Die aktuelle Standardausrüstung ist im Inhalt des Spiels hinterlegt. Abweichende oder nachträglich geänderte Standardausrüstung muss anhand weiterer Einzelmessungen validiert werden.

## 5. Vollregel-Systeme: aktueller Stand und offene Regeln

| System | Implementierungsstand |
|---|---|
| Echos | Pro Planung kann ein Echo ausgewählt werden; ausgewählte Ladungen werden verbraucht. Typen und Umwandlungen sind nicht vollständig im Bot oder in der Messabdeckung erreichbar. |
| Kerne | Kernressourcen und Angriffe existieren; Echoweg ist selten und erreicht den Zielanteil nicht. |
| Zustände | Gebunden, Verwirrt, Verletzt und Geschützt haben teilweise implementierte Pfade. Gelähmt wird nicht verwendet. Weitere Quellen/Dauern sind gegen das PDF zu prüfen. |
| Feldmarker | Feldprägen ist vorhanden, aber die Simulation weist für sämtliche Marker 0 % Nutzung aus. Die Markertabelle ist daher nicht als funktionsfähig abgenommen. |
| Reaktionen | Stabilisieren und Parade sind nachweisbar; Ausweichen, Gegenstoß und Echo sichern werden vom Bot nicht wirksam genutzt. |
| Items | Heilmittel und Blendpulver werden nachweisbar genutzt. Energiezelle, Bruchbinde und Echo-Splitter sind selten oder ungenutzt. |
| Muster und Regelbruch | Vorhersage liegt unter der Zielabdeckung; Regelbruch ist erreichbar, aber Varianten/Wirkung sind nicht vollständig abgenommen. |
| Archivar-Verbindung | Die PDF-Auslegung mit zwei verbundenen Echos, gemeinsamer Aktivierbarkeit und gekoppeltem Ladungsverlust ist nicht als vollständig verifiziert dokumentiert. |

Diese Übersicht darf nicht als Regeltext für eine veröffentlichte Fassung interpretiert werden: Jeder offene Eintrag braucht entweder eine vollständige Implementierung mit Tests und Messung oder eine ausdrücklich begründete Streichung.

## 6. Sieg

Der aktuelle Code kennt Körper- und Bruchsieg. Vollregeln kennen zusätzlich Echo-Sieg durch Kerne. Gemessen wurden unter den entschiedenen `voll`-Duellen 96,3 % Körper-, 2,4 % Bruch- und 1,3 % Echo-Siege. Die geforderten Anteile werden verfehlt. In `kern` ist der Echo-Sieg deaktiviert.

## 7. Auslegungen / Neu in v1.1

- **Neu in v1.1 (Arbeitsentwurf):** Die Regelstufen `kern` und `voll` verwenden dieselbe Auflösung; `kern` deaktiviert Vollregelmechaniken.
- **Neu in v1.1 (Arbeitsentwurf):** Der Treffer-Mindestschaden, die halbierte Rüstungsanrechnung und die Parade sind Änderungen am Kampfkern, die in den vorliegenden Startregeln als neue Balanceelemente eingeführt wurden. Die konkreten Zahlen bleiben bis zur erfolgreichen Simulation vorläufig.
- **Energiebonus:** Es gilt die Tabelle aus der Aufgabenstellung, nicht die widersprüchliche Textformulierung „abgerundete Hälfte“.
- **Echoaktivierung:** Die festgelegte Auslegung ist eine Ladung pro Aktivierung.
- **Nicht entschieden:** Nicht hinreichend implementierte PDF-Mechaniken werden nicht stillschweigend als gestrichen oder wirksam ausgegeben.

## 8. Freigabebedingungen

Vor einer vollständigen v1.1-Fassung müssen die ausstehenden Regeln aus dem PDF mit dem Code abgeglichen, alle erreichbaren Mechaniken getestet, beide Stufen nachweislich ausbalanciert und die Oberfläche für alle Kernaktionen geprüft werden. Der aktuelle Messstand erfüllt diese Bedingungen nicht.
