/**
 * One @ and a dot in the domain part, the rule of every email field
 *
 * @param {string} value Input
 * @returns {boolean} Looks like an email address
 */
export function isEmailAddress(value: string): boolean {
	return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

/**
 * Shows an address without giving it away: "j•••@gmail.com"
 *
 * @param {string} email Email address
 * @returns {string} Masked address
 */
export function maskEmail(email: string): string {
	const at = email.indexOf("@");
	return at > 0 ? `${email.charAt(0)}•••${email.slice(at)}` : email;
}
