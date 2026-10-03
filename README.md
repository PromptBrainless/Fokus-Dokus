# ECHO//BRUCH

Taktisches Zwei-Spieler-Spiel mit simultaner Aktionsplanung. Die bestehende
Quellbasis wurde aus `grok-workspace.zip` übernommen; die Spielunterlagen liegen
unter `attachments/`.

## Lokal starten

```sh
npm install
npm run dev
```

Weitere Checks:

```sh
npm run typecheck
npm test
npm run build:dev
```

## Admin und Entwicklung

Es gibt derzeit keine Admin-Anmeldung und kein Admin-Dashboard. Authentifizierung
ist in `.grok/app-env.json` bewusst deaktiviert. Projektpflege erfolgt direkt
im Repository; bitte keine Admin-Rolle ohne festgelegtes Berechtigungsmodell
vortäuschen.

- Spielregeln und Auflösung: `src/game/`
- Spielfeld und Spieloberfläche: `src/components/echo/`
- Öffentliche Grafiken und Downloads: `public/`
- Eigene Ausrüstungs- und Item-Illustrationen: `public/equipment.svg`
- Konzept und Spielfeldreferenz: `attachments/`

## Grafik-Assets

Die Figurenporträts liegen unter `public/figuren/`; die Ausrüstungs- und
Verbrauchsgegenstände werden aus der lokalen SVG-Sammlung `public/equipment.svg`
in der Ausrüstungswahl angezeigt. Die Vektorillustrationen wurden eigens für
dieses Projekt erstellt. Zusätzliche Kampfszenen und HD-Referenzen liegen unter
`kampf/hd/`; sie decken nicht sämtliche Figuren und Spielsituationen ab.

## Web-Assets

Externe Quellensammlungen sind in [Web app asset links](Web%20app%20asset%20links)
verzeichnet. Vor der Übernahme externer Assets müssen Lizenz, Namensnennung und
Nutzungsrechte des konkreten Assets geprüft werden.
