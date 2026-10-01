export type SizeKey = "sm" | "md";
export type ColorKey =
	| "primary"
	| "success"
	| "error"
	| "warning"
	| "secondary";
// buttons also come quiet, without a fill
export type ButtonColorKey = ColorKey | "ghost";

export interface PButtonConfig {
	base: string;
	sizes: Record<SizeKey, { base: string; icon: string; spinner: string }>;
	colors: Record<
		ButtonColorKey,
		{ base: string; hover?: string; text?: string; disabled?: string }
	>;
	defaultSize: SizeKey;
	defaultColor: ColorKey;
}

export interface PCheckboxConfig {
	container: string;
	label: string;
	input: string;
	colors: Record<"base" | "disabled", string>;
	checkIcon: string;
	checkIconSVG: string;
}

export interface PButtonGroupConfig {
	horizontal: string;
	vertical: string;
}

/** panel look for raw naive-ui NPopover overlays */
export interface PPopoverConfig {
	panel: string;
}

export interface PTooltipConfig {
	trigger: string;
	tooltip: string;
}

export interface PFormConfig {
	container: string;
}

export interface PFormItemConfig {
	label: string;
	content: string;
}

export interface PInputNumberConfig {
	container: string;
	input: string;
	buttonContainer: string;
	buttonChangeAllowed: string;
	buttonChangeUnallowed: string;
	sizes: Record<
		SizeKey,
		{ container: string; input: string; buttonContainer: string }
	>;
}

export interface PInputConfig {
	container: string;
	sizes: Record<SizeKey, { container: string; input: string }>;
}

export interface PSelectOption {
	label: string;
	value: string | number | undefined;
	/** shown on the right, not searched */
	badge?: string;
	children?: Omit<PSelectOption, "children">[];
}

export interface PTagConfig {
	colors: Record<ColorKey, string>;
	sizes: Record<SizeKey, { container: string; icon: string }>;
}

export interface PToastOptions {
	type?: "info" | "error";
	/** one button, e.g. "Undo" */
	action?: { label: string; onClick: () => void };
	duration?: number;
}

export interface PToastConfig {
	container: string;
	types: Record<"info" | "error", string>;
}
