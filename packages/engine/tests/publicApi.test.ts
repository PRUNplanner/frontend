import { describe, expect, it } from "vitest";

import * as engine from "../src/index";
import * as schemas from "../src/schemas/index";

/**
 * The package's runtime surface, so any change to what the two entry
 * points export is a visible, reviewed diff. Type-only exports have no
 * runtime name; `pnpm tsc` and knip cover them.
 */
describe("public API", () => {
	it("@prunplanner/engine", () => {
		expect(Object.keys(engine).sort()).toMatchSnapshot();
	});

	it("@prunplanner/engine/schemas", () => {
		expect(Object.keys(schemas).sort()).toMatchSnapshot();
	});
});
