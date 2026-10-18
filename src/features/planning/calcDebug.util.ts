// Engine
import { calculateMaterialIO } from "@/features/planning/engine/materialIO";
import { TRACE_PHASES } from "@/features/planning/engine/trace";

// Util
import { formatNumber } from "@/util/numbers";

// Types & Interfaces
import type {
	IPlanCalculation,
	ITraceEntry,
} from "@/features/planning/engine/engine.types";
import type { IPlanTraceRun } from "@/features/planning/usePlanCalculation.types";
import type {
	ICalcDebugCheck,
	ICalcDebugMeta,
	ICalcDebugReport,
	ITraceNode,
	ITraceTree,
} from "@/features/planning/calcDebug.types";

/**
 * # Calculation debug
 *
 * Self-checks and text/JSON output for the calculation debug panel.
 *
 * @remark The checks recompute totals a second way on purpose: they are
 * an oracle for the engine, the one allowed exception to "keep the plan
 * engine the single source of truth" (AGENTS.md hard rule 6). Nothing
 * outside the debug panel may use them for numbers.
 */

const TOLERANCE = 1e-9;

function close(expected: number, actual: number): boolean {
	return (
		Object.is(expected, actual) ||
		Math.abs(actual - expected) <=
			Math.max(
				TOLERANCE,
				TOLERANCE * Math.max(Math.abs(expected), Math.abs(actual))
			)
	);
}

function numberCheck(
	name: string,
	expected: number,
	actual: number,
	detail?: string
): ICalcDebugCheck {
	return {
		name,
		pass: close(expected, actual),
		expected,
		actual,
		difference: actual - expected,
		detail,
	};
}

/**
 * First path where two values differ, numbers compared with Object.is
 * (NaN equals NaN, 0 and −0 differ)
 */
function firstDifference(
	expected: unknown,
	actual: unknown,
	path: string = ""
): { path: string; expected: unknown; actual: unknown } | undefined {
	if (Object.is(expected, actual)) return undefined;
	if (
		typeof expected !== "object" ||
		typeof actual !== "object" ||
		expected === null ||
		actual === null ||
		Array.isArray(expected) !== Array.isArray(actual)
	)
		return { path, expected, actual };

	const e = expected as Record<string, unknown>;
	const a = actual as Record<string, unknown>;
	for (const key of new Set([...Object.keys(e), ...Object.keys(a)])) {
		const found = firstDifference(e[key], a[key], `${path}.${key}`);
		if (found) return found;
	}
	return undefined;
}

const show = (v: unknown): string | number =>
	typeof v === "number" ? v : (JSON.stringify(v) ?? String(v));

/**
 * Checks a traced calculation against the live one and its own totals
 *
 * @param {IPlanCalculation} live The plan view's calculation
 * @param {IPlanTraceRun} run Traced calculation
 * @returns {ICalcDebugReport} Checks and warnings
 */
export function calcDebugChecks(
	live: IPlanCalculation,
	run: IPlanTraceRun
): ICalcDebugReport {
	const { result, overview } = run.calculation;
	const checks: ICalcDebugCheck[] = [];

	// 1. the tracer changes nothing
	const diff = firstDifference(live, run.calculation);
	checks.push(
		diff
			? {
					name: "traced result equals the plan view",
					pass: false,
					expected: show(diff.expected),
					actual: show(diff.actual),
					difference:
						typeof diff.expected === "number" &&
						typeof diff.actual === "number"
							? diff.actual - diff.expected
							: undefined,
					detail: diff.path.slice(1),
				}
			: { name: "traced result equals the plan view", pass: true }
	);

	// 2. material values add up to revenue − material cost
	checks.push(
		numberCheck(
			"Σ material I/O value = revenue − material cost",
			overview.dailyProfit - overview.dailyCost,
			result.materialio.reduce((sum, m) => sum + m.price, 0)
		)
	);

	// 3. profit
	const degradation: number =
		result.production.buildings.reduce(
			(sum, b) => sum - b.constructionCost * b.amount,
			0
		) / 180;
	checks.push(
		numberCheck(
			"profit = revenue − material cost − degradation",
			result.revenue - overview.dailyCost - degradation,
			result.profit
		)
	);

	// 4. both profits agree but for the last bit
	checks.push(
		numberCheck("overview profit = profit", result.profit, overview.profit)
	);

	// 5. per ticker delta from the buildings and the workforce
	const expectedDelta = new Map<string, number>();
	const add = (ticker: string, value: number) =>
		expectedDelta.set(ticker, (expectedDelta.get(ticker) ?? 0) + value);
	for (const b of result.production.buildings)
		for (const m of calculateMaterialIO([b]))
			add(m.ticker, m.output - m.input);
	for (const m of result.workforceMaterialIO) add(m.ticker, -m.input);
	const actualDelta = new Map(
		result.materialio.map((m) => [m.ticker, m.delta])
	);

	const deltaFailure = [
		...new Set([...expectedDelta.keys(), ...actualDelta.keys()]),
	]
		.map((ticker) =>
			numberCheck(
				"delta = Σ building out − in − workforce",
				expectedDelta.get(ticker) ?? 0,
				actualDelta.get(ticker) ?? 0,
				ticker
			)
		)
		.find((c) => !c.pass);
	checks.push(
		deltaFailure ?? {
			name: "delta = Σ building out − in − workforce",
			pass: true,
		}
	);

	// 6. per building efficiency and daily shares
	const buildingFailure = result.production.buildings
		.flatMap((b) => {
			const running = b.activeRecipes.filter((ar) => ar.dailyShare > 0);
			return [
				numberCheck(
					"efficiency = Π factors, shares sum to 1",
					b.efficiencyElements.reduce((p, e) => p * e.value, 1),
					b.totalEfficiency,
					`${b.name} efficiency`
				),
				...(running.length
					? [
							numberCheck(
								"efficiency = Π factors, shares sum to 1",
								1,
								running.reduce(
									(sum, ar) => sum + ar.dailyShare,
									0
								),
								`${b.name} daily shares`
							),
						]
					: []),
			];
		})
		.find((c) => !c.pass);
	checks.push(
		buildingFailure ?? {
			name: "efficiency = Π factors, shares sum to 1",
			pass: true,
		}
	);

	const warnings: string[] = run.entries
		.filter((e) => e.level === "warn")
		.map((e) => `${e.label}${e.note ? `: ${e.note}` : ""}`);
	if (run.truncated)
		warnings.push(`trace truncated at ${run.entries.length} steps`);

	return { checks, warnings };
}

