export type HomepageTourName = "plan" | "planet_search" | "empire";

export interface IHomepageTourStep {
	key: string;
	/** x0, y0, x1, y1 in fractions of the image */
	box: [number, number, number, number];
	zoom: number;
}
