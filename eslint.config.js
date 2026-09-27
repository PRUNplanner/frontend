import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import ts from "typescript-eslint";
import globals from "globals";

export default [
	{
		ignores: [
			"**/dist/*",
			"**/coverage/**",
			"tsconfig.json",
			"tailwind.config.js",
		],
	},
	{
		languageOptions: {
			ecmaVersion: "latest",
			globals: {
				__APP_VERSION__: "readonly",
				...globals.browser,
				...globals.node,
			},
		},
	},

	// js
	js.configs.recommended,

	// ts
	...ts.configs.recommended,
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-expressions": [
				"error",
				{ allowTernary: true },
			],
			"no-async-promise-executor": "off",

			// ensure underscore-prefixed names are ignored for unused-vars
			"no-unused-vars": "off", // disable base rule
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					varsIgnorePattern: "^_",
					argsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],

			// types: `interface` for object shapes, `import type` for types
			"@typescript-eslint/no-import-type-side-effects": "error",
			"@typescript-eslint/consistent-type-definitions": [
				"error",
				"interface",
			],
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{
					prefer: "type-imports",
					fixStyle: "inline-type-imports",
					// vitest mocks use `importOriginal<typeof import("…")>()`
					disallowTypeAnnotations: false,
				},
			],
		},
	},

	// schemas are the source of truth: derive types from them, never
	// annotate them as `z.ZodType<…>` (only recursive schemas may, with a
	// disable comment saying why)
	{
		files: ["src/features/api/schemas/**", "src/**/*.schemas.ts"],
		rules: {
			"no-restricted-syntax": [
				"error",
				{
					selector:
						"TSTypeReference[typeName.name='ZodType'], TSTypeReference[typeName.right.name='ZodType']",
					message:
						"Don't annotate schemas as z.ZodType<…>; derive the type with z.infer.",
				},
			],
		},
	},

	// tests: loose typing on mock data is fine, dead assertions are not
	{
		files: ["src/tests/**"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{ "ts-expect-error": false },
			],
		},
	},

	// planning engine: plain TypeScript, no Vue, stores or data layer
	{
		files: ["src/features/planning/engine/**"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					paths: ["vue", "pinia"].map((name) => ({
						name,
						message: "The planning engine must not import Vue.",
					})),
					patterns: [
						{
							group: ["@vue/*", "vue-*"],
							message: "The planning engine must not import Vue.",
						},
						{
							group: [
								"@/stores/*",
								"!@/stores/*.types",
								"@/database/*",
							],
							message:
								"The planning engine gets its data through IPlanContext.",
						},
					],
				},
			],
		},
	},

	// vue
	...vue.configs["flat/recommended"],
	{
		files: ["*.vue", "**/*.vue"],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
			},
		},
	},
	{
		rules: {
			"vue/no-unused-vars": ["error", { ignorePattern: "^_" }],
			"vue/max-attributes-per-line": ["error", { singleline: 5 }],
			"vue/html-indent": "off",
			"vue/singleline-html-element-content-newline": "off",
			"vue/html-closing-bracket-newline": "off",
			"vue/html-self-closing": "off",
			"vue/no-unused-components": [
				"error",
				{
					ignoreWhenBindingPresent: true,
				},
			],
			"vue/no-unused-properties": [
				"warn",
				{
					groups: ["props", "setup"],
					deepData: false,
				},
			],
		},
	},
];
