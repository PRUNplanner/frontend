/** one heading of a help article, for "On this page" */
export interface IHelpTocEntry {
	id: string;
	title: string;
	level: number;
}

/** a heading and its plain text; the lead before the first heading has id "" */
export interface IHelpSection {
	id: string;
	title: string;
	text: string;
}

/** a parsed help file (the `?help` import) */
export interface IHelpDoc {
	html: string;
	toc: IHelpTocEntry[];
	words: number;
	sections: IHelpSection[];
}

/** a search index row: one section of one article */
export interface IHelpSearchEntry extends IHelpSection {
	article: string;
}

export type HelpArea =
	"start" | "planning" | "prices" | "tools" | "fio" | "account" | "reference";

/** an entry of the article registry (helpArticles.ts) */
export interface IHelpArticle {
	id: string;
	area: HelpArea;
	/** the help file's name; none for the Welcome article */
	file?: string;
	/** groups the plan page's articles: their panel shows them as chips */
	parent?: "plan";
	related: string[];
	/** the release that last changed it */
	updatedIn: string;
}
