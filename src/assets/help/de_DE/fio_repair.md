# Due dates

FIO Reparieren liest die Produktionsgebäude jeder Basis aus FIO: ihren Zustand und den Tag, an dem sie zuletzt repariert wurden, oder an dem sie gebaut wurden, falls sie nie repariert wurden. Wohnmodule, Lager und das Kernmodul altern ebenfalls, brauchen aber keine Reparaturmaterialien und werden daher ausgelassen.

Jeder Gebäudetyp wird an einem Zieltag fällig:

- **Mit einem zugeordneten Plan** ist das Ziel der beste Reparaturtag des Typs aus der Reparatur-Analyse dieses Plans.
- **Ohne Plan** ist das Ziel „Reparatur alle n Tage“ aus den Einstellungen.

Eine Basis wird mit ihrem ersten Gebäudetyp fällig. „Bald fällig“ markiert Basen, die höchstens so viele Tage von ihrem Zieltag entfernt sind.

# Zugeordnete Pläne

Ein Plan wird einer Basis zugeordnet, wenn er auf demselben Planeten liegt und mindestens 80 % seiner Produktionsgebäude mit FIO übereinstimmen. "Matched" means all of them match, "Likely" at least 80 %. Du kannst für eine Basis einen anderen Plan oder gar keinen Plan wählen; die Auswahl wird in deinen Einstellungen gespeichert.

# Reparaturflug

Reparieren wird jeden Tag teurer: die Rechnung wächst bis Tag 180, an dem sie einem neuen Gebäude entspricht. „Ankunft in n Tagen“ berechnet die Rechnung für den Tag, an dem das Schiff entladen wird, und „Vorhandenes aus dem Basislager nutzen“ zieht ab, was die Basis bereits auf Lager hat.

**XIT Reparatur** erstellt ein XIT-ACT-Paket mit der Ladung. Es verwendet dieselbe XIT-Herkunft und dieselbe Einstellung „Von CX kaufen“ wie FIO Verbrauch. Wähle beim Ausführen das Schiff, fliege zur Basis, entlade und führe BRA aus.

# Preise

Die Preise stammen aus deiner Standard-Marktplatz-Präferenz, wobei nur ihre Regeln auf Imperiumsebene gelten.
