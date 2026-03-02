import { STORAGE_TYPE } from "@/features/planning/usePlanCalculation.types";

export const storageBuildingNames: string[] = [
	"STO",
	"STA",
	"STE",
	"STV",
	"STW",
];

export const infrastructureBuildingNames: string[] = [
	"HB1",
	"HB2",
	"HB3",
	"HB4",
	"HB5",
	"HBB",
	"HBC",
	"HBM",
	"HBL",
].concat(storageBuildingNames);

const STORAGE_WEIGHT_MAP: Record<STORAGE_TYPE, number> = {
	"STO": 5000,
	"STA": 2500,
	"STE": 10000,
	"STV": 2500,
	"STW": 7500,
};

const STORAGE_VOLUME_MAP: Record<STORAGE_TYPE, number> = {	
	"STO": 5000,
	"STA": 2500,
	"STE": 10000,
	"STV": 7500,
	"STW": 2500,
};

export function isStorageInfrastructure(inf: string): boolean {
    return storageBuildingNames.includes(inf);
}

export function getWeightOfAllStorages(storages: Record<STORAGE_TYPE, number>): number {
	return Object.entries(storages).reduce((sum, [key, amount]) => sum + (STORAGE_WEIGHT_MAP?.[key as STORAGE_TYPE] ?? 0) * amount, 1500);
}

export function getVolumeOfAllStorages(storages: Record<STORAGE_TYPE, number>): number {
	return Object.entries(storages).reduce((sum, [key, amount]) => sum + (STORAGE_VOLUME_MAP?.[key as STORAGE_TYPE] ?? 0) * amount, 1500);
}
