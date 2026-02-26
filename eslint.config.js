import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import ts from "typescript-eslint";
import globals from "globals";

export default [
	{
		ignores: [
			"**/dist/*",
			"**/tests/*",
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
