# Due dates

FIO Repair reads each base's production buildings from FIO: their condition and the day they were last repaired, or built if they never were. Habitations, storage and the core module age too, but need no repair materials, so they are left out.

Each building type comes due at a target day:

- **With a matched plan**, the target is the type's best repair day from that plan's Repair Analysis.
- **Without a plan**, the target is "Repair every n days" from the settings.

A base comes due with its first building type. "Due soon" marks bases within that many days of their target.

# Matched plans

A plan matches a base when it is on the same planet and at least 80 % of its production buildings match FIO. "Matched" means all of them match, "Likely" at least 80 %. You can pick another plan, or no plan, for a base; the pick is saved in your preferences.

# Repair flight

Repairing costs more each day: the bill grows until day 180, when it equals a new building. "Arrives in n days" sizes the bill for the day the ship unloads, and "Use what's already in the base store" takes off what the base already holds.

**XIT Repair** builds an XIT ACT package with the load. It uses the same XIT origin and "Buy from CX" setting as FIO Burn. Pick the ship when you run it, fly to the base, unload and run BRA.

# Prices

Prices come from your default Exchange Preference, with its empire-level rules only.
