import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import { useSaveConflict } from "@/features/save_conflict/useSaveConflict";

const CHANGES = { theirs: [], mine: [], both: [] };

describe("useSaveConflict", () => {
	it("opens, loads the changes and resolves with the choice", async () => {
		const conflict = useSaveConflict();
		const answer = conflict.ask({
			deleted: false,
			options: ["overwrite", "reload"],
			loadChanges: async () => CHANGES,
		});

		expect(conflict.show.value).toBe(true);
		expect(conflict.loading.value).toBe(true);
		expect(conflict.options.value).toStrictEqual(["overwrite", "reload"]);
		await flushPromises();
		expect(conflict.loading.value).toBe(false);
		expect(conflict.changes.value).toStrictEqual(CHANGES);

		conflict.choose("reload");
		await expect(answer).resolves.toBe("reload");
		expect(conflict.show.value).toBe(false);
	});

	it("closing resolves null, a failed load leaves the lists out", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const conflict = useSaveConflict();
		const answer = conflict.ask({
			deleted: true,
			options: ["save_as_new"],
			loadChanges: async () => {
				throw new Error("offline");
			},
		});

		await flushPromises();
		expect(conflict.deleted.value).toBe(true);
		expect(conflict.changes.value).toBeNull();
		expect(conflict.loading.value).toBe(false);

		conflict.choose(null);
		await expect(answer).resolves.toBeNull();
		error.mockRestore();
	});

	it("a second dialog closes the first with null", async () => {
		const conflict = useSaveConflict();
		const first = conflict.ask({ deleted: false, options: ["overwrite"] });
		const second = conflict.ask({ deleted: false, options: ["reload"] });

		await expect(first).resolves.toBeNull();
		conflict.choose("reload");
		await expect(second).resolves.toBe("reload");
	});
});
