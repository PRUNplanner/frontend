import { i18n } from "@/lib/i18n";

// the value is the stored preference and the lookup key; the label is read
// at render, so it follows the locale
export const XITSTATIONWAREHOUSES: { label: string; value: string }[] = [
	{
		get label() {
			return i18n.global.t("xit.form.configure_on_execution");
		},
		value: "Configure on Execution",
	},
	{ label: "Antares Station", value: "Antares Station Warehouse" },
	{
		label: "Arclight Station",
		value: "Arclight Station Warehouse",
	},
	{ label: "Benten Station", value: "Benten Station Warehouse" },
	{ label: "Hortus Station", value: "Hortus Station Warehouse" },
	{ label: "Hubur Station", value: "Hubur Station Warehouse" },
	{ label: "Moria Station", value: "Moria Station Warehouse" },
];

export const XITSTATIONWAREHOUSESTOCX: { [key: string]: string | null } = {
	"Configure on Execution": null,
	"Antares Station Warehouse": "AI1",
	"Arclight Station Warehouse": "CI2",
	"Benten Station Warehouse": "CI1",
	"Hortus Station Warehouse": "IC1",
	"Hubur Station Warehouse": "NC2",
	"Moria Station Warehouse": "NC1",
};
