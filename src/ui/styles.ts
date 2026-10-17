import type {
	PButtonConfig,
	PButtonGroupConfig,
	PCheckboxConfig,
	PFormConfig,
	PFormItemConfig,
	PInputConfig,
	PInputNumberConfig,
	PNoticeConfig,
	PTagConfig,
	PToastConfig,
	PPanelConfig,
	PTooltipConfig,
	FieldStatus,
} from "@/ui/ui.types";

/** a field's error or warning state */
export const fieldStatusConfig: Record<FieldStatus, string> = {
	error: "inset-ring inset-ring-negative",
	warning: "inset-ring inset-ring-warning",
};

/** surface with a tint of its colour, a 4px bar and an icon, like the toasts */
export const noticeConfig: PNoticeConfig = {
	container:
		"flex items-start gap-2 p-2 text-ink bg-surface rounded-panel border-l-4",
	types: {
		info: {
			box: "border-l-link bg-linear-to-r from-link/10 to-link/10",
			icon: "text-link",
		},
		warning: {
			box: "border-l-warning bg-linear-to-r from-warning/10 to-warning/10",
			icon: "text-warning",
		},
		error: {
			box: "border-l-negative bg-linear-to-r from-negative/10 to-negative/10",
			icon: "text-negative",
		},
	},
};

export const buttonConfig: PButtonConfig = {
	base: "touch-target flex flex-row items-center justify-center leading-none rounded-control cursor-pointer disabled:cursor-auto text-nowrap",
	sizes: {
		sm: {
			base: "py-0.5 px-1 gap-0.5 text-xs min-w-6 h-6",
			icon: "w-[12px] h-[12px]",
			spinner: "w-[12px] h-[12px]",
		},
		md: {
			base: "px-2 gap-2 text-sm h-7 min-w-7",
			icon: "w-[16px] h-[16px]",
			spinner: "w-[16px] h-[16px]",
		},
	},
	colors: {
		primary: {
			base: "bg-primary text-white active:bg-blue-600",
			hover: "hover:bg-blue-700",
			disabled: "disabled:bg-primary/50 disabled:text-white/80",
		},
		success: {
			base: "bg-positive text-black active:bg-positive/70",
			hover: "hover:bg-positive/85",
			disabled: "disabled:bg-positive/50 disabled:text-white/80",
		},
		secondary: {
			base: "bg-gray-800 text-white active:bg-gray-600",
			hover: "hover:bg-gray-700",
			disabled: "disabled:bg-gray-800/50 disabled:text-white/80",
		},
		// destructive: the negative token, so it follows the colour-blind palette
		error: {
			base: "bg-negative text-black active:bg-negative/70",
			hover: "hover:bg-negative/85",
			disabled: "disabled:bg-negative/50 disabled:text-black/60",
		},
		warning: {
			base: "bg-warning text-black active:bg-warning/70",
			hover: "hover:bg-warning/85",
			disabled: "disabled:bg-warning/50 disabled:text-black/60",
		},
		ghost: {
			base: "bg-transparent text-white active:bg-white/15",
			hover: "hover:bg-white/10",
			disabled: "disabled:bg-transparent disabled:text-white/40",
		},
	},
};

export const checkboxConfig: PCheckboxConfig = {
	container: "inline-flex items-center",
	// fills the root when the app sizes it (a whole table cell as the target)
	label: "touch-target flex grow self-stretch items-center [justify-content:inherit] cursor-pointer has-disabled:cursor-auto",
	input: "peer transition-all cursor-pointer disabled:cursor-auto appearance-none rounded-control shadow hover:shadow-md border border-table-border",
	sizes: {
		md: { input: "size-4", icon: "size-3.5" },
		sm: { input: "size-3.5", icon: "size-3" },
	},
	colors: {
		base: "checked:bg-primary checked:border-primary indeterminate:bg-primary indeterminate:border-primary",
		disabled: "disabled:bg-white/10 disabled:border-white/10",
	},
	checkIcon:
		"absolute opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-100 text-white peer-disabled:text-white/20 cursor-pointer peer-disabled:cursor-auto  top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
	checkIconSVG: "fill-current stroke-current stroke-1",
};

