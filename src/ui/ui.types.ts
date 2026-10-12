import type { Component } from "vue";

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

/** default panel look of PPopover */
export interface PPopoverConfig {
	panel: string;
}

export type PDropdownOption =
	| {
			key: string;
			label: string;
			icon?: Component;
			/** second, muted line under the label */
			hint?: string;
			/** destructive action, shown in the negative colour */
			danger?: boolean;
	  }
	| { type: "divider" };

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
	/** 0 keeps the toast until it is destroyed or closed */
	duration?: number;
	/** adds an X */
	closable?: boolean;
}

/** returned by toast(), closes it early */
export interface PToastHandle {
	destroy: () => void;
}

export interface PToastEntry {
	id: number;
	text: string;
	type: "info" | "error";
	action?: { label: string; onClick: () => void };
	closable: boolean;
}

export interface PToastConfig {
	container: string;
	types: Record<"info" | "error", string>;
}

export interface PConfirmOptions {
	title: string;
	content: string;
	positiveText: string;
	negativeText: string;
}
