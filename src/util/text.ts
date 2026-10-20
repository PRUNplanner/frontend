/**
 * Capitalizes all words in a string
 * @author jplacht
 *
 * @export
 * @param {string} text Some test
 * @returns {string} Capitalized words
 */
export function capitalizeString(text: string): string {
	let transformedText: string =
		text[0].toUpperCase() + text.slice(1).toLocaleLowerCase();

	transformedText = transformedText.replaceAll("_", " ");

	const words: string[] = transformedText.split(" ");
	if (words.length > 0) {
		for (let i = 0; i < words.length; i++) {
			words[i] = words[i][0].toUpperCase() + words[i].substring(1);
		}

		transformedText = words.join(" ");
	}

	return transformedText;
}

/**
 * CSS class of a material category's tile colours (materials.css)
 *
 * @param {string} category Category name, e.g. "consumables (basic)"
 * @returns {string} e.g. "material-category-consumables-basic"
 */
export function materialCategoryClass(category: string): string {
	return `material-category-${category
		.replaceAll(" ", "-")
		.replaceAll("(", "")
		.replaceAll(")", "")}`;
}

/**
 * A material name as people read it: FIO's camelCase split into
 * capitalised words ("workstationBlank" → "Workstation Blank"). Names that
 * already have spaces stay as they are; other letters keep their case.
 *
 * @param {string} name Material name
 * @param {string} ticker Shown when the name is empty
 * @returns {string} Readable name
 */
export function formatMaterialName(name: string, ticker: string): string {
	if (!name) return ticker;
	if (name.includes(" ")) return name;
	return name
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
