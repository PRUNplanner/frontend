import axios, {
	type AxiosRequestConfig,
	CanceledError,
	type InternalAxiosRequestConfig,
} from "axios";

import router from "@/router";

// Stores
import { useUserStore } from "@/stores/userStore";

export const setAxiosHeader = (
	config: InternalAxiosRequestConfig<unknown>
): InternalAxiosRequestConfig<unknown> => {
	const userStore = useUserStore();
	const token = userStore.accessToken;

	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
		config.headers.withCredentials = true;
	}

	return config;
};

/*
	Session a request was sent in. The refresh token identifies it: it
	survives access token refreshes but changes on login and logout.
*/
const requestSession = new WeakMap<object, string | undefined>();

/**
 * True, if the request was sent logged in, in a session that has since
 * ended. Its response must be dropped, else it lands in the next user's
 * state. Requests sent logged out carry no user data and are kept.
 *
 * @param {AxiosRequestConfig | undefined} config Request config
 * @returns {boolean} From a previous session
 */
function isPreviousSession(config: AxiosRequestConfig | undefined): boolean {
	if (!config) return false;
	const session = requestSession.get(config);
	return session !== undefined && session !== useUserStore().refreshToken;
}

const discard = (config: InternalAxiosRequestConfig) =>
	Promise.reject(
		new CanceledError(
			"Response of a previous session discarded",
			undefined,
			config
		)
	);

/**
 * Ends a session that can't be refreshed. Only a page that needs a login
 * sends the user home, public pages (a shared plan) stay open.
 */
function endSession(): void {
	useUserStore().logout();
	if (router.currentRoute.value.meta.requiresAuth) router.push("/");
}

export default function axiosSetup() {
	// Interceptors

	// Request Authorization Header
	axios.interceptors.request.use(
		async (config) => {
			requestSession.set(config, useUserStore().refreshToken);
			return setAxiosHeader(config);
		},
		(error) => Promise.reject(error)
	);

	// Response Token Expiry interceptor
	axios.interceptors.response.use(
		(response) =>
			isPreviousSession(response.config)
				? discard(response.config)
				: response,
		async (error) => {
			// never refresh, retry or log out for a previous session
			if (isPreviousSession(error.config)) return discard(error.config);

			const userStore = useUserStore();
			const originalRequest: InternalAxiosRequestConfig = error.config;

			if (error.response && error.response.status === 401) {
				if (
					originalRequest.url &&
					originalRequest.url.includes("/user/refresh/")
				) {
					endSession();
					return Promise.reject(error);
				}

				const tokenRefreshStatus: boolean =
					await userStore.performTokenRefresh();

				if (tokenRefreshStatus) return axios(originalRequest);

				endSession();

				// a public page asks again without the dead token, once:
				// the retry carries no token, so its 401 ends here
				if (
					!router.currentRoute.value.meta.requiresAuth &&
					originalRequest.headers.Authorization
				) {
					delete originalRequest.headers.Authorization;
					return axios(originalRequest);
				}

				return Promise.reject(error);
			}

			return Promise.reject(error);
		}
	);
}
