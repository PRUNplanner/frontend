// Types & Interfaces
import type { IPriceBook, PriceType } from "@/features/cx/priceBook";
import type {
	IPlanTracer,
	ITraceEntry,
	ITraceStepInput,
} from "@/features/planning/engine/engine.types";

/** the engine's phases, in calculation order */
export const TRACE_PHASES = [
	"input",
	"infrastructure",
	"workforce",
	"area",
	"experts",
	"production",
	"cogm",
	"materialio",
	"prices",
	"construction",
	"finance",
	"visitation",
] as const;

/**
 * # Plan tracer
 *
 * Records the engine's steps for the calculation debug panel: each with
 * its formula, inputs and value, nested in groups (one per building).
 * Plain TypeScript; the engine runs unchanged without one.
 *
 * @author jplacht
 *
 * @param {{ limit?: number }} options Maximum number of entries; past it
 * nothing more is recorded and the trace is marked truncated
 * @returns Tracer, its entries and whether it was truncated
 */
export function createPlanTracer({ limit = 10_000 }: { limit?: number } = {}) {
	const recorded: ITraceEntry[] = [];
	const stack: (number | null)[] = [];
	let truncated: boolean = false;

	function record(entry: ITraceStepInput): number | null {
		if (recorded.length >= limit) {
			truncated = true;
			return null;
		}
		const id = recorded.length;
		recorded.push({
			...entry,
			id,
			parent: stack.at(-1) ?? null,
			level: entry.level ?? "info",
		});
		return id;
	}

	const tracer: IPlanTracer = {
		step: (entry) => void record(entry),
		group(phase, label, scope, fn) {
			stack.push(record({ phase, label, scope }));
			try {
				return fn();
			} finally {
				stack.pop();
			}
		},
	};

	return {
		tracer,
		entries: (): ITraceEntry[] => recorded,
		truncated: (): boolean => truncated,
	};
}

/**
 * A price book that records the first lookup of each ticker and type with
 * its price and source; later lookups only count uses. Prices are the
 * given book's, unchanged.
 *
 * @author jplacht
 *
 * @param {IPriceBook} book Price Book
 * @param {IPlanTracer} trace Tracer
 * @returns {IPriceBook} Tracing Price Book
 */
export function tracePriceBook(
	book: IPriceBook,
	trace: IPlanTracer
): IPriceBook {
	const seen = new Map<string, { uses: number }>();

	return {
		getPrice(materialTicker: string, type: PriceType): number {
			const price = book.getPrice(materialTicker, type);
			const key = `${materialTicker}#${type}`;
			const known = seen.get(key);
			if (known) {
				known.uses++;
				return price;
			}

			const source = book.getPriceSource(materialTicker, type);
			// the entry keeps this object, so later uses still count
			const inputs = {
				level: source.level,
				exchange: source.exchange ?? "—",
				key: source.key ?? "—",
				uses: 1,
			};
			seen.set(key, inputs);
			trace.step({
				phase: "prices",
				label: `${materialTicker} ${type}`,
				inputs,
				value: price,
				scope: { ticker: materialTicker },
				level:
					source.level === "unresolved" || price === 0
						? "warn"
						: "info",
				note:
					source.level === "unresolved"
						? "no price found"
						: price === 0
							? "price is 0"
							: undefined,
			});
			return price;
		},
		getPriceSource: book.getPriceSource,
	};
}
