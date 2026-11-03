/**
 * An unsigned JWT with a `user_id` claim, enough for `tokenUserId`
 *
 * @param {number} userId User id
 * @returns {string} Token
 */
export function jwt(userId: number): string {
	const payload = btoa(JSON.stringify({ user_id: userId }))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	return `header.${payload}.signature`;
}
