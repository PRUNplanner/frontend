export interface IShared {
	uuid: string;
	plan: string;
	view_count: number;
	created_at: Date;
}

export interface ISharedCreateResponse {
	uuid: string;
	view_count: number;
	created_at: Date;
}

export interface ISharedCloneResponse {
	uuid: string;
	plan_name: string;
}

export interface ISharedCreatePayload {
	plan: string;
}
