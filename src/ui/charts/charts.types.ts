export interface IChartEmpirePieElement {
	name: string;
	value: number;
	color: string;
}

export interface IChartEmpireTreeElement extends IChartEmpirePieElement {
	cogc: string;
}
