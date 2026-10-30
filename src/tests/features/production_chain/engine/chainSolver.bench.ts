import { describe } from "vitest";
import { bench } from "@/tests/bench";

// Engine
import {
	recipeEffects,
	solveChain,
} from "@/features/production_chain/engine/chainSolver";
import { layoutChain } from "@/features/production_chain/engine/chainLayout";

// Fixtures
import {
	chainInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

/**
 * Big chains on the test data: what one edit costs (a full re-solve), the
 * recipe picker (one re-solve per option) and the graph layout
 */

const ctx = testContext();

// the ten materials with the longest chains, and every makeable material
const sizes = [...ctx.recipesByOutput.keys()]
	.map((t) => ({ t, n: solveChain(chainInput([[t, 1]]), ctx).order.length }))
	.sort((a, b) => b.n - a.n);
const biggest = chainInput(sizes.slice(0, 10).map(({ t }) => [t, 1]));
const everything = chainInput(sizes.map(({ t }) => [t, 1]));
const gws = chainInput([["GWS", 1]]);

const gwsResult = solveChain(gws, ctx);
// the made material with the most recipes in the GWS chain
const mostRecipes = gwsResult.order
	.filter((t) => gwsResult.rows[t].source === "make")
	.sort(
		(a, b) => gwsResult.rows[b].recipeCount - gwsResult.rows[a].recipeCount
	)[0];

console.log(
	`GWS ${gwsResult.order.length} materials; ten biggest ${solveChain(biggest, ctx).order.length}; ` +
		`everything ${sizes.length} targets, ${solveChain(everything, ctx).order.length} materials; ` +
		`picker ${mostRecipes} with ${gwsResult.rows[mostRecipes].recipeCount} recipes`
);

describe("production chain", () => {
	bench("solve GWS 1 / day", () => {
		solveChain(gws, ctx);
	});

	bench("solve the ten biggest chains at once", () => {
		solveChain(biggest, ctx);
	});

	bench("solve every makeable material at once", () => {
		solveChain(everything, ctx);
	});

	bench("recipe picker in the GWS chain", () => {
		recipeEffects(gws, ctx, mostRecipes, gwsResult);
	});

	bench("layout GWS", () => {
		layoutChain(gwsResult);
	});
});