/**
 * Entries per phase, nested by group; an entry whose group is in another
 * phase is a root of its own phase
 */
export function traceTree(entries: ITraceEntry[]): ITraceTree {
	const tree = Object.fromEntries(
		TRACE_PHASES.map((phase) => [phase, [] as ITraceNode[]])
	) as ITraceTree;
	const nodes = new Map<number, ITraceNode>();

	for (const entry of entries) {
		const node: ITraceNode = { entry, children: [] };
		nodes.set(entry.id, node);
		const parent =
			entry.parent === null ? undefined : nodes.get(entry.parent);
		if (parent && parent.entry.phase === entry.phase)
			parent.children.push(node);
		else tree[entry.phase].push(node);
	}

	return tree;
}

/** a value as the panel shows it */
export function formatTraceValue(value: number | string | boolean): string {
	return typeof value === "number"
		? formatNumber(value, 4, true)
		: String(value);
}

/**
 * The formula with its inputs filled in, e.g. "time_ms × amount" to
 * "1,620,000 × 2"
 */
export function fillFormula(entry: ITraceEntry): string | undefined {
	const { formula, inputs } = entry;
	if (!formula) return undefined;
	if (!inputs) return formula;
	return formula.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (name) =>
		Object.hasOwn(inputs, name) ? formatTraceValue(inputs[name]) : name
	);
}

/** inputs not shown through the formula */
export function extraInputs(entry: ITraceEntry): string | undefined {
	const used = new Set(entry.formula?.match(/[A-Za-z_][A-Za-z0-9_]*/g));
	const rest = Object.entries(entry.inputs ?? {}).filter(
		([name]) => !used.has(name)
	);
	return rest.length
		? rest.map(([k, v]) => `${k} ${formatTraceValue(v)}`).join(" · ")
		: undefined;
}

function entryLines(node: ITraceNode, depth: number, lines: string[]): void {
	const { entry } = node;
	const indent = "  ".repeat(depth);
	const sign = entry.level === "warn" ? "⚠ " : "";
	const value =
		entry.value === undefined
			? ""
			: ` = ${formatTraceValue(entry.value)}${entry.unit ? ` ${entry.unit}` : ""}`;
	lines.push(`${indent}${sign}${entry.label}${value}`);
	const filled = fillFormula(entry);
	if (filled)
		lines.push(
			`${indent}    ${filled === entry.formula ? filled : `${entry.formula} = ${filled}`}`
		);
	const extra = extraInputs(entry);
	if (extra) lines.push(`${indent}    ${extra}`);
	if (entry.note) lines.push(`${indent}    ${entry.note}`);
	for (const child of node.children) entryLines(child, depth + 1, lines);
}

/** one check as a line */
export function checkLine(check: ICalcDebugCheck): string {
	if (check.pass) return `✓ ${check.name}`;
	const parts = [
		check.detail,
		check.expected !== undefined ? `expected ${show(check.expected)}` : "",
		check.actual !== undefined ? `actual ${show(check.actual)}` : "",
		check.difference !== undefined ? `difference ${check.difference}` : "",
	].filter(Boolean);
	return `✗ ${check.name}: ${parts.join(", ")}`;
}

/**
 * The trace as plain text for a bug report
 *
 * @param {ICalcDebugMeta} meta Header
 * @param {ICalcDebugReport} report Checks and warnings
 * @param {ITraceEntry[]} entries Trace
 * @returns {string} Text
 */
export function traceText(
	meta: ICalcDebugMeta,
	report: ICalcDebugReport,
	entries: ITraceEntry[]
): string {
	const lines: string[] = [
		"PRUNplanner calculation debug",
		...Object.entries(meta).map(([k, v]) => `${k}: ${v}`),
		"",
		"checks",
		...report.checks.map((c) => `  ${checkLine(c)}`),
		...report.warnings.map((w) => `  ⚠ ${w}`),
	];
	const tree = traceTree(entries);
	for (const phase of TRACE_PHASES) {
		if (!tree[phase].length) continue;
		lines.push("", phase);
		for (const node of tree[phase]) entryLines(node, 1, lines);
	}
	return lines.join("\n");
}

/** the trace as JSON, numbers at full precision */
export function traceJSON(
	meta: ICalcDebugMeta,
	report: ICalcDebugReport,
	entries: ITraceEntry[]
): string {
	return JSON.stringify({ meta, ...report, entries }, null, 2);
}
