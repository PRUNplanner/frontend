import { z } from "zod";

// Util
import { loadGameData } from "@/mcp/gameData";
import { ToolError } from "@/mcp/backend";
import { defineTool } from "@/mcp/tools/shared";

// Types & Interfaces
import type { Recipe } from "@/features/api/schemas/gameData.schemas";

const recipe = (r: Recipe) => ({
	recipe_id: r.recipe_id,
	name: r.recipe_name,
	building: r.building_ticker,
	hours: Math.round((r.time_ms / 3_600_000) * 100) / 100,
	inputs: r.inputs.map((m) => ({
		ticker: m.material_ticker,
		amount: m.material_amount,
	})),
	outputs: r.outputs.map((m) => ({
		ticker: m.material_ticker,
		amount: m.material_amount,
	})),
});

export const lookupMaterial = defineTool({
	name: "lookup_material",
	title: "Look up a material",
	description:
		"A material's name, category, weight and volume, every recipe that makes it and every recipe that uses it, with building, inputs, outputs and duration (base time, before efficiency). Use the recipe_id in calculate_plan_variant.",
	inputSchema: z.object({
		ticker: z.string().describe("Material ticker, e.g. RAT"),
	}),
	async run({ ticker }, { backend }) {
		const t = ticker.toUpperCase();
		const gameData = await loadGameData(backend);
		const material = gameData.materials.get(t);
		if (!material) throw new ToolError(`Unknown material ${ticker}.`);
		const has = (list: Recipe["inputs"]) =>
			list.some((m) => m.material_ticker === t);
		const madeBy = gameData.recipes.filter((r) => has(r.outputs));
		const usedBy = gameData.recipes.filter((r) => has(r.inputs));
		return {
			text: `${material.name} (${t}): made by ${madeBy.length} recipes, used by ${usedBy.length}.`,
			data: {
				material,
				made_by: madeBy.map(recipe),
				used_by: usedBy.map(recipe),
			},
		};
	},
});
