# Teil 5. Was nicht aus den Büchern stammt

Jedes Blatt oben nennt, was übernommen ist. Hier steht, wo der Code kürzer oder anders ist. Nichts davon ist stillschweigend die Regel des Buches.

1. Initiative aus Initiative und Agility fehlt. Es zieht abwechselnd, wer zwei Punkte hat.
2. Dexterity, Intelligence und Fellowship fehlen. Wille steht nur in der Wundenformel.
3. Die kritische Tabelle und die Patzertabelle in `code/tafeln.ts` sind kurze eigene Zeilen. Sie sind nicht die Seiten des Grundbuchs.
4. Vorteil hat im Code keine Obergrenze. Im Spiel kann eine Kette gewonnener Schläge die Probe weit über 100 schieben. 96–00 scheitert trotzdem.
5. Die Waffenboni +4, +5 und +6 folgen dem Muster der 4. Auflage. Sie sind nicht von einer aufgeschlagenen Tabellenzeile abgetippt.
6. Die Rüstungspunkte sind dieselben drei Stufen wie vorher, umbenannt in Leder, Kette und Platte. Auch das ist keine abgetippte Rüstungsliste.
7. Laufweite und Reichweite sind Into-the-Breach-Werte mal acht, weil die Karte 64 statt 8 misst. Warhammer selbst gibt dem Menschen Movement 4.
8. Die Kette prüft auf BS, weil ihre Form der Bogen über den Bau ist, und addiert trotzdem den Stärkebonus, weil `laenge` größer als 0 ist. Im Buch wäre ein Flegel eine Nahkampfwaffe auf Weapon Skill.
9. Mythras lässt den Sieger den Effekt wählen und verlangt für Trip und Bleed oft einen zweiten Vergleich. Der Code legt den Effekt an die Waffe und wendet ihn ohne zweiten Wurf an.
10. Choose Location kann nur der Archivar, und die Wahl im Menü gilt nur, wenn der Vorsprung reicht. Sonst bleibt der umgedrehte Wurf.
11. Ein schwerer Treffer beendet den Kampf bei 0 Wunden. Es gibt keine getrennten Trefferpunkte von Kopf, Arm und Bein.
12. Die Mindestwunde von 1 ist gestrichen. Hält die Rüstung, ist der Schlag trotzdem gewonnen: der Angreifer bekommt Vorteil, der Getroffene verliert seinen.
