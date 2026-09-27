import type { BuildingExpertise } from "@/features/api/schemas/gameData.schemas";
import type { PSelectOption } from "@/ui/ui.types";

export type NodeColorType = "Material" | "Workforce" | "Expertise";

export const NodeColorTypeOptions: PSelectOption[] = [
	{
		value: "Material",
		label: "Material",
	},
	{
		value: "Workforce",
		label: "Workforce",
	},
	{
		value: "Expertise",
		label: "Expertise",
	},
];

export const WORKFORCECOLORS: Record<string, string> = {
	default: "#bf000c",
	Pioneers: "rgba(31, 48, 110, 0.99)",
	Settlers: "rgba(85, 55, 114, 0.99)",
	Technicians: "rgba(143, 59, 118, 0.99)",
	Engineers: "rgba(199, 65, 123, 0.99)",
	Scientists: "rgba(245, 72, 127, 0.99)",
};

export const EXPERTISECOLORS: Record<BuildingExpertise, string> = {
	AGRICULTURE: "#1b6600",
	CHEMISTRY: "#8f0077",
	CONSTRUCTION: "#007573",
	ELECTRONICS: "#1f0085",
	FOOD_INDUSTRIES: "#426100",
	FUEL_REFINING: "#520500",
	MANUFACTURING: "#1C0042",
	METALLURGY: "#572A00",
	RESOURCE_EXTRACTION: "#5c5300",
};
