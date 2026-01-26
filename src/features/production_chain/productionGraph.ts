// Classes
import { ProductionEdge } from "@/features/production_chain/productionEdge";
import {
	ProductionNode,
	setExtractableMaterials,
	isExtractable,
} from "@/features/production_chain/productionNode";

// Composables
import { useBuildingData } from "@/database/services/useBuildingData";
import { usePlanetData } from "@/database/services/usePlanetData";

// Types & Interfaces
import {
	IRecipe,
	IPlanet,
	PLANET_RESOURCETYPE_TYPE,
} from "@/features/api/gameData.types";
import {
	IProductionGraphData,
	IProductionGraphIO,
	IProductionGraphSubgraph,
} from "@/features/production_chain/productionGraph.types";
import { PSelectOption } from "@/ui/ui.types";

export class ProductionGraph {
	nodes: Record<string, ProductionNode>;
	selectedRecipes: string[] = [];
	terminals: string[] = [];

	constructor() {
		this.nodes = {};
	}

	async init() {
		const buildingData = await useBuildingData();
		const allRecipes = Object.values(
			await buildingData.getAllBuildingRecipes() // async version
		);

		allRecipes.forEach((buildingRecipes: IRecipe[]) => {
			buildingRecipes.forEach((recipe: IRecipe) => {
				// outputs
				recipe.Outputs.forEach((output) => {
					const node = this.getOrCreateNode(output.Ticker);
					node.addRecipe(recipe);
				});
				// inputs
				recipe.Inputs.forEach((input) =>
					this.getOrCreateNode(input.Ticker)
				);
			});
		});

		// Collect all extractable materials from planet resources
		await this.loadExtractableMaterials();
	}

	/**
	 * Loads all extractable materials from planet resources and registers them
	 * so they are treated as natural resource origins in the production chain.
	 */
	private async loadExtractableMaterials() {
		try {
			const { planets, reload } = usePlanetData();

			// Ensure planets are loaded
			await reload();

			// Map resource types to extraction building tickers
			const resourceTypeToBuildingTicker: Record<
				PLANET_RESOURCETYPE_TYPE,
				string
			> = {
				MINERAL: "EXT",
				GASEOUS: "COL",
				LIQUID: "RIG",
			};

			// Collect all extractable materials with their building tickers
			const extractableMaterialsMap: Record<string, string> = {};

			if (planets.value && planets.value.length > 0) {
				planets.value.forEach((planet: IPlanet) => {
					planet.Resources.forEach((resource) => {
						const buildingTicker =
							resourceTypeToBuildingTicker[resource.ResourceType];
						if (buildingTicker) {
							extractableMaterialsMap[resource.MaterialTicker] =
								buildingTicker;
						}
					});
				});
			}

			// Register extractable materials with ProductionNode
			setExtractableMaterials(extractableMaterialsMap);
		} catch {
			// If planet data is not available, continue without extractable materials
			// The production chain will still work, just without natural resource detection
			setExtractableMaterials({});
		}
	}

	getOrCreateNode(materialTicker: string): ProductionNode {
		if (!this.nodes[materialTicker]) {
			this.nodes[materialTicker] = new ProductionNode(materialTicker);
		}
		return this.nodes[materialTicker];
	}

	getNode(materialTicker: string): ProductionNode | undefined {
		return this.nodes[materialTicker];
	}

