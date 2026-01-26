import { PSelectOption } from "@/ui/ui.types";
import { ProductionEdge } from "./productionEdge";
import { ProductionNode } from "./productionNode";
import type { Position } from "@vue-flow/core";
import { BUILDING_EXPERTISE_TYPE } from "../api/gameData.types";

export interface IProductionGraphIO {
	materialTicker: string;
	quantity: number;
}

export interface IProductionGraphSubgraph {
	nodes: ProductionNode[];
	edges: ProductionEdge[];
}

export interface IProductionGraphData {
	nodes: ProductionNode[];
	edges: ProductionEdge[];
	recipeOptions: Record<string, PSelectOption[]>;
	recipeSelection: Record<string, string>;
}

export interface IFlowNodeData {
	materialTicker: string;
	buildingTicker: string;
	buildingExpertise: BUILDING_EXPERTISE_TYPE | null | undefined;
	buildingWorkforce: {
		Pioneers: number;
		Settlers: number;
		Technicians: number;
		Engineers: number;
		Scientists: number;
		[key: string]: number;
	};
	amount: number;
	hasInput: boolean;
	hasOutput: boolean;
}

export interface IFlowNode {
	id: string;
	type?: string;
	label: string;
	position: { x: number; y: number };
	class: string;
	targetPosition: Position;
	sourcePosition: Position;
	data: IFlowNodeData;
}

export interface IFlowEdge {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string;
	targetHandle?: string;
	animated: boolean;
	type: string;
	label: string;
}

export type IGraphFlowMaterialAnalysis = {
	materialTicker: string;
	amount: number;
}[];

export type IGraphFlowExpertiseAnalyis = Record<
	Partial<BUILDING_EXPERTISE_TYPE>,
	number
>;

export type IGraphFlowWorkforceAnalysis = {
	workforce: string;
	value: number;
}[];

export interface IGraphFlow {
	nodes: IFlowNode[];
	edges: IFlowEdge[];
	recipeOptions: Record<string, PSelectOption[]>;
	recipeSelection: Record<string, string>;
	materialAnalysis: IGraphFlowMaterialAnalysis;
	expertiseAnalysis: IGraphFlowExpertiseAnalyis;
	workforceAnalysis: IGraphFlowWorkforceAnalysis;
}
