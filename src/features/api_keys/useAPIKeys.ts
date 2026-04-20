import { ref } from "vue";

import { useQuery } from "@/lib/query_cache/useQuery";
import { APIKeyListType } from "@/features/api/schemas/apiKeysData.schema";

export function useAPIKeys() {
	const loaded = ref<boolean>(false);
	const apiKeyData = ref<APIKeyListType | null>(null);
	const inDeletionId = ref<string | null>(null);

	const lastCreatedKey = ref<string | null>(null);

	async function fetchAPIKeys(): Promise<void> {
		await useQuery("GetAPIKeys")
			.execute()
			.then((data) => {
				apiKeyData.value = data;
				loaded.value = true;
			});
	}

	async function createAPIKey(newAPIKey: string): Promise<boolean> {
		try {
			await useQuery("PostCreateAPIKey", { name: newAPIKey })
				.execute()
				.then(async (data) => {
					lastCreatedKey.value = data.api_key;

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
	}

	return {
		loaded,
		apiKeyData,
		lastCreatedKey,
		inDeletionId,
		fetchAPIKeys,
		createAPIKey,
		resetCreation,
		deleteAPIKey,
	};
}
