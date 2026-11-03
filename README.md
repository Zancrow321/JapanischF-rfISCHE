# Japanisch lernen

App zum Unterricht: Vokabeln, Hiragana, Katakana und Kanji lesen, aussprechen und schreiben.
Läuft als App auf Android und iOS und im Browser am PC (Expo / React Native).

## Starten

```bash
npm install
npm start        # danach QR-Code mit der App „Expo Go“ scannen, oder „w“ für den Browser
```

## Prüfen

```bash
npm run typecheck
npm run lint
npm test
npm run build:web
```

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/app/` | Bildschirme (Expo Router), Tabs unter `(tabs)/` |
| `src/data/` | Kana-Tabellen, Zugriff auf Kanji und Strichdaten |
| `src/db/` | SQLite-Datenbank für Auswahl und Lernstand, mit Migrationen |
| `scripts/data/` | Skript, das die Lerndaten aus den Quelldaten erzeugt |
| `assets/data/` | Erzeugte Lerndaten (nicht von Hand bearbeiten) |

## Lerndaten

`npm run data` lädt die Quelldaten und schreibt `assets/data/` sowie `src/data/generated/` neu.
Auf GitHub läuft das automatisch über den Workflow „Lerndaten erzeugen“.

## Quellen und Lizenzen

- **KanjiVG** – Strichreihenfolge, © Ulrich Apel, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), <https://kanjivg.tagaini.net>
- **KANJIDIC2** – Lesungen und Bedeutungen der Kanji, © Electronic Dictionary Research and Development Group, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), <https://www.edrdg.org/>

Die erzeugten Daten in `assets/data/` stehen unter denselben Lizenzen.
