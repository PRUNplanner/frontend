import type { Component } from "vue";

interface IMenuItem {
	label: string;
	routerLink?: string;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	functionCall?: Function;
	children?: IMenuItem[];
	icon?: Component;
	display: boolean;
}

export interface IMenuSection {
	label: string;
	labelShort?: string;
	display: boolean;
	children: IMenuItem[];
}
