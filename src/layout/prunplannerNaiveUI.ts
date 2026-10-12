import { createTheme, dataTableDark, emptyDark } from "naive-ui";
import type { GlobalThemeOverrides } from "naive-ui";

// only the dark themes of the one naive component the app renders, the data
// table (its peers like pagination or select come with it), and of the empty
// state it shows without rows; naive's full dark theme would pull in all
export const prunplannerDarkTheme = createTheme([dataTableDark, emptyDark]);

const WHITE: string = "#ffffff";
const BLACK: string = "#000000";
const BASE: string = "#212529";
const DARK_BLUE: string = "#212d40";

export const prunplannerTheme: GlobalThemeOverrides = {
	common: {
		primaryColor: "#6ea8fe",
		inputColor: DARK_BLUE,
		inputColorDisabled: BASE,
		baseColor: BLACK,
		fontFamily: "Roboto, Helvetica, Arial, sans-serif",
		fontFamilyMono: "Roboto Mono, monospace",
		hoverColor: "#222222",
		actionColor: WHITE,
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
	},
	// the data table's "No Data"
	Empty: {
		textColor: "rgba(255,255,255,0.55)",
	},
};
