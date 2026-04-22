import {
	PButtonConfig,
	PButtonGroupConfig,
	PCheckboxConfig,
	PFormConfig,
	PFormItemConfig,
	PInputConfig,
	PInputNumberConfig,
	PTagConfig,
	PTooltipConfig,
} from "@/ui/ui.types";

export const buttonConfig: PButtonConfig = {
	base: "flex flex-row items-center justify-center leading-normal rounded-sm cursor-pointer disabled:cursor-auto text-nowrap px-1 gap-1 text-xs min-w-[22px] bg-blue-800 active:bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 disabled:text-white/80",
	defaultSize: "md",
	defaultColor: "primary",
	sizes: {
		sm: {
			base: "py-0.5 px-1 gap-1 text-xs min-w-[22px] min-h-[22px]",
			icon: "w-[12px] h-[12px] flex items-center",
			spinner: "w-[12px] h-[12px]",
		},
		md: {
			base: "px-2 gap-2 text-sm h-[28px] min-w-[28px]",
			icon: "w-[16px] h-[16px] flex items-center",
			spinner: "w-[16px] h-[16px]",
		},
	},
	colors: {
		primary: {
			base: "bg-blue-800 text-white active:bg-blue-600",
			hover: "hover:bg-blue-700",
			disabled: "disabled:bg-blue-800/50 disabled:text-white/80",
		},
		success: {
			base: "bg-lime-500 text-black active:bg-lime-300",
			hover: "hover:bg-lime-400",
			disabled: "disabled:bg-lime-500/50 disabled:text-white/80",
		},
		secondary: {
			base: "bg-gray-800 text-white active:bg-gray-600",
			hover: "hover:bg-gray-700",
			disabled: "disabled:bg-gray-800/50 disabled:text-white/80",
		},
		error: {
			base: "bg-red-600 text-white active:bg-red-500",
			hover: "hover:bg-red-700",
			disabled: "disabled:bg-red-600/50 disabled:text-white/80",
		},
		warning: {
			base: "bg-gray-100 text-gray-900 active:bg-gray-300",
			hover: "hover:bg-gray-200",
			disabled: "disabled:bg-gray-100/50 disabled:text-gray-900",
		},
	},
};

export const checkboxConfig: PCheckboxConfig = {
	container: "inline-flex items-center",
	label: "flex items-center relative ",
	input: "peer h-4 w-4 transition-all cursor-pointer disabled:cursor-auto appearance-none rounded shadow hover:shadow-md border border-table-border",
	colors: {
		base: "checked:bg-blue-800 checked:border-blue-800",
		disabled: "disabled:bg-white/10 disabled:border-white/10",
	},
	checkIcon:
		"absolute opacity-0 peer-checked:opacity-100 text-white peer-disabled:text-white/20 cursor-pointer peer-disabled:cursor-auto  top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
	checkIconSVG: "h-3.5 w-3.5 fill-current stroke-current stroke-1",
};

export const buttonGroupConfig: PButtonGroupConfig = {
	horizontal:
		"inline-flex child:rounded-none [&_button]:first:rounded-l-sm [&_button]:last:rounded-r-sm",
	vertical:
		"inline-flex flex-col child:rounded-none [&_button]:first:rounded-t-sm [&_button]:last:rounded-b-sm",
};

export const tooltipConfig: PTooltipConfig = {
	trigger: "ptooltip",
	tooltip:
		"z-50 py-1 px-2 text-sm text-white bg-black/90 border border-white/20 rounded shadow-lg",
};

export const formConfig: PFormConfig = {
	container:
		"grid grid-cols-[auto_1fr] max-w-full w-full overflow-hidden child:mb-1",
};

export const formItemConfig: PFormItemConfig = {
	label: "flex-none flex items-center h-full overflow-hidden whitespace-nowrap text-ellipsis pr-4",
	content:
		"flex-none flex items-center h-full overflow-hidden whitespace-nowrap text-ellipsis",
};

export const inputNumberConfig: PInputNumberConfig = {
	container:
		"inline-flex w-full items-center leading-none rounded-sm text-nowrap bg-white/5 text-white/80",
	input: "w-full outline-0 ",
	buttonContainer: "flex flex-row ",
	buttonChangeAllowed: "text-white/70 cursor-pointer",
	buttonChangeUnallowed: "text-white/20 cursor-auto",
	sizes: {
		sm: {
			container: "gap-1 child:py-0.75 text-[12px]",
			input: "px-1",
			buttonContainer: "pr-2 child:w-[16px] child:h-[16px]",
		},
		md: {
			container: "gap-1 child:py-1 h-[28px]",
			input: "px-2",
			buttonContainer: "pr-2 child:w-[20px] child:h-[20px]",
		},
	},
};

export const inputConfig: PInputConfig = {
	container:
		"rounded-sm leading-none bg-white/5 text-white/80 overflow-hidden",
	sizes: {
		sm: {
			container: "child:py-1 child:px-2",
			input: "w-full outline-0",
		},
		md: {
			container: "child:py-1 child:px-2 h-[28px]",
			input: "w-full outline-0",
		},
	},
};

export const tagConfig: PTagConfig = {
	colors: {
		primary: "bg-blue-900 border border-white/20 text-white",
		success: "bg-[#1af09a] border border-white/20 text-black/90",
		secondary: "bg-black/50 border border-white/20 text-white",
		error: "bg-[#e86f6f] border border-white/20 text-black/90",
		warning: "bg-gray-100 border border-white/20 text-gray-900",
	},
	sizes: {
		sm: {
			container:
				"inline-flex text-xs items-center rounded-xs gap-x-0.5 py-0.25 px-1 mr-0.5",
			icon: "w-[14px] hover:text-white text-white/50 hover:bg-gray-800",
		},
		md: {
			container:
				"inline-flex items-center text-xs rounded-xs gap-x-1 py-0.5 px-1 mr-1",
			icon: "w-[16px] hover:text-white text-white/50 hover:bg-gray-800",
		},
	},
};
