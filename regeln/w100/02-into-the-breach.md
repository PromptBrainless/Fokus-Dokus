# Teil 2. Into the Breach

Quelle der Karte, nicht der Würfel.

## Belege

- Einheiten tragen Health, Move und eine Waffenklasse. Die erste Gruppe, Rift Walkers, steht auf der [Mech-Liste](https://intothebreach.fandom.com/wiki/Mechs): Combat Mech Prime, Cannon Mech Brute, Artillery Mech Ranged, jeweils Move 3.
- Drei Muster, nach den Waffenklassen und der öffentlichen Musterbeschreibung:
  - Prime, Schlag auf benachbarte Felder.
  - Brute, Geschoss in einer geraden Linie, Berge und Gebäude halten es auf.
  - Ranged, Artillerie über Hindernisse, mit einer Mindestweite. Artemis und die Scarab-Artillerie arbeiten so. Berge blocken Lauf und Geschoss, nicht den Bogen.
- Die Karte zeigt das Ziel, bevor der Schlag fällt. Das ist die offene Information des Spiels, keine verdeckte Ansage.
- Aktionsfolge, nicht aus Into the Breach, sondern aus der Mechanikliste, die wir dafür schon benutzt haben: [board-game-rules.com/game-mechanics/actions](https://board-game-rules.com/game-mechanics/actions/). Prüfen, wählen, kosten, wirken, abschließen. Budget: 2 Aktionspunkte. Steht in `code/aktionen.ts`.

## Übersetzung auf 64×64

Into the Breach spielt auf 8 Feldern Kante. Unsere Karte hat 64. Der Faktor ist 8. Bewegung 3, 4 und 5 wird zu 24, 32 und 40. Ein benachbartes Feld wird zu 8 Feldern. Die Artillerie-Mindestweite 2 wird zu 16.

| Form im Code | Muster | Wer |
|---|---|---|
| `nah` | vier Richtungen, Stopp am Bau und am Gegner | Brecher, Läuferin, Wächter |
| `schuss` | vier Richtungen, Stopp am Bau | Jäger |
| `bogen` | vier Richtungen, Bau wird übersprungen, unter `mindest` kein Treffer | Archivar, 16 bis 40 |

Startfelder: A auf 9/49, B auf 49/9. Der Bau ist das mittlere 16×16, Felder 24 bis 39. Das ist das alte 2×2, mal acht.

Die Anzeige: weiß die eigene Linie, kupfer die des Gegners, gelb nur während Bewegen. Die Fläche ist eine Zeichenfläche und lässt sich schieben, weil 64×64 Knöpfe auf einem Telefon keine Felder mehr sind.

Gedränge für die Waffenlänge aus Teil 1 ist Distanz 8 oder weniger. Das ist ein altes Feld.
