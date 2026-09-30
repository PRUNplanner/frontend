import { z } from "zod";

import { PlanetCOGCProgramTypeSchema } from "@/features/api/schemas/gameData.schemas";

/*
 * The search filter is stored in localStorage (saved searches), so its
 * schema is the source of truth for the filter model.
 */

export const PlanetSearchInfrastructureSchema = z.enum([
	"LM",
	"COGC",
	"WAR",
	"ADM",
	"SHY",
]);
export type PlanetSearchInfrastructure = z.infer<
	typeof PlanetSearchInfrastructureSchema
>;

export const PlanetSearchExtraSchema = z.enum([
	"MGC",
	"BL",
	"SEA",
	"HSE",
	"INS",
	"TSH",
]);
export type PlanetSearchExtra = z.infer<typeof PlanetSearchExtraSchema>;

export const PlanetSearchSurfaceSchema = z.enum(["rocky", "gaseous"]);
export type PlanetSearchSurface = z.infer<typeof PlanetSearchSurfaceSchema>;

export const PlanetSearchCXSchema = z.enum(["AI1", "CI1", "IC1", "NC1"]);
export type PlanetSearchCX = z.infer<typeof PlanetSearchCXSchema>;

const PlanetSearchGroupOpSchema = z.enum(["any", "all"]);

const PlanetSearchMaterialGroupSchema = z.object({
	op: PlanetSearchGroupOpSchema,
	materials: z.array(z.string().min(1).max(3)),
});
export type PlanetSearchMaterialGroup = z.infer<
	typeof PlanetSearchMaterialGroupSchema
>;

const PlanetSearchReferenceSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("plan"), planUuid: z.string().min(1) }),
	z.object({ kind: z.literal("cx"), code: PlanetSearchCXSchema }),
]);
export type PlanetSearchReference = z.infer<typeof PlanetSearchReferenceSchema>;

export const PlanetSearchFilterSchema = z.object({
	text: z.string(),
	materialGroups: z.array(PlanetSearchMaterialGroupSchema).min(1),
	groupsOp: PlanetSearchGroupOpSchema,
	minDaily: z.record(z.string(), z.number().min(0)),
	cogc: z.array(PlanetCOGCProgramTypeSchema),
	infrastructure: z.array(PlanetSearchInfrastructureSchema),
	fertile: z.boolean(),
	surface: z.array(PlanetSearchSurfaceSchema).min(1),
	acceptedExtras: z.array(PlanetSearchExtraSchema),
	references: z.array(PlanetSearchReferenceSchema),
	maxJumps: z.number().int().min(0).max(30),
});
export type PlanetSearchFilter = z.infer<typeof PlanetSearchFilterSchema>;

export const PlanetSearchViewSchema = z.enum(["list", "matrix"]);
export type PlanetSearchView = z.infer<typeof PlanetSearchViewSchema>;

export const PlanetSearchColumnSchema = z.enum([
	"fert",
	"other",
	"extras",
	"cogc",
	"AI1",
	"CI1",
	"IC1",
	"NC1",
]);
export type PlanetSearchColumn = z.infer<typeof PlanetSearchColumnSchema>;

const PlanetSearchSavedSchema = z.object({
	id: z.string(),
	name: z.string(),
	filter: PlanetSearchFilterSchema,
	view: PlanetSearchViewSchema,
});
export type PlanetSearchSaved = z.infer<typeof PlanetSearchSavedSchema>;

/** View prefs in localStorage; each field falls back on its own */
export const PlanetSearchPrefsSchema = z.object({
	savedSearches: z.array(PlanetSearchSavedSchema).catch(() => []),
	hiddenColumns: z.array(PlanetSearchColumnSchema).catch(() => []),
	hiddenMaterials: z.array(z.string()).catch(() => []),
	filtersCollapsed: z.boolean().catch(false),
	view: PlanetSearchViewSchema.catch("list"),
});
export type PlanetSearchPrefs = z.infer<typeof PlanetSearchPrefsSchema>;
