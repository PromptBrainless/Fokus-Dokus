# Teil 3. Mythras, nur als Aufsatz

Mythras ersetzt Warhammer nicht. Es gibt kein zweites Lebenspunktekonto pro Körperteil.

## Belege

- Ein gewonnener Vergleich bringt Special Effects. Die Zahl hängt am Unterschied der Erfolgsstufen. Öffentlich nachgezeichnet auf [loeite.net/combat](https://loeite.net/combat.html) und in der [Special-Effects-Liste](https://github.com/AdeptAustin/mythras.net/raw/refs/heads/main/Downloads/Special_Effects.pdf).
- Übernommene Effekte aus dieser Liste, je Waffe einer, nicht das ganze Menü:
  - Bleed, Schneiden. Schwert und Speer. Im Code `blutung`: am Anfang des eigenen Zugs 1 Wunde, solange die Blutung besteht.
  - Trip Opponent. Hammer. Im Code `sturz`: der Getroffene liegt. Aufstehen kostet die nächste Bewegung.
  - Entangle. Kette. Im Code `fessel`: die nächste Runde hat 1 Aktion weniger.
  - Bypass Armour, nur wenn der Angreifer kritisch trifft. Die Rüstung dieser Rechnung ist 0. Das steht zusätzlich zur kritischen Wunde aus Teil 1.
  - Choose Location. Nur der Archivar, und nur wenn der Vorsprung mindestens 2 Erfolgsgrade ist oder der Schlag kritisch ist. Sonst bleibt die Zone der umgedrehte Wurf. Der Bot nimmt dann die Zone mit der wenigsten Rüstung.
- Action Points: Parieren und Ausweichen kosten einen Punkt und gelten für den nächsten Schlag. Das deckt sich mit der reaktiven Aktion in Mythras, ist bei uns aber vor dem Schlag gebunden und nicht in der Reaktion während des fremden Zugs.

## Schwelle im Code

`code/kampf.ts`, nach dem Treffer:

```
Spanne = Erfolgsgrade Angriff − Erfolgsgrade Abwehr
Effekt, wenn Spanne mindestens 2 und die Wunden dieser Rechnung größer als 0 sind
Ort wählen, wenn die Figur ortwahl hat und Spanne mindestens 2 oder der Schlag kritisch ist
```

Ohne angesagte Abwehr sind die Grade der Abwehr 0. Ein guter einfacher Treffer löst den Effekt also aus. Ein knapp gewonnener Vergleich nicht.

Nicht übernommen, obwohl es in derselben Liste steht: Disarm als eigener Wurf, Damage Weapon, Circumvent Parry, ein zweiter Vergleich für Trip oder Bleed, und Trefferpunkte je Körperteil. Ein schwerer Treffer auf Arm oder Bein kommt nur über die kritische Tabelle in `code/tafeln.ts`.
