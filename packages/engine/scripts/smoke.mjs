// Smoke test of the built package (criterion 8 of
// specs/2026-11-26-engine-package.md): plain Node, no Vite. Unpacks the
// tarball `pnpm pack` made, imports its dist/ and checks calculatePlan
// against the Node golden snapshot.
// Usage: node scripts/smoke.mjs [tarball] (default: the newest *.tgz here)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const tarball =
	process.argv[2] ??
	fs
		.readdirSync(root)
		.filter((f) => f.endsWith(".tgz"))
		.map((f) => path.join(root, f))
		.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
if (!tarball) throw new Error("no tarball: run `pnpm pack` first");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "engine-smoke-"));
execFileSync("tar", ["-xzf", tarball, "-C", dir]);
const pkg = JSON.parse(
	fs.readFileSync(path.join(dir, "package", "package.json"), "utf8")
);
const entry = (key) =>
	pathToFileURL(path.join(dir, "package", pkg.exports[key].default)).href;

// zod is a peer dependency: resolve it from the workspace
fs.symlinkSync(
	path.join(root, "node_modules"),
	path.join(dir, "package", "node_modules"),
	"dir"
);

const { calculatePlan, createPriceBook, groupRecipesByBuilding } = await import(
	entry(".")
);
const schemas = await import(entry("./schemas"));
if (!schemas.PlanSchema) throw new Error("schemas entry has no PlanSchema");

const data = (name) =>
	JSON.parse(
		fs.readFileSync(
			path.join(root, "../../src/tests/test_data", `${name}.json`),
			"utf8"
		)
	);
const exchanges = new Map(
	data("api_data_exchanges").map((e) => [e.ticker_id, e])
);
const ctx = {
	buildings: new Map(
		data("api_data_buildings").map((b) => [b.building_ticker, b])
	),
	recipesByBuilding: groupRecipesByBuilding(data("api_data_recipes")),
	materials: new Map(data("api_data_materials").map((m) => [m.ticker, m])),
	planet: data("api_data_planet_etherwind"),
	prices: createPriceBook(undefined, undefined, (id) => exchanges.get(id)),
};
const result = calculatePlan(
	{
		plan: data("api_data_plan_etherwind"),
		empire: undefined,
		cxUuid: undefined,
	},
	ctx
);

// same normalisation as src/tests/golden.ts
const normalize = (v) =>
	typeof v === "number"
		? Number.isFinite(v)
			? Number(v.toPrecision(10))
			: String(v)
		: Array.isArray(v)
			? v.map(normalize)
			: v && typeof v === "object"
				? Object.fromEntries(
						Object.entries(v).map(([k, x]) => [k, normalize(x)])
					)
				: v;
const actual = JSON.stringify(normalize(result), null, 1);
const expected = fs.readFileSync(
	path.join(root, "tests/__snapshots__/calculatePlan.etherwind.golden.json"),
	"utf8"
);
fs.rmSync(dir, { recursive: true, force: true });
if (actual !== expected) {
	console.error("smoke: dist result differs from the golden snapshot");
	process.exit(1);
}
console.log(`smoke: ${path.basename(tarball)} matches the golden snapshot`);
