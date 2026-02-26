import type { KnipConfig } from "knip";
import {
	parse,
	type SFCScriptBlock,
	type SFCStyleBlock,
} from "vue/compiler-sfc";

function getScriptBlockContent(block: SFCScriptBlock | null): string[] {
	if (!block) return [];
	if (block.src) return [`import '${block.src}'`];
	return [block.content];
}

function getStyleBlockContent(block: SFCStyleBlock | null): string[] {
	if (!block) return [];
	if (block.src) return [`@import '${block.src}';`];
	return [block.content];
}

function getStyleImports(content: string): string {
	return [...content.matchAll(/(?<=@)import[^;]+/g)].join("\n");
}

const config = {
	project: ["src/**/*.{ts,vue}"],
	compilers: {
		vue: (text: string, filename: string) => {
			const { descriptor } = parse(text, { filename, sourceMap: false });
			return [
				...getScriptBlockContent(descriptor.script),
				...getScriptBlockContent(descriptor.scriptSetup),
				...descriptor.styles
					.flatMap(getStyleBlockContent)
					.map(getStyleImports),
			].join("\n");
		},
	},
	ignore: [
		"src/lib/piniaBroadcastWorker.ts",
		"src/lib/piniaBroadcastPlugin.ts",
		"src/globals.d.ts",
		"src/router/router.d.ts",
	],
	ignoreDependencies: ["fast-equals"],
	include: [
		"exports",
		"types",
		"nsTypes",
		"classMembers",
		"enumMembers",
		"duplicates",
	],
	ignoreExportsUsedInFile: true,
} satisfies KnipConfig;

export default config;
