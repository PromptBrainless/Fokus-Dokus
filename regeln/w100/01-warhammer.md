# Teil 1. Warhammer Fantasy Roleplay 4

Quelle der Würfel, nicht der Karte.

## Belege

- Eigenschaften und Zehnerbonus: [wfrp4e.wikidot.com/characteristics](http://wfrp4e.wikidot.com/characteristics). Weapon Skill, Ballistic Skill, Strength, Toughness, Agility. Der Zehner einer Eigenschaft ist der Bonus. Movement eines Menschen ist 4, wenn ein Gitter benutzt wird.
- Kampfablauf, belegt über die Referenz des Starter Sets und die Cubicle-7-Vorschau: Nahkampf ist eine Vergleichsprobe auf Weapon Skill. Fernkampf ist eine einfache Probe auf Ballistic Skill. Getroffen hat, wer mehr Erfolgsgrade hat. Gleichstand trifft nicht.
- Schaden, 1. und 2. Auflage fortgeführt, bestätigt in der Besprechung [d20radio, Wounds, Criticals and Conditions](https://www.d20radio.com/main/wfrp-4th-edition-review-part-6-wounds-criticals-and-conditions/): Erfolgsgrade plus Waffenbonus plus Strength Bonus im Nahkampf. Fernkampf ohne Strength Bonus. Abzug ist Toughness Bonus plus Rüstungspunkte der Zone. Was übrig bleibt, sind Wunden. Null ist erlaubt.
- Trefferzone durch Umdrehen des Angriffswurfs: 01–09 Kopf, 10–24 linker Arm, 25–44 rechter Arm, 45–79 Körper, 80–89 linkes Bein, 90–00 rechtes Bein.
- Vorteil, Cubicle-7-Vorschau auf [RPGnet](https://forum.rpg.net/index.php?threads/warhammer-fantasy-roleplay-preview-combat.829158/): jeder Punkt gibt +10 auf Kampfproben. Ein gewonnener Angriff gibt +1. Verliert der Angreifer, ist sein Vorteil weg. Gewinnt die Abwehr den Vergleich, bekommt sie den Punkt. Eine Wunde löscht den Vorteil des Getroffenen.
- Kritisch: Pasch und Erfolg ist sofort eine kritische Wunde, auch wenn noch Wunden übrig sind. Dieselbe Besprechung auf d20radio. Die Tabellenwunden der kritischen Wunde ziehen Zähigkeit und Rüstung nicht noch einmal ab. Beleg dafür ist das öffentliche Critical-Hits-Reference-Sheet zu WFRP4.
- Patzer: Pasch und Fehlschlag. 01–05 gelingt immer, 96–00 scheitert immer.
- Waffenlänge, optionale Regel im Grundbuch Seite 297, nachgezeichnet von Cubicle 7 in [The Art of War](https://cubicle7games.com/en_US/blog/the-art-of-war): die kürzere Waffe ist im Abstand im Nachteil, die längere im Gedränge.
- Wundenformel, wie im Charakterteil üblich: Strength Bonus + (2 × Toughness Bonus) + Willpower Bonus.

## So liegt es im Code

Datei `code/regeln.ts`, Funktion `probe` und `vergleich`. Datei `code/kampf.ts`, Funktion `schlagAufloesen`.

```
Fertigkeit = WS oder BS + Vorteil × 10 − Malus − (Waffe hin ? 20 : 0) − Längenmalus
Erfolgsgrade = Zehner der Fertigkeit − Zehner des Wurfs
Wurf 100 zählt als Zehner 0
Erfolg behält keine negativen Grade, Fehlschlag keine positiven

Nah:   Wunden = Grade + Waffenbonus + Stärkebonus − Zähigkeitsbonus − Rüstung
Bogen mit Länge: wie Nah, die Probe geht aber auf BS
Schuss: Wunden = Grade + Waffenbonus − Zähigkeitsbonus − Rüstung
Wunden = höchstens 0, wenn die Rechnung negativ ist
```

Pasch und Erfolg: Rüstung dieser einen Rechnung ist 0, danach die Zeile aus `code/tafeln.ts`. Die Zeile ist eine Kurzfassung, nicht die volle Tabelle des Grundbuchs.

Vorteil ist nicht gedeckelt. Die Probe hat eine Untergrenze von 5, keine Obergrenze.

## Waffenbonus, an die 4. Auflage angelegt

Das Grundbuch listet den Bonus neben der Waffe, nicht als eigenen Stärkewert. Übernommen ist das Muster, nicht eine abfotografierte Tabellenzeile:

| Waffe | Bonus im Code | Länge |
|---|---|---|
| Schwert, Läuferin | +4 | kurz, Stufe 1 |
| Hammer, Brecher | +6 | Durchschnitt, Stufe 2 |
| Kette, Archivar | +5 | lang, Stufe 3 |
| Speer, Wächter | +4 | sehr lang, Stufe 4 |
| Bogen, Jäger | 4, ohne Stärke | keine, Stufe 0 |
