import type { Component } from "vue";

export type SizeKey = "sm" | "md";
/** a field's state: an inset ring, and aria-invalid for an error */
export type FieldStatus = "error" | "warning";
export type NoticeType = "info" | "warning" | "error";
export type ColorKey =
	"primary" | "success" | "error" | "warning" | "secondary";
// buttons also come quiet, without a fill
export type ButtonColorKey = ColorKey | "ghost";

export interface PButtonConfig {
	base: string;
	sizes: Record<SizeKey, { base: string; icon: string; spinner: string }>;
	colors: Record<
		ButtonColorKey,
		{ base: string; hover?: string; text?: string; disabled?: string }
	>;
}

export interface PCheckboxConfig {
	container: string;
	label: string;
	input: string;
	sizes: Record<SizeKey, { input: string; icon: string }>;
	colors: Record<"base" | "disabled", string>;
	checkIcon: string;
	checkIconSVG: string;
}

export interface PButtonGroupConfig {
	horizontal: string;
	vertical: string;
}

export interface PNoticeConfig {
	container: string;
	types: Record<NoticeType, { box: string; icon: string }>;
}

/** look of every floating panel */
export interface PPanelConfig {
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
	sizes: Record<SizeKey, { container: string; field: string; input: string }>;
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

export type PDataTableAlign = "left" | "right" | "center";
export type PDataTableSortOrder = "ascend" | "descend" | false;

/** a data table's sort: one column, descending, ascending or none */
export interface PDataTableSort {
	key: string | null;
	order: PDataTableSortOrder;
}

/** one column of PDataTable; `children` group columns under one header */
export interface PDataTableColumn<T> {
	key: string;
	title?: string;
	align?: PDataTableAlign;
	titleAlign?: PDataTableAlign;
	/** true compares row[key]: numbers, strings, empty values first */
	sorter?: true | ((a: T, b: T) => number);
	defaultSortOrder?: PDataTableSortOrder;
	width?: number | string;
	minWidth?: number | string;
	/** the header spans this many columns, covering the next ones' */
	titleColSpan?: number;
	children?: PDataTableColumn<T>[];
}

/**
 * vue-tsc checks unknown props (tsconfig.typecheck.json). These fall through
 * to a component's root element and stay allowed on every component.
 */
declare module "vue" {
	interface AllowedComponentProps {
		role?: string;
		title?: string;
		id?: string;
		[attr: `aria-${string}`]: unknown;
		[attr: `data-${string}`]: unknown;
		// a valueless data-x on a component reaches the check camelized
		[attr: `data${Capitalize<string>}`]: unknown;
	}
	interface HTMLAttributes {
		[attr: `data-${string}`]: unknown;
	}
}
