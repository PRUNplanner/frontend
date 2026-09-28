/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "class", // or 'media' or 'class'
	content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
	plugins: [
		function ({ addVariant, e }) {
			addVariant("child", "& > *");
			addVariant("child-hover", "& > *:hover");
			addVariant("not-first", ({ modifySelectors, separator }) => {
				modifySelectors(({ className }) => {
					return `.${e(
						`not-first${separator}${className}`
					)}:not(:first-child)`;
				});
			});
		},
		function ({ addBase }) {
			addBase({});
		},
	],
	theme: {
		fontFamily: {
			sans: [
				"Roboto",
				"Helvetica Neue Light",
				"Helvetica Neue",
				"Helvetica",
				"Arial",
				"Lucida Grande",
				"sans-serif",
			],
			mono: ["Roboto Mono", "monospace"],
		},

		extend: {
			colors: {
				background: "#212529",
				"gray-dark": "#151515",
				"link-primary": "#6ea8fe",
				"pp-primary": "#1e1e1e", // Primary content color
				"pp-secondary": "#212d40", // Secondary content color7
				"pp-border": "#2d2d30",
				"pp-card-header": "#d66853",
				row: "#1e1e1e",
				"row-alternate": "#222222",
				"dark-gray": "#404040",
				"table-border": "#495057",
				prunplanner: "#c0e219",
			},
			spacing: {
				em: "1em",
			},
		},
	},
};
