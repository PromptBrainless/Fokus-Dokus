# Teil 4. Profile

Formel, in `code/charaktere.ts` als Zahl eingetragen und gegen die Formel geprüft:

```
Wunden = Stärkebonus + 2 × Zähigkeitsbonus + Willensbonus
Bonus = Zehner der Eigenschaft
```

| | WS | BS | Stärke | Zähigkeit | Wille | Ausweichen | Wunden | Rechnung |
|---|---|---|---|---|---|---|---|---|
| Brecher | 45 | 25 | 45 | 45 | 35 | 25 | 15 | 4 + 8 + 3 |
| Läuferin | 40 | 30 | 30 | 30 | 30 | 55 | 12 | 3 + 6 + 3 |
| Archivar | 30 | 45 | 30 | 30 | 45 | 35 | 13 | 3 + 6 + 4 |
| Wächter | 40 | 25 | 35 | 50 | 35 | 30 | 16 | 3 + 10 + 3 |
| Jäger | 30 | 50 | 30 | 30 | 30 | 45 | 12 | 3 + 6 + 3 |

Ausweichen ist die Fertigkeit der Aktion Ausweichen, angelehnt an Agility plus Übung, nicht selbst eine Eigenschaft. Parieren benutzt immer WS, auch beim Jäger und beim Archivar.

| | Probe | Schaden | Länge | Felder | Lauf | Effekt |
|---|---|---|---|---|---|---|
| Brecher | WS | 6 + SB 4 | 2 | 1–8 | 24 | Sturz |
| Läuferin | WS | 4 + SB 3 | 1 | 1–8 | 40 | Blutung |
| Wächter | WS | 4 + SB 3 | 4 | 1–16 | 24 | Blutung |
| Archivar | BS | 5 + SB 3 | 3 | 16–40, über den Bau | 32 | Fessel, Ort wählen |
| Jäger | BS | 4, ohne SB | 0 | 1–48, Stopp am Bau | 32 | keiner |

Rüstungspunkte der Zone:

| | Kopf | Arme | Körper | Beine |
|---|---|---|---|---|
| Leder, Läuferin, Archivar, Jäger | 0 | 1 | 1 | 1 |
| Kette, Brecher | 1 | 1 | 2 | 1 |
| Platte, Wächter | 2 | 3 | 4 | 2 |

Start: Brecher-Seite auf Feld 9/49, Gegenseite auf 49/9, gezählt ab 1. Im Code sind das `{x:8,y:48}` und `{x:48,y:8}`.
