# App über TestFlight aufs iPhone

So kommt die App von einem Windows-PC aus auf dein iPhone und die iPhones deiner Freunde. Expo baut die
App in der Cloud, du brauchst keinen Mac. Voraussetzung ist ein Konto im Apple Developer Program.

## Einmalig vorbereiten

1. Lege ein kostenloses Konto auf <https://expo.dev/signup> an.
2. Installiere in PowerShell das Expo-Werkzeug und melde dich an:

   ```powershell
   npm install -g eas-cli
   eas login
   ```

## App bauen und zu Apple schicken

1. Lade die neueste Version als ZIP von GitHub herunter und entpacke sie, wie beim Testen mit Expo Go.
2. Wechsle in PowerShell in den Projektordner (dort, wo `package.json` liegt) und gib ein:

   ```powershell
   $env:EAS_NO_VCS = "1"
   npm install
   eas build --platform ios --profile production --auto-submit
   ```

   `EAS_NO_VCS` braucht es, weil der ZIP-Ordner kein Git-Ordner ist.

3. Beim ersten Mal stellt der Befehl ein paar Fragen. Antworte so:

   | Frage | Antwort |
   | --- | --- |
   | Create an EAS project? | **Y** |
   | Do you want to log in to your Apple account? | **Y**, dann Apple-ID, Passwort und den Code vom iPhone |
   | Team auswählen | dein Team aus dem Developer Program |
   | Generate a new Apple Distribution Certificate? | **Y** |
   | Generate a new Apple Provisioning Profile? | **Y** |
   | Push Notifications | **N** (die App braucht keine) |
   | Generate a new App Store Connect API Key? | **Y** |

   Deine Apple-Zugangsdaten gibst du nur hier selbst ein. Expo speichert die Zertifikate in deinem
   Expo-Konto, damit spätere Builds ohne diese Fragen laufen.

4. Nach dem ersten Bau steht in `app.json` eine neue Zeile mit `projectId`. Schick sie Claude, dann kommt
   sie ins Repository, und die Frage „Create an EAS project?“ fällt künftig weg.

5. Warten: Der Bau dauert etwa 15 bis 30 Minuten, den Fortschritt siehst du auf expo.dev. Danach lädt Expo
   die App zu Apple hoch. Apple verarbeitet sie noch 5 bis 15 Minuten und schickt dir eine E-Mail.

## Auf dein iPhone installieren

1. Öffne <https://appstoreconnect.apple.com> → **Apps** → **Japanisch lernen** → **TestFlight**.
2. Lege unter **Interne Tests** eine Gruppe an (zum Beispiel „Ich“) und füge dich selbst hinzu.
   Interne Tester brauchen keine Prüfung durch Apple.
3. Installiere auf dem iPhone die App **TestFlight** aus dem App Store.
4. Öffne die Einladungs-E-Mail auf dem iPhone und tippe auf **Installieren**. Die App liegt dann mit
   Logo auf deinem Startbildschirm.

## Freunde dazuholen

Es gibt zwei Wege:

- **Als interne Tester (ohne Prüfung durch Apple):** Lade deine Freunde in App Store Connect unter
  **Benutzer und Zugriff** als Benutzer ein, mit der kleinsten Rolle (zum Beispiel „Kundensupport“).
  Danach fügst du sie unter TestFlight → **Interne Tests** zu deiner Gruppe hinzu. Bis zu 100 Personen.
  Dafür brauchen sie eine Apple-ID, und sie sehen dein App-Store-Connect-Konto mit dieser Rolle.
- **Als externe Tester mit Link:** Unter TestFlight → **Externe Tests** eine Gruppe anlegen und einen
  öffentlichen Link erzeugen. Den ersten Build einer Version schaut Apple kurz an, meist in unter einem
  Tag. Danach reicht der Link, bis zu 10.000 Personen.

Deine Freunde installieren ebenfalls die App TestFlight und öffnen dann die Einladung oder den Link.

## Neue Version verteilen

Neueste ZIP herunterladen, entpacken und Schritt 2 aus „App bauen und zu Apple schicken“ wiederholen.
Die Build-Nummer zählt Expo selbst hoch. TestFlight meldet allen Testern die neue Version.

## Wenn etwas schiefgeht

- **„The app name you entered is already being used“:** Den Namen „Japanisch lernen“ gibt es im App Store
  schon. Lege die App in App Store Connect unter **Apps → +** selbst mit einem anderen Namen an (zum
  Beispiel „Japanisch lernen K.“), Bundle-ID `com.zancrow.japanischlernen`, und starte den Befehl erneut.
- **„bundle identifier is not available“:** Die Kennung ist schon vergeben. Sag Claude Bescheid, dann
  bekommt die App eine neue.
- **Ein Build schlägt fehl:** Auf expo.dev beim Build auf **Logs** klicken und die rote Fehlermeldung
  an Claude schicken.