	subGraph(node: ProductionNode): IProductionGraphSubgraph {
		let nodes: ProductionNode[] = [];
		let edges: ProductionEdge[] = [];

		// add the start node
		nodes.push(node);

		// define the amount that this node produces
		node.amount =
			(node.getOutput(node.materialTicker, this.selectedRecipes)
				?.quantity ?? 0) * node.recipeAmount;

		// find all the inputs we need for this node
		if (!this.terminals.includes(node.materialTicker)) {
			node.getInput(this.selectedRecipes).forEach((input) => {
				const inputNeed: number = input.quantity * node.recipeAmount;
				const inputNode: ProductionNode | undefined = this.getNode(
					input.materialTicker
				);

				if (inputNode) {
					const inputNodeOutput: IProductionGraphIO | undefined =
						inputNode.getOutput(
							inputNode.materialTicker,
							this.selectedRecipes
						);

					// if the producer node is not producing, this is a natural resource
					if (!inputNodeOutput) {
						inputNode.amount = inputNeed;
					} else {
						// input recipe amount to be adjusted
						inputNode.recipeAmount =
							inputNeed / inputNodeOutput.quantity;
					}

					// push in a edge
					edges.push(
						new ProductionEdge(
							node.materialTicker,
							input.materialTicker,
							inputNeed
						)
					);

					// recursively continue with new subgraph
					nodes = nodes.concat(this.subGraph(inputNode).nodes);
					edges = edges.concat(this.subGraph(inputNode).edges);
				}
			});
		}

		return {
			nodes,
			edges,
		};
	}

	createGraph(
		materialTicker: string,
		recipeAmount: number,
		selectedRecipes: string[],
		terminals: string[]
	): IProductionGraphData {
		this.selectedRecipes = selectedRecipes;
		this.terminals = terminals;

		let nodes: ProductionNode[] = [];
		let edges: ProductionEdge[] = [];

		// OutputMaterial: RecipeNames[]
		const recipeOptions: Record<string, PSelectOption[]> = {};
		const recipeSelection: Record<string, string> = {};

		// get the initial node
		const initialNode = this.getNode(materialTicker);

		if (initialNode) {
			initialNode.recipeAmount = recipeAmount;
			nodes = nodes.concat(this.subGraph(initialNode).nodes);
			edges = edges.concat(this.subGraph(initialNode).edges);
		}

		// make nodes + edges unique, # NOTE: O(1)

		const nodeMap = new Map<string, ProductionNode>();
		const edgeMap = new Map<string, ProductionEdge>();

		for (const node of nodes) {
			// unique node map
			if (!nodeMap.has(node.id)) {
				if (node.materialTicker !== materialTicker) node.amount = 0;
				// Reset flags for fresh calculation each time graph is created
				node.hasInput = false;
				node.hasOutput = false;
			}
			nodeMap.set(node.id, node);

			// generate recipe options
			const outputTicker: string | undefined = node.getOutput(
				node.materialTicker,
				this.selectedRecipes
			)?.materialTicker;
			if (outputTicker) {
				// Start with production recipes
				const options = node.recipes.map((r) => ({
					label: r.RecipeId,
					value: r.RecipeId,
				}));

				// Add extraction option for extractable materials
				if (isExtractable(node.materialTicker)) {
					const buildingTicker =
						node.getRecipe([])?.BuildingTicker ?? "EXT";
					const extractionId = `${buildingTicker}#=>${node.materialTicker}`;
					options.unshift({
						label: extractionId,
						value: extractionId,
					});
				}

				recipeOptions[outputTicker] = options;

				// set the initial selection
				const r = node.getRecipe(this.selectedRecipes);
				if (r) recipeSelection[outputTicker] = r.RecipeId;
			}
		}

		// handle unique edges and node adjustments
		for (const edge of edges) {
			if (!edgeMap.has(edge.id)) edgeMap.set(edge.id, edge);

			const targetNode = [...nodeMap.values()].find(
				(n) => n.materialTicker === edge.target
			);
			const sourceNode = [...nodeMap.values()].find(
				(n) => n.materialTicker === edge.source
			);

			if (targetNode) {
				targetNode.amount += edge.quantitiy;
				targetNode.hasInput = true;
			}

			if (sourceNode) sourceNode.hasOutput = true;
		}

		return {
			nodes: Array.from(nodeMap.values()),
			edges: Array.from(edgeMap.values()),
			recipeOptions,
			recipeSelection,
		};
	}
}
