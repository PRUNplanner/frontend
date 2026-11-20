Mit einem API-Schlüssel kann eine Tabelle, ein Dashboard, ein Skript oder ein KI-Assistent deine PRUNplanner-Daten lesen, ohne dein Passwort zu kennen. Auf der Seite [API-Schlüssel](/apikey) (**API** im Kontomenü) erstellst und widerrufst du Schlüssel, verbindest einen [KI-Assistenten](/help/mcp) und baust fertige URLs, Google-Sheets-Formeln, curl- und Python-Snippets zum Einfügen.

## Wofür Schlüssel da sind {#what-keys-are-for}

Die REST-API von PRUNplanner liefert deine Planungsdaten (Pläne, Imperien, Marktplatz-Präferenzen, das [[material-io|Material I/O]] deiner Imperien), dein [[fio|FIO]]-Lager, Spieldaten (Materialien, Aufträge, Gebäude, Planeten) und Marktzahlen wie den [[vwap|VWAP]]. Typische Anwendungen:

- das Material I/O deines Imperiums in eine Google-Tabelle holen, die sich von selbst neu berechnet,
- Marktplatzpreise oder dein FIO-Lager in dein eigenes Dashboard einspeisen,
- deine eigene Auswertung über alle deine Pläne laufen lassen.

Öffentliche Spieldaten und Marktplatzpreise brauchen keinen Schlüssel. Alles, was dir gehört, schon.

