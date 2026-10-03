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
- Konzept und Spielfeldreferenz: `attachments/`

## Web-Assets

Die externe Quellensammlung ist in [Web app asset links](Web%20app%20asset%20links)
aufgeführt. Prüfe vor dem Einbau jeweils Lizenz, Namensnennung und erlaubte
kommerzielle Nutzung. Die vorhandenen Spielgrafiken und Referenzen sind in
`public/` und `attachments/`.
