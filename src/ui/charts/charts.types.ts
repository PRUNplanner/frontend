export interface IChartBarItem {
	name: string;
	value: number;
	/** bar colour, else by sign (positive / negative token) */
	color?: string;
}
