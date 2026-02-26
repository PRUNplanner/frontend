import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

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

export default function axiosSetup() {
	// Interceptors

	// Request Authorization Header
	axios.interceptors.request.use(
		async (config) => setAxiosHeader(config),
		(error) => {
			Promise.reject(error);
		}
	);

	// Response Token Expiry interceptor
	axios.interceptors.response.use(
		(response) => response,
		async (error) => {
			const userStore = useUserStore();
			const originalRequest: AxiosRequestConfig = error.config;

			if (error.response && error.response.status === 401) {
				if (
					originalRequest.url &&
					originalRequest.url.includes("/user/refresh/")
				) {
					userStore.logout();
					router.push("/");
					return Promise.reject(error);
				}

				const tokenRefreshStatus: boolean =
					await userStore.performTokenRefresh();

				if (tokenRefreshStatus) {
					return axios(originalRequest);
				} else {
					userStore.logout();
					router.push("/");
					return Promise.reject(error);
				}
			}

			return Promise.reject(error);
		}
	);
}
