import type { GlobalThemeOverrides } from "naive-ui";

const WHITE: string = "#ffffff";
const BLACK: string = "#000000";
const BASE: string = "#212529";
const BACKGROUND: string = "#1e1e1e";
const DARK_BLUE: string = "#212d40";
const GRAY_DARK: string = "#151515";

export const prunplannerTheme: GlobalThemeOverrides = {
	common: {
		primaryColor: "#6ea8fe",
		inputColor: DARK_BLUE,
		inputColorDisabled: BASE,
		baseColor: BLACK,
		fontFamily: "Roboto, Helvetica, Arial, sans-serif",
		fontFamilyMono: "Roboto, serif",
		hoverColor: "#222222",
		actionColor: WHITE,
	},
	Card: {
		color: GRAY_DARK,
		colorModal: GRAY_DARK,
		actionColor: GRAY_DARK,

		borderRadius: "6px",
		borderColor: "rgba(255,255,255,0.05)",
		boxShadow:
			"0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1)",

		textColor: "rgba(255,255,255,0.8)",

		// font sizes
		titleFontWeight: "bold",
		titleFontSizeMedium: "16px",
		fontSizeMedium: "14px",
		// paddings
		paddingMedium: "5px 10px",
	},
	DataTable: {
		thTextColor: "rgba(255,255,255,0.9)",
		tdTextColor: "rgba(255,255,255,0.8)",
		fontSizeMedium: "14px",
		thFontWeight: "bold",
		// colors
		thColor: BLACK,
		tdColorStriped: "rgb(3,5,10)",
		tdColor: "rgba(255,255,255,0.02)",
		// padding
		thPaddingMedium: "5px 10px",
		tdPaddingMedium: "5px 10px",
		tdColorSorting: "rgba(255,255,255,0)",
		tdColorHover: "rgba(255,255,255,0.03)",

		// Popover colors
		thColorPopover: BLACK,
		tdColorPopover: "rgba(255,255,255,0.02)",
		tdColorStripedPopover: GRAY_DARK,
		tdColorSortingPopover: GRAY_DARK,
		tdColorHoverPopover: "rgba(255,255,255,0.03)",
	},
	Popover: {
		color: BLACK,
		borderRadius: 0,
		padding: 0,
	},
	Table: {
		thTextColor: "rgba(255,255,255,0.9)",
		tdTextColor: "rgba(255,255,255,0.8)",
		fontSizeMedium: "14px",
		thFontWeight: "bold",
		// color
		thColor: BLACK,
		tdColorStriped: "rgb(3,5,10)",
		tdColor: "rgba(255,255,255,0.02)",
		tdColorHover: "rgba(255,255,255,0.03)",
		thColorModal: GRAY_DARK,
		thColorPopover: GRAY_DARK,
		tdColorStripedModal: GRAY_DARK,
		tdColorStripedPopover: GRAY_DARK,
		tdColorModal: "rgba(255,255,255,0.02)",
		tdColorPopover: "rgba(255,255,255,0.02)",
		// padding
		thPaddingMedium: "5px 10px",
		tdPaddingMedium: "5px 10px",
	},
	Drawer: {
		color: GRAY_DARK,
	},
	Modal: {
		color: BACKGROUND,
	},
};
