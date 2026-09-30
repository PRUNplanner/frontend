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
	const userStore = useUserStore();
	// several requests can fail on the same dead token, log out once
	if (userStore.isLoggedIn) userStore.logout();
	if (router.currentRoute.value.meta.requiresAuth) router.push("/");
}

/**
 * On a public page, repeats a request that its dead token failed, logged
 * out. Once: the retry carries no token, so its own 401 is not repeated.
 *
 * @param {InternalAxiosRequestConfig} config Request that got the 401
 * @returns {Promise<unknown> | undefined} The retry, if there is one
 */
function retryLoggedOut(
	config: InternalAxiosRequestConfig
): Promise<unknown> | undefined {
	if (
		useUserStore().isLoggedIn ||
		router.currentRoute.value.meta.requiresAuth ||
		!config.headers.Authorization
	)
		return undefined;

	delete config.headers.Authorization;
	return axios(config);
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
			const userStore = useUserStore();
			const originalRequest: InternalAxiosRequestConfig = error.config;
			const isUnauthorized: boolean = error.response?.status === 401;

			// never refresh or log out for a previous session. Its 401 can
			// only be asked again logged out: another request already
			// ended the session on the same dead token
			if (isPreviousSession(originalRequest))
				return (
					(isUnauthorized && retryLoggedOut(originalRequest)) ||
					discard(originalRequest)
				);

			if (isUnauthorized) {
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

				return retryLoggedOut(originalRequest) ?? Promise.reject(error);
			}

			return Promise.reject(error);
		}
	);
}
