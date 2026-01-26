// VueFlow, dagre
import dagre from "@dagrejs/dagre";
import { Position } from "@vue-flow/core";

// Classes
import { ProductionGraph } from "@/features/production_chain/productionGraph";
import { ProductionNode } from "@/features/production_chain/productionNode";
import { ProductionEdge } from "@/features/production_chain/productionEdge";

// Types & Interfaces
import {
	dagreSetGraphConfig,
	dagreSetNodeConfig,
} from "@/features/production_chain/dagre.config";
import {
	IFlowEdge,
	IFlowNode,
	IGraphFlow,
	IProductionGraphData,
} from "@/features/production_chain/productionGraph.types";
import {
	BUILDING_EXPERTISE_TYPE,
	IBuilding,
} from "@/features/api/gameData.types";

// Util
import { formatNumber } from "@/util/numbers";

export async function useGraph() {
	const graph: ProductionGraph = new ProductionGraph();
	await graph.init();

	async function createFlowNodes(
		nodes: ProductionNode[],
		selectedRecipes: string[]
	): Promise<IFlowNode[]> {
		const flowNodes: IFlowNode[] = [];

		for (const node of nodes) {
			const buildingData: IBuilding | undefined =
				await node.getBuildingData(selectedRecipes);

			flowNodes.push({
				id: node.id,
				type: node.type,
				label: node.materialTicker,
				position: { x: 0, y: 0 },
				class: "light",
				targetPosition: Position.Left,
				sourcePosition: Position.Right,
				data: {
					materialTicker: node.materialTicker,
					buildingTicker: buildingData?.Ticker ?? "N/A",
					buildingExpertise: buildingData?.Expertise,
					buildingWorkforce: {
						Pioneers: buildingData?.Pioneers ?? 0,
						Settlers: buildingData?.Settlers ?? 0,
						Technicians: buildingData?.Technicians ?? 0,
						Engineers: buildingData?.Engineers ?? 0,
						Scientists: buildingData?.Scientists ?? 0,
					},
					amount: node.amount,
					hasInput: node.hasInput,
					hasOutput: node.hasOutput,
				},
			});
		}

		return flowNodes;
	}

	function createFlowEdges(edges: ProductionEdge[]): IFlowEdge[] {
		const flowEdges: IFlowEdge[] = [];

		edges.forEach((edge) => {
			flowEdges.push({
				id: edge.id,
				source: `NODE#${edge.source}`,
				target: `NODE#${edge.target}`,
				sourceHandle: "output",
				targetHandle: "input",
				animated: false,
				type: "default",
				label: formatNumber(edge.quantitiy, 2),
			});
		});

		return flowEdges;
	}

	function applyDagreLayout(
		nodes: IFlowNode[],
		edges: IFlowEdge[]
	): IFlowNode[] {
		const g = new dagre.graphlib.Graph();
		g.setGraph(dagreSetGraphConfig);
		g.setDefaultEdgeLabel(function () {
			return {};
		});

		// add nodes
		nodes.forEach((fn) =>
			g.setNode(
				fn.id,
				Object.assign({ label: fn.label }, dagreSetNodeConfig)
			)
		);

		// add edges
		edges.forEach((fe) => g.setEdge(fe.source, fe.target));

		// execute layouting
		dagre.layout(g);

		// update node positions based on dagree
		g.nodes().forEach((gnode) => {
			const fnode: IFlowNode | undefined = nodes.find(
				(f) => f.label === g.node(gnode).label
			);
			if (fnode) {
				fnode.position = {
					x: g.node(gnode).x,
					y: g.node(gnode).y,
				};
			}
		});

		return nodes;
	}

	async function create(
		materialTicker: string,
		recipeAmount: number = 1,
		selectedRecipes: string[] = [],
		selectedTerminals: string = ""
	): Promise<IGraphFlow> {
		// terminals from String, replace whitespace, uppercase & split by ,
		const terminals: string[] = selectedTerminals
			.replace(/\s/g, "")
			.toUpperCase()
			.split(",");

		const graphData: IProductionGraphData = graph.createGraph(
			materialTicker,
			recipeAmount,
			selectedRecipes,
			terminals
		);

		let flowNodes = await createFlowNodes(graphData.nodes, selectedRecipes);
		const flowEdges = await createFlowEdges(graphData.edges);

		// apply dagrejs layouting
		flowNodes = applyDagreLayout(flowNodes, flowEdges);

		// "Analysis" of actual nodes
		const materialAnalysis = flowNodes
			.map((fn) => ({
				materialTicker: fn.data.materialTicker,
				amount: fn.data.amount,
			}))
			.sort((a, b) => (a.materialTicker > b.materialTicker ? 1 : -1));

		const expertiseAnalysis = flowNodes
			.map((fn) => fn.data.buildingExpertise)
			.filter((e) => e && e !== null)
			.reduce((sum, current) => {
				if (!current) return sum;
				sum[current] = (sum[current] ?? 0) + 1;
				return sum;
			}, {} as Record<Partial<BUILDING_EXPERTISE_TYPE>, number>);

		const workforceAnalysis = Object.entries(
			flowNodes
				.map((fn) => fn.data.buildingWorkforce)
				.reduce((sum, current) => {
					sum["Pioneers"] = (sum["Pioneers"] ?? 0) + current.Pioneers;
					sum["Settlers"] = (sum["Settlers"] ?? 0) + current.Settlers;
					sum["Technicians"] =
						(sum["Technicians"] ?? 0) + current.Technicians;
					sum["Engineers"] =
						(sum["Engineers"] ?? 0) + current.Engineers;
					sum["Scientists"] =
						(sum["Scientists"] ?? 0) + current.Scientists;

					return sum;
				}, {} as Record<string, number>)
		)
			.filter(([_, value]) => value > 0)
			.map(([key, value]) => ({ workforce: key, value }));

		return {
			nodes: flowNodes,
			edges: flowEdges,
			recipeOptions: graphData.recipeOptions,
			recipeSelection: graphData.recipeSelection,
			materialAnalysis,
			expertiseAnalysis,
			workforceAnalysis,
		};
	}

	return {
		create,
		createFlowNodes,
		createFlowEdges,
		applyDagreLayout,
	};
}