export const buttonGroupConfig: PButtonGroupConfig = {
	horizontal:
		"inline-flex child:rounded-none [&_button]:first:rounded-l-control [&_button]:last:rounded-r-control",
	vertical:
		"inline-flex flex-col child:rounded-none [&_button]:first:rounded-t-control [&_button]:last:rounded-b-control",
};

/** one look for every floating panel: popover, menu, select list, tooltip, toast */
export const panelConfig: PPanelConfig = {
	panel: "bg-surface text-ink border border-line-strong rounded-panel shadow-panel",
};

export const tooltipConfig: PTooltipConfig = {
	// hover and taps on a disabled control reach the trigger (it explains why)
	trigger: "ptooltip [&_:disabled]:pointer-events-none",
	tooltip: `${panelConfig.panel} py-1 px-2 text-sm text-ink-strong`,
};

export const toastConfig: PToastConfig = {
	container: `${panelConfig.panel} flex items-center gap-3 min-w-64 max-w-[calc(100vw-2rem)] py-2 pl-3 pr-2 text-sm border-l-4`,
	// accent bar: brand for info, the semantic negative for errors
	types: {
		info: "border-l-prunplanner",
		error: "border-l-negative",
	},
};

export const formConfig: PFormConfig = {
	container:
		"grid grid-cols-[auto_1fr] max-w-full w-full overflow-x-clip overflow-y-visible child:mb-1",
};

export const formItemConfig: PFormItemConfig = {
	label: "flex-none flex items-center h-full overflow-hidden whitespace-nowrap text-ellipsis pr-4",
	// clips sideways only (for the ellipsis), so the controls' hit areas
	// reach past the row; on touch screens not at all
	content:
		"flex-none flex items-center h-full min-w-0 overflow-x-clip overflow-y-visible pointer-coarse:overflow-visible whitespace-nowrap text-ellipsis",
};

export const inputNumberConfig: PInputNumberConfig = {
	container:
		"inline-flex w-full items-center leading-none rounded-control text-nowrap bg-white/5 text-ink pointer-coarse:min-h-11",
	input: "w-full h-full focus-visible:-outline-offset-2",
	// the steppers are for the mouse; touch screens type with the numeric keypad
	buttonContainer: "flex flex-row pr-1 pointer-coarse:hidden",
	buttonChangeAllowed:
		"flex items-center justify-center w-6 h-6 rounded-control text-white/70 cursor-pointer hover:bg-white/10",
	buttonChangeUnallowed:
		"flex items-center justify-center w-6 h-6 rounded-control text-white/20 cursor-auto",
	sizes: {
		sm: {
			container: "gap-1 h-6 text-xs",
			input: "px-1",
			buttonContainer: "child:p-1",
		},
		md: {
			container: "gap-1 h-7",
			input: "px-2",
			buttonContainer: "child:p-0.5",
		},
	},
};

export const inputConfig: PInputConfig = {
	container:
		"flex items-center rounded-control leading-none bg-white/5 text-ink overflow-hidden",
	// field: one-line inputs only (a textarea grows with its rows)
	sizes: {
		sm: {
			container: "child:px-2 text-xs",
			field: "h-6 pointer-coarse:h-11",
			input: "w-full h-full focus-visible:-outline-offset-2",
		},
		md: {
			container: "child:px-2",
			field: "h-7 pointer-coarse:h-11",
			input: "w-full h-full focus-visible:-outline-offset-2",
		},
	},
};

export const tagConfig: PTagConfig = {
	colors: {
		primary: "bg-blue-900 border border-white/20 text-white",
		success: "bg-positive border border-white/20 text-black/90",
		secondary: "bg-black/50 border border-white/20 text-white",
		error: "bg-negative border border-white/20 text-black/90",
		warning: "bg-warning border border-white/20 text-black/90",
	},
	sizes: {
		sm: {
			container:
				"inline-flex text-xs items-center rounded-control gap-x-0.5 py-0.25 px-1 mr-0.5",
			icon: "touch-target flex items-center justify-center w-[14px] pointer-coarse:size-11 rounded-control cursor-pointer hover:text-white text-muted hover:bg-gray-800",
		},
		md: {
			container:
				"inline-flex items-center text-xs rounded-control gap-x-1 py-0.5 px-1 mr-1",
			icon: "touch-target flex items-center justify-center w-[16px] pointer-coarse:size-11 rounded-control cursor-pointer hover:text-white text-muted hover:bg-gray-800",
		},
	},
};
