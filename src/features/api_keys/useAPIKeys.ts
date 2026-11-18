import { ref } from "vue";

import { useQuery } from "@/lib/query_cache/useQuery";
import type {
	APIKey,
	APIKeyScope,
} from "@/features/api/schemas/apiKeysData.schemas";

export function useAPIKeys() {
	const loaded = ref<boolean>(false);
	const apiKeyData = ref<APIKey[] | null>(null);
	const inDeletionId = ref<string | null>(null);

	const lastCreatedKey = ref<string | null>(null);
	const lastCreatedScope = ref<APIKeyScope | null>(null);

	async function fetchAPIKeys(): Promise<void> {
		await useQuery("GetAPIKeys")
			.execute()
			.then((data) => {
				apiKeyData.value = data;
				loaded.value = true;
			});
	}

	async function createAPIKey(
		newAPIKey: string,
		scope: APIKeyScope
	): Promise<boolean> {
		try {
			await useQuery("PostCreateAPIKey", { name: newAPIKey, scope })
				.execute()
				.then(async (data) => {
					lastCreatedKey.value = data.api_key;
					lastCreatedScope.value = data.scope;

					await fetchAPIKeys();
				});

			return true;
		} catch {
			return false;
		}
	}

	async function deleteAPIKey(id: string): Promise<void> {
		inDeletionId.value = id;

		await useQuery("DeleteAPIKey", { id })
			.execute()
			.then(async () => {
				await fetchAPIKeys();
			})
			.finally(() => (inDeletionId.value = null));
	}

	function resetCreation(): void {
		lastCreatedKey.value = null;
		lastCreatedScope.value = null;
	}

	return {
		loaded,
		apiKeyData,
		lastCreatedKey,
		lastCreatedScope,
		inDeletionId,
		fetchAPIKeys,
		createAPIKey,
		resetCreation,
		deleteAPIKey,
	};
}