Jeder Schlüssel hat einen **Zugriff**: **Nur lesen** oder **Lesen & Schreiben**. Unter [Zugriff](#access) steht, was jeder erlaubt.

Die vollständige Referenz findest du unter [api.prunplanner.org/docs](https://api.prunplanner.org/docs). Ihr Authorize-Button nimmt einen Schlüssel an, sodass du Aufrufe im Browser ausprobieren kannst.

## Einen Schlüssel erstellen {#create}

1. Drück **Neuen Schlüssel erstellen**.
2. Gib einen **Schlüssel-Name** ein, an dem du später erkennst, wo du ihn nutzt, zum Beispiel den Namen der Tabelle. Halte ihn bei höchstens 50 Zeichen. Ein längerer Name schlägt mit einem allgemeinen Fehler fehl.
3. Wähle den **Zugriff**: **Nur lesen** (schon ausgewählt) oder **Lesen & Schreiben**. Die Zeile darunter sagt, was der Schlüssel können wird.
4. Drück **Erstellen**. Der Schlüssel erscheint einmalig unter **Dein geheimer Schlüssel (Jetzt speichern!)**, zusammen mit seinem Zugriff.
5. **Schlüssel kopieren** und bewahre ihn sicher auf, zum Beispiel in einem Passwortmanager. **Im URL-Builder nutzen** trägt ihn in den URL-Builder unten ein, nur für diesen Besuch.
6. Drück **Ich habe meinen Schlüssel gespeichert**.

> [!warning]
> PRUNplanner kann den Schlüssel nicht noch einmal anzeigen, weil es nur eine gehashte Form davon speichert, mit der sich ein Schlüssel prüfen, aber nicht zurückgewinnen lässt. Verlierst du ihn, widerrufe ihn und erstelle einen neuen.

## Schlüssel verwalten {#manage-keys}

**PRUNplanner API Schlüssel** listet deine Schlüssel mit **Name**, **Präfix**, **Zugriff**, **Erstellt am** und **Zuletzt benutzt**. Das Präfix ist der erste, nicht geheime Teil des Schlüssels, der Teil vor dem Punkt, damit du sie auseinanderhalten kannst. Zuletzt benutzt zeigt **Nie**, bis der Schlüssel genutzt wird. Danach aktualisiert es sich höchstens alle 5 Minuten, eine Anfrage von gerade eben erscheint also vielleicht noch nicht.

**Widerrufen** löscht einen Schlüssel, nachdem du bestätigt hast. Skripte und Tabellen, die ihn nutzen, funktionieren sofort nicht mehr.

## Zugriff {#access}

Jeder Schlüssel liest deine Daten. Ob er sie auch ändern kann, hängt vom Zugriff ab, den du beim Erstellen gewählt hast:

| Zugriff               | Liest deine Pläne, Imperien und anderen Daten | Erstellt, ändert und löscht sie |
| --------------------- | --------------------------------------------- | ------------------------------- |
| **Nur lesen**         | ja                                            | nein                            |
| **Lesen & Schreiben** | ja                                            | ja, mit dem Schlüssel im Header |

Neue Schlüssel bekommen **Nur lesen**, sofern du nicht **Lesen & Schreiben** wählst. Eine Tabelle, ein Dashboard oder alles, was du mit dem URL-Builder baust, liest nur, ein Schlüssel mit Nur lesen reicht also. Gib einem Schlüssel **Lesen & Schreiben** nur, wenn ein Skript von dir deine Daten ändert. Schlüssel, die du erstellt hast, bevor es den Zugriff gab, haben **Lesen & Schreiben**, damit die Skripte, die sie nutzen, weiter funktionieren.

Den Zugriff eines Schlüssels kannst du später nicht ändern. Um ihn zu ändern, erstelle einen neuen Schlüssel mit dem gewünschten Zugriff, stell deine Tabelle oder dein Skript um und widerrufe den alten.

Manches kann kein Schlüssel, egal mit welchem Zugriff. Dafür musst du bei PRUNplanner eingeloggt sein:

- Schlüssel auflisten, erstellen oder widerrufen,
- deine E-Mail, dein Passwort, deinen PrUn-Benutzernamen oder deinen FIO-API-Schlüssel ändern,
- die E-Mail-Bestätigung anfordern oder bestätigen.

Ein Schlüssel kann dein Profil lesen, aber dein FIO-API-Schlüssel kommt leer zurück: Er ist dein Schlüssel für FIO, und ein Skript braucht ihn nicht.

Versucht ein Schlüssel etwas, das er nicht darf, lautet die Antwort _403 Forbidden_ mit einem `code`, der sagt, warum:

- `api_key_read_only`: Ein Schlüssel mit **Nur lesen** hat versucht, Daten zu ändern.
- `api_key_in_url`: Ein als `?api_key=` gesendeter Schlüssel hat versucht, Daten zu ändern. Sende ihn im `Authorization`-Header.
- `api_key_not_allowed`: Ein Schlüssel hat eine der Kontoaktionen oben versucht. Log dich ein, um sie auszuführen.

Dabei wird nichts geändert.

## Einen Schlüssel nutzen {#using-keys}

Sende den Schlüssel mit jeder Anfrage, auf eine von zwei Arten:

| Art             | Beispiel                              | Nutze sie für                                                    |
| --------------- | ------------------------------------- | ---------------------------------------------------------------- |
| Header          | `Authorization: Api-Key <YOUR_KEY>`   | Skripte, curl, Dashboards                                        |
| Query-Parameter | `?api_key=<YOUR_KEY>` am Ende der URL | Google Sheets `IMPORTDATA`, Werkzeuge, die nur eine URL annehmen |

Wer eine URL sehen kann, sieht auch den Schlüssel darin, zum Beispiel jeder, der deine Tabelle öffnen kann. Deshalb kann ein Schlüssel in einer URL nur lesen, selbst einer mit **Lesen & Schreiben**. Nutze einen eigenen Schlüssel mit Nur lesen pro Tabelle oder Skript, damit du einen widerrufen kannst, ohne die anderen kaputtzumachen.

Beide Arten funktionieren für jede Anfrage, die ein Schlüssel stellen darf, nur Änderungen brauchen den Header. Trägt eine Anfrage beides, nutzt PRUNplanner den Header.

## KI-Assistenten {#ai-assistants}

Ein Schlüssel verbindet auch einen KI-Assistenten wie Claude, ChatGPT/Codex, Copilot oder Cursor mit PRUNplanners MCP-Server, sodass er deine Pläne und Imperien mit PRUNplanners eigener Engine lesen und berechnen kann. Die Karte **KI-Assistenten (MCP)** auf dieser Seite enthält die Serveradresse, den Header und den Download für Claude Desktop. [KI-Assistenten (MCP)](/help/mcp) erklärt, was der Assistent kann und wie du jeden Client einrichtest.

Ein Schlüssel mit **Nur lesen** reicht für Fragen und Was-wäre-wenn-Rechnungen; **Lesen & Schreiben** braucht der Assistent nur, um für dich zu speichern.

## URL-Builder {#url-builder}

Der **URL-Builder** schreibt die Anfrage für dich. Wähle die **Daten** und das **Format** (CSV oder JSON, wo es beides gibt) und fülle dann die Eingaben aus, die der Endpunkt braucht. Das können **Imperium**, **Plan** oder **CX-Präferenz** (aus deinem Konto), **Planet** (eine natürliche ID wie OT-580b), **Material**, **Marktplatz** (AI1, CI1, IC1, NC1 oder UNIVERSE) oder **Tage** (letzter Tag, 7, 14 oder 31) sein.

| Gruppe                                        | Daten                                                                                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bereit für Tabellen (CSV und JSON)            | **Material-I/O des Imperiums**, **Material-I/O der Pläne (Imperium)**, **Planliste des Imperiums**, **FIO-Lager**, **Marktplatzpreise** (ohne Schlüssel) |
| Deine Planungsdaten (JSON)                    | **Alle Pläne**, **Ein Plan**, **Alle Imperien**, **Ein Imperium**, **CX-Präferenzen**, **Eine CX-Präferenz**                                             |
| Öffentliche Spieldaten (JSON, ohne Schlüssel) | **Materialien**, **Aufträge**, **Gebäude**, **Ein Planet**, **Bevölkerungsbericht des Planeten**, **Marktverlauf**, **Marktverlauf, alle Materialien**   |

Dann kopiere, was du brauchst:

- **Google Sheets**: eine `=IMPORTDATA("…")`-Formel, nur für CSV. Füge sie in eine Zelle ein.
- **URL**: die Adresse mit dem Schlüssel als `?api_key=`.
- **curl** und **Python**: mit dem Schlüssel im Header. Das Python-Snippet liest die CSV-Version, wenn es eine gibt.

Bis du deinen Schlüssel einträgst, zeigen die Snippets an seiner Stelle `<YOUR_KEY>`.

> [!tip]
> **Material-I/O des Imperiums** und **Material-I/O der Pläne (Imperium)** liefern die Zahlen von der letzten Berechnung dieses Imperiums durch PRUNplanner, und die passiert, wenn du es auf der Seite [Imperium](/empire) öffnest. Die Spalte `updated_at` zeigt, wann. Öffne das Imperium, nachdem du seine Pläne geändert hast, dann zieht deine Tabelle nach.

## Rate-Limits {#rate-limits}

Überschreitest du diese Limits, bekommt die Anfrage die Antwort _429 Too Many Requests_. Warte eine Minute und versuch es erneut.

Diese Limits liegen weit über normaler Nutzung: Die 240 pro Minute sind etwa das Vierfache, das Limit für das FIO-Lager etwa das Doppelte der geschäftigsten Minute bei normaler Nutzung.

| Anfragen                                                   | Limit          | Gezählt pro                                                     |
| ---------------------------------------------------------- | -------------- | --------------------------------------------------------------- |
| Alles, was du mit einem Schlüssel oder eingeloggt anfragst | 240 pro Minute | Konto                                                           |
| **FIO-Lager**                                              | 30 pro Minute  | Konto                                                           |
| **Marktverlauf** (ein Material)                            | 120 pro Minute | IP-Adresse, oder Konto, wenn die Anfrage deinen Schlüssel trägt |
| **Marktverlauf, alle Materialien**                         | 30 pro Minute  | IP-Adresse, oder Konto, wenn die Anfrage deinen Schlüssel trägt |

Der Marktverlauf braucht keinen Schlüssel, aber wenn du einen mitschickst, werden deine Anfragen auf dein Konto statt auf deine IP-Adresse gezählt, sodass andere, die sich diese Adresse teilen (zum Beispiel ein Tabellen-Host), dein Limit nicht aufbrauchen. Ein ungültiger oder widerrufener Schlüssel wird dort ignoriert: Die Anfrage geht trotzdem durch, gezählt nach IP-Adresse.

Eine Tabelle, die viele `IMPORTDATA`-Zellen auf einmal aktualisiert, kann an ein Limit stoßen. Eine Anfrage für viele Zeilen, etwa **Marktverlauf, alle Materialien**, ist besser als eine Anfrage pro Material.

Kommen zum Beispiel 40 Anfragen an **FIO-Lager** innerhalb einer Minute, gehen die ersten 30 durch, und die anderen 10 bekommen 429.

## Gültigkeit {#validity}

Schlüssel haben kein Ablaufdatum. Ein Schlüssel funktioniert nicht mehr, wenn:

- du ihn widerrufst,
- du dein Passwort änderst oder zurücksetzt (jeder vorher erstellte Schlüssel hört sofort auf, zu funktionieren, also erstelle neue und aktualisiere deine Tabellen und Skripte),
- dein Konto deaktiviert wird.

Hat also jemand anderes dein Passwort erfahren und damit einen Schlüssel erstellt, sperrt eine Passwortänderung auch diesen Schlüssel aus.

Eine Anfrage mit einem Schlüssel, der nicht mehr funktioniert, bekommt _401_ mit „Invalid API Key“. Schlüssel, die durch eine Passwortänderung gestoppt wurden, erscheinen weiter in der Liste, und du kannst sie zum Aufräumen widerrufen.

> [!warning]
> Behandle einen Schlüssel wie dein Passwort. Leg ihn nicht in öffentliche Repositories und gib ihn nicht an Dienste weiter, denen du nicht vertraust. Könnte ein Schlüssel nach außen gelangt sein, widerrufe ihn und erstelle einen neuen.
