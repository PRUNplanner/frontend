/** When a game data store was last fetched, see `gamedata_meta` */
export interface IGameDataMeta {
	// the game data store's name, e.g. "gamedata_materials"
	store: string;
	fetchedAt: number;
	rows: number;
}
