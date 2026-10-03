import { describe, expect, it } from "vitest";

import {
	collapse,
	diffByKey,
	getSaveError,
	threeWay,
} from "@/features/save_conflict/saveConflict.util";

// Types & Interfaces
import type { IChangeLine } from "@/features/save_conflict/saveConflict.types";

const line = (area: string): IChangeLine => ({ area, key: "name", params: {} });

describe("saveConflict.util", () => {
	it.each([
		[{ status: 409, responseData: { code: "conflict" } }, "conflict"],
		[{ status: 409, responseData: { code: "other" } }, null],
		[{ status: 404 }, "deleted"],
		[{ status: 500 }, null],
		[new Error("network"), null],
		[undefined, null],
	])("getSaveError %#", (err, kind) => {
		expect(getSaveError(err)).toBe(kind);
	});

	it("diffByKey matches by key, not position", () => {
		const from = [
			{ k: "a", v: 1 },
			{ k: "b", v: 2 },
			{ k: "c", v: 3 },
		];
		const to = [
			{ k: "c", v: 3 },
			{ k: "b", v: 5 },
			{ k: "d", v: 4 },
		];

		expect(diffByKey(from, to, (i) => i.k)).toStrictEqual({
			added: [{ k: "d", v: 4 }],
			removed: [{ k: "a", v: 1 }],
			changed: [
				[
					{ k: "b", v: 2 },
					{ k: "b", v: 5 },
				],
			],
		});
		expect(diffByKey(from, [...from].reverse(), (i) => i.k)).toStrictEqual({
			added: [],
			removed: [],
			changed: [],
		});
	});

	it("threeWay diffs both sides from the loaded version", () => {
		const diff = (from: string[], to: string[]) =>
			to.filter((t) => !from.includes(t)).map(line);

		const result = threeWay(["x"], ["x", "a", "b"], ["x", "b", "c"], diff);

		expect(result.theirs.map((l) => l.area)).toStrictEqual(["a", "b"]);
		expect(result.mine.map((l) => l.area)).toStrictEqual(["b", "c"]);
		expect(result.both).toStrictEqual(["b"]);
	});

	it("collapse keeps 9 lines, cuts 10 to 8 and 'and 2 more'", () => {
		const lines = (n: number) =>
			Array.from({ length: n }, (_, i) => line(`${i}`));

		expect(collapse(lines(9))).toStrictEqual({ shown: lines(9), more: 0 });
		const cut = collapse(lines(10));
		expect(cut.shown).toHaveLength(8);
		expect(cut.more).toBe(2);
	});
});
