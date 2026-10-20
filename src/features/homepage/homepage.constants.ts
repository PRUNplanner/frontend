import type { IHomepageTourStep } from "@/features/homepage/homepageTour.types";

// the owner's figures (2026-10-12), updated by hand
export const PLAYER_COUNT = 6000;
export const PLAN_COUNT = 40000;

// the owner keeps this plan shared for the landing page
export const EXAMPLE_PLAN_UUID = "7864a361-cca5-4384-8477-ceec21a8ee65";
export const EXAMPLE_PLAN_PATH = `/shared/${EXAMPLE_PLAN_UUID}`;

export const GITHUB_URL = "https://github.com/PRUNplanner/frontend";
export const CROWDIN_URL = "https://crowdin.com/project/prunplanner";

// landing buttons only: lime primary, outlined secondary; the kit's
// buttonConfig keeps the blue primary everywhere else
const buttonBase =
	"inline-flex items-center justify-center gap-2.5 min-h-13.5 px-6 rounded-lg text-[17px] cursor-pointer transition-[filter,translate] hover:brightness-110 hover:-translate-y-px";
export const landingPrimaryButton = `${buttonBase} bg-prunplanner text-black font-bold disabled:cursor-auto disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:translate-y-0`;
export const landingOutlineButton = `${buttonBase} border border-white/28 text-white font-medium`;

// shared looks of the landing sections
export const landingEyebrow =
	"font-mono text-[13px] tracking-[0.08em] uppercase text-prunplanner";
export const landingCard = "border border-white/10 rounded-2xl bg-[#0a1010]";
// 4 / 2 / 1 columns, never a row with one leftover cell
export const landingGrid4 =
	"grid grid-cols-1 min-[541px]:grid-cols-2 min-[981px]:grid-cols-4 gap-px bg-white/10 border border-white/10 overflow-hidden";

// the login and registration forms in the landing panel: label above,
// 50 px inputs, hint below (PFormItem's label, field and info, stacked)
export const landingField =
	"flex flex-col gap-2 [&>label]:h-auto [&>label]:text-sm [&>label]:font-semibold [&>label]:text-white";
export const landingInput =
	"w-full *:h-12.5! *:rounded-lg! *:bg-[#030707]! *:border *:border-white/22 *:text-base! *:text-white! *:focus-within:border-prunplanner";
export const landingHeading =
	"m-0 text-4xl leading-[1.04] font-black tracking-[-0.03em] text-white";

// Tour regions are measured on the current captures in
// public/images/homepage: retaking a shot means re-measuring its boxes.
export const PLAN_TOUR: IHomepageTourStep[] = [
	{ key: "whole", box: [0, 0, 1, 1], zoom: 1 },
	{ key: "buildings", box: [0.05, 0.538, 0.671, 0.997], zoom: 1.45 },
	{ key: "workforce", box: [0.066, 0.205, 0.363, 0.424], zoom: 2.3 },
	{ key: "money", box: [0.379, 0.205, 0.519, 0.416], zoom: 2.6 },
	{ key: "flow", box: [0.679, 0.205, 0.992, 0.749], zoom: 1.6 },
	{ key: "tabs", box: [0.05, 0.108, 0.53, 0.146], zoom: 1.8 },
];
export const PLANET_SEARCH_TOUR: IHomepageTourStep[] = [
	{ key: "materials", box: [0.052, 0.225, 0.31, 0.425], zoom: 2.5 },
	{ key: "conditions", box: [0.048, 0.44, 0.313, 0.84], zoom: 2.1 },
	{ key: "matches", box: [0.337, 0.228, 0.983, 0.815], zoom: 1.4 },
	{ key: "create_plan", box: [0.341, 0.279, 0.363, 0.313], zoom: 2.8 },
	{ key: "compare", box: [0.335, 0.955, 0.431, 0.993], zoom: 2.3 },
];
export const EMPIRE_TOUR: IHomepageTourStep[] = [
	{ key: "totals", box: [0.095, 0.152, 0.44, 0.22], zoom: 2.0 },
	{ key: "plans", box: [0.059, 0.246, 0.475, 0.432], zoom: 1.9 },
	{ key: "material_io", box: [0.493, 0.226, 0.983, 1.0], zoom: 1.29 },
	{ key: "tabs", box: [0.715, 0.014, 0.944, 0.045], zoom: 2.2 },
];

// "Market today": the skeleton and the section share these sizes, so the
// section replaces its placeholder without a layout shift
export const marketLead =
	"m-0 max-w-[820px] text-[18px] leading-[1.55] min-h-[9lh] sm:min-h-[5lh] lg:min-h-[4lh]";
export const marketGrid =
	"grid grid-cols-1 min-[981px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-5";
export const marketCard = "h-[480px] min-[981px]:h-[440px]";
export const marketSector = "h-[132px]";
