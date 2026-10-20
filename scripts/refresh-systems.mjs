/**
 * Refreshes the static system data from FIO and regenerates the system
 * name map used for planet display names.
 *
 *   pnpm refresh:systems            fetch /systemstars, write both files
 *   pnpm refresh:systems --offline  only regenerate system_names.json
 *
 * @author jplacht
 */
import { readFileSync, writeFileSync } from "node:fs";

const ENDPOINT = "https://rest.fnar.net/systemstars";
const STATIC = new URL("../src/assets/static/", import.meta.url);
const SYSTEMS = new URL("fio_systemstars.json", STATIC);
const NAMES = new URL("system_names.json", STATIC);
// a few systems may come and go; more than that means a broken export
const MAX_DROP = 5;

function check(systems, previous) {
	if (!Array.isArray(systems)) throw new Error("expected an array");
	for (const s of systems)
		for (const key of ["SystemId", "NaturalId", "Name", "Connections"])
			if (!(key in s))
				throw new Error(`system ${s.SystemId ?? "?"} lacks ${key}`);
	if (systems.length < previous - MAX_DROP)
		throw new Error(
			`only ${systems.length} systems (had ${previous}), not writing`
		);
}

const current = JSON.parse(readFileSync(SYSTEMS, "utf8"));
let systems = current;

if (!process.argv.includes("--offline")) {
	const res = await fetch(ENDPOINT);
	if (!res.ok) throw new Error(`${ENDPOINT}: HTTP ${res.status}`);
	systems = await res.json();
	check(systems, current.length);
	writeFileSync(SYSTEMS, JSON.stringify(systems) + "\n");
	console.log(`fio_systemstars.json: ${current.length} -> ${systems.length}`);
}

const names = Object.fromEntries(
	systems
		.filter((s) => s.Name && s.Name !== s.NaturalId)
		.map((s) => [s.NaturalId, s.Name])
		.sort(([a], [b]) => a.localeCompare(b))
);
writeFileSync(NAMES, JSON.stringify(names, null, "\t") + "\n");
console.log(`system_names.json: ${Object.keys(names).length} named systems`);
