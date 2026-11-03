/**
 * Rows as CSV: cells joined by the delimiter, lines by "\n". A cell that
 * holds the delimiter, a quote or a newline is quoted, quotes doubled.
 * @author jplacht
 *
 * @export
 * @param {(string | number)[][]} rows Rows, the header first
 * @param {string} [delimiter=","] Cell delimiter
 * @returns {string} CSV
 */
export function toCsv(
	rows: (string | number)[][],
	delimiter: string = ","
): string {
	const cell = (v: string | number): string => {
		const s = String(v);
		return s.includes(delimiter) || /["\n]/.test(s)
			? `"${s.replace(/"/g, '""')}"`
			: s;
	};
	return rows.map((r) => r.map(cell).join(delimiter)).join("\n");
}

/**
 * Downloads a text as a file
 * @author jplacht
 *
 * @export
 * @param {string} name File name
 * @param {string} text File content
 * @param {string} type MIME type
 */
export function downloadFile(name: string, text: string, type: string): void {
	const url = URL.createObjectURL(new Blob([text], { type }));
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
