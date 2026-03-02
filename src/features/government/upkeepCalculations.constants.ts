// Types & Interfaces
import {
	IUpkeepBuilding,
	UpkeepNeedType,
} from "@/features/government/upkeepCalculations.types";

export const UPKEEP_NEED_TYPES: UpkeepNeedType[] = [
	"safety",
	"health",
	"comfort",
	"culture",
	"education",
];

export const UPKEEP_BUILDINGS: IUpkeepBuilding[] = [
	{
		ticker: "SST",
		name: "Safety Station",
		materials: [
			{ ticker: "DW", qtyPerDay: 10 },
			{ ticker: "OFF", qtyPerDay: 10 },
			{ ticker: "SUN", qtyPerDay: 2 },
		],
		needs: { safety: 833.3, health: 0, comfort: 0, culture: 0, education: 0 },
	},
	{
		ticker: "SDP",
		name: "Security Drone Post",
		materials: [
			{ ticker: "POW", qtyPerDay: 1 },
			{ ticker: "RAD", qtyPerDay: 0.47 },
			{ ticker: "CCD", qtyPerDay: 0.07 },
			{ ticker: "SUD", qtyPerDay: 0.07 },
		],
		needs: { safety: 1250, health: 0, comfort: 0, culture: 0, education: 0 },
	},
	{
		ticker: "EMC",
		name: "Emergency Center",
		materials: [
			{ ticker: "PK", qtyPerDay: 2 },
			{ ticker: "POW", qtyPerDay: 0.4 },
			{ ticker: "BND", qtyPerDay: 4 },
			{ ticker: "RED", qtyPerDay: 0.07 },
			{ ticker: "BSC", qtyPerDay: 0.07 },
		],
		needs: { safety: 200, health: 200, comfort: 0, culture: 0, education: 0 },
	},
	{
		ticker: "INF",
		name: "Infirmary",
		materials: [
			{ ticker: "OFF", qtyPerDay: 10 },
			{ ticker: "TUB", qtyPerDay: 6.67 },
			{ ticker: "STR", qtyPerDay: 0.67 },
		],
		needs: { safety: 0, health: 833.33, comfort: 0, culture: 0, education: 0 },
	},
	{
		ticker: "HOS",
		name: "Hospital",
		materials: [
			{ ticker: "PK", qtyPerDay: 2 },
			{ ticker: "SEQ", qtyPerDay: 0.4 },
			{ ticker: "BND", qtyPerDay: 4 },
			{ ticker: "SDR", qtyPerDay: 0.07 },
			{ ticker: "RED", qtyPerDay: 0.07 },
			{ ticker: "BSC", qtyPerDay: 0.13 },
		],
		needs: { safety: 0, health: 833.33, comfort: 0, culture: 0, education: 0 },
	},
	{
		ticker: "WCE",
		name: "Wellness Center",
		materials: [
			{ ticker: "KOM", qtyPerDay: 4 },
			{ ticker: "OLF", qtyPerDay: 2 },
			{ ticker: "DW", qtyPerDay: 6 },
			{ ticker: "DEC", qtyPerDay: 0.67 },
			{ ticker: "PFE", qtyPerDay: 2.67 },
			{ ticker: "SOI", qtyPerDay: 6.67 },
		],
		needs: { safety: 0, health: 166.67, comfort: 166.7, culture: 0, education: 0 },
	},
	{
		ticker: "PAR",
		name: "Park",
		materials: [
			{ ticker: "DW", qtyPerDay: 10 },
			{ ticker: "FOD", qtyPerDay: 6 },
			{ ticker: "PFE", qtyPerDay: 2 },
			{ ticker: "SOI", qtyPerDay: 3.33 },
			{ ticker: "DEC", qtyPerDay: 0.33 },
		],
		needs: { safety: 0, health: 0, comfort: 500, culture: 0, education: 0 },
	},
	{
		ticker: "4DA",
		name: "4D Arcades",
		materials: [
			{ ticker: "POW", qtyPerDay: 2 },
			{ ticker: "MHP", qtyPerDay: 2 },
			{ ticker: "OLF", qtyPerDay: 4 },
			{ ticker: "BID", qtyPerDay: 0.2 },
			{ ticker: "HOG", qtyPerDay: 0.2 },
			{ ticker: "EDC", qtyPerDay: 0.2 },
		],
		needs: { safety: 0, health: 0, comfort: 833.3, culture: 0, education: 0 },
	},
	{
		ticker: "ACA",
		name: "Art Cafe",
		materials: [
			{ ticker: "COF", qtyPerDay: 8 },
			{ ticker: "OLF", qtyPerDay: 2 },
			{ ticker: "VIT", qtyPerDay: 8 },
			{ ticker: "DW", qtyPerDay: 10 },
			{ ticker: "GL", qtyPerDay: 6.67 },
			{ ticker: "DEC", qtyPerDay: 0.67 },
		],
		needs: { safety: 0, health: 0, comfort: 166.7, culture: 166.7, education: 0 },
	},
	{
		ticker: "ART",
		name: "Art Gallery",
		materials: [
			{ ticker: "MHP", qtyPerDay: 1 },
			{ ticker: "HOG", qtyPerDay: 1 },
			{ ticker: "UTS", qtyPerDay: 0.67 },
			{ ticker: "DEC", qtyPerDay: 0.67 },
		],
		needs: { safety: 0, health: 0, comfort: 0, culture: 625, education: 0 },
	},
	{
		ticker: "VRT",
		name: "VR Theater",
		materials: [
			{ ticker: "POW", qtyPerDay: 1.4 },
			{ ticker: "MHP", qtyPerDay: 2 },
			{ ticker: "HOG", qtyPerDay: 1.4 },
			{ ticker: "OLF", qtyPerDay: 4 },
			{ ticker: "BID", qtyPerDay: 0.33 },
			{ ticker: "DEC", qtyPerDay: 0.67 },
		],
		needs: { safety: 0, health: 0, comfort: 0, culture: 833.3, education: 0 },
	},
	{
		ticker: "PBH",
		name: "Planetary Broadcasting Hub",
		materials: [
			{ ticker: "OFF", qtyPerDay: 10 },
			{ ticker: "MHP", qtyPerDay: 1 },
			{ ticker: "SP", qtyPerDay: 1.33 },
			{ ticker: "AAR", qtyPerDay: 0.67 },
			{ ticker: "EDC", qtyPerDay: 0.27 },
			{ ticker: "IDC", qtyPerDay: 0.13 },
		],
		needs: { safety: 0, health: 0, comfort: 0, culture: 166.7, education: 166.7 },
	},
	{
		ticker: "LIB",
		name: "Library",
		materials: [
			{ ticker: "MHP", qtyPerDay: 1 },
			{ ticker: "HOG", qtyPerDay: 1 },
			{ ticker: "CD", qtyPerDay: 0.33 },
			{ ticker: "DIS", qtyPerDay: 0.33 },
			{ ticker: "BID", qtyPerDay: 0.2 },
		],
		needs: { safety: 0, health: 0, comfort: 0, culture: 0, education: 500 },
	},
	{
		ticker: "UNI",
		name: "University",
		materials: [
			{ ticker: "COF", qtyPerDay: 10 },
			{ ticker: "REA", qtyPerDay: 10 },
			{ ticker: "TUB", qtyPerDay: 10 },
			{ ticker: "BID", qtyPerDay: 0.33 },
			{ ticker: "HD", qtyPerDay: 0.67 },
			{ ticker: "IDC", qtyPerDay: 0.2 },
		],
		needs: { safety: 0, health: 0, comfort: 0, culture: 0, education: 833.3 },
	},
];
