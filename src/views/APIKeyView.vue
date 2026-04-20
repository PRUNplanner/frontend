<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";

	import { useHead } from "@unhead/vue";

	useHead({
		title: "API Keys | PRUNplanner",
	});

	// Composables
	import { useAPIKeys } from "@/features/api_keys/useAPIKeys";

	// Util
	import { formatDate, relativeFromDate } from "@/util/date";

	// UI
	import PButton from "@/ui/components/PButton.vue";
	import PTable from "@/ui/components/PTable.vue";
	import PForm from "@/ui/components/PForm.vue";
	import PFormItem from "@/ui/components/PFormItem.vue";
	import PFormSeperator from "@/ui/components/PFormSeperator.vue";
	import PInput from "@/ui/components/PInput.vue";
	import { NModal } from "naive-ui";
	import { CheckSharp, RestartAltSharp } from "@vicons/material";

	const {
		loaded,
		apiKeyData,
		lastCreatedKey,
		inDeletionId,
		fetchAPIKeys,
		createAPIKey,
		resetCreation,
		deleteAPIKey,
	} = useAPIKeys();

	const showCreateModal = ref<boolean>(false);
	const creationStep = ref<"start" | "key" | "error">("start");
	const creationAPIKeyName = ref<string>("");
	const creationLoading = ref<boolean>(false);

	const creationHasName = computed(
		() =>
			creationAPIKeyName.value &&
			creationAPIKeyName.value.trim().length > 0
	);

	async function createKey(): Promise<void> {
		creationLoading.value = true;

		const creationStatus: boolean = await createAPIKey(
			creationAPIKeyName.value
		).finally(() => {});

		if (creationStatus) {
			creationStep.value = "key";
		} else {
			creationStep.value = "error";
		}

		creationAPIKeyName.value = "";

		creationLoading.value = false;
	}

	onMounted(async () => {
		fetchAPIKeys();
	});
</script>

<template>
	<n-modal
		v-model:show="showCreateModal"
		preset="dialog"
		title="Create API Key"
		:show-icon="false">
		<template #header>Create API Key</template>
		<div v-if="creationStep === 'start'">
			<PForm>
				<PFormItem label="Key Name">
					<PInput v-model:value="creationAPIKeyName" class="w-full" />
				</PFormItem>
				<PFormSeperator>
					<span class="py-1 text-white/50 text-xs">
						Give your key a descriptive name to help you identify it
						later.
					</span>
				</PFormSeperator>
			</PForm>
		</div>
		<div
			v-else-if="creationStep === 'key'"
			class="flex flex-col gap-3 text-center">
			<div
				class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-prunplanner">
				<CheckSharp class="w-6 h-6" />
			</div>
			<h3 class="text-center text-lg font-bold">
				Key Generated Successfully
			</h3>
			<div
				class="flex flex-col gap-2 items-center bg-white/5 border border-dark-gray border-dashed rounded p-3">
				<span
					class="uppercase font-bold text-xs text-center text-white/80">
					Your Secret Key (Save this Now!)
				</span>
				<span class="font-mono text-prunplanner text-nowrap">
					{{ lastCreatedKey }}
				</span>
			</div>
			<div class="text-red-500">
				For security, we cannot show this key again. If you lose it, you
				must revoke and create a new one.
			</div>
		</div>
		<div v-else-if="creationStep === 'error'">
			<div class="text-center text-red-500">
				Error creating your API Key. Please try again later.
			</div>
		</div>
		<template #action>
			<div
				v-if="creationStep === 'start'"
				class="flex flex-row gap-3 items-end">
				<PButton
					@click="
						{
							showCreateModal = false;
						}
					">
					Cancel
				</PButton>
				<PButton
					:loading="creationLoading"
					:disabled="!creationHasName"
					@click="createKey">
					Create Key
				</PButton>
			</div>
			<div v-else-if="creationStep === 'key'" class="w-full">
				<PButton
					class="w-full"
					@click="
						() => {
							showCreateModal = false;
							creationStep = 'start';
							resetCreation();
						}
					">
					I've saved my key
				</PButton>
			</div>
		</template>
	</n-modal>

	<div class="min-h-screen flex flex-col">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row justify-between">
			<h1 class="text-2xl font-bold">API Keys</h1>
		</div>
		<div>
			<div
				class="grid grid-cols-1 lg:grid-cols-3 divide-x divide-white/10 min-h-screen">
				<div class="xl:col-span-2 flex flex-col gap-3 px-6 py-3">
					<div class="text-white/80">
						The
						<a
							href="https://api.prunplanner.org/docs"
							target="_blank"
							class="font-bold underline hover:text-prunplanner"
							>PRUNplanner REST API</a
						>
						provides programmatic access to all your planning data,
						ingame metadata (buildings, recipes, materials) and
						calculated market metrics like VWAP. While public
						endpoints remain open for community use, access to
						<strong>private planning data</strong> - including your
						plan configurations - require secure authentication.
					</div>
					<div>
						By utilizing these endpoints, you can synchronize your
						planning operations with external spreadsheets, custom
						dashboards, or even optimization algorithms.
					</div>
					<div
						class="bg-prunplanner/10 border-l-4 border-prunplanner p-3">
						<p class="text-white font-mono text-xs">
							API keys grant full access to your account data and
							remain valid indefinitely. Treat these credentials
							as sensitive as your password. Never commit keys to
							public repositories or share them with unverified
							third-party services. If a key is compromised,
							revoke it immediately and generate a replacement.
						</p>
					</div>

					<div>
						<div
							class="flex flex-row justify-between items-center pt-6 pb-3">
							<h2 class="text-lg font-bold">
								PRUNplanner API Keys
							</h2>
							<div class="flex flex-row gap-3">
								<PButton
									@click="
										() => {
											showCreateModal = !showCreateModal;
										}
									">
									Create New Key
								</PButton>
								<PButton @click="fetchAPIKeys">
									<template #icon>
										<RestartAltSharp />
									</template>
								</PButton>
							</div>
						</div>
						<div>
							<PTable
								v-if="apiKeyData !== null"
								class="w-full"
								striped>
								<thead>
									<tr>
										<th>Name</th>
										<th>Key Prefix</th>
										<th>Created</th>
										<th>Last Used</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									<tr
										v-for="apiKey in apiKeyData"
										:key="apiKey.id">
										<td class="font-bold">
											{{ apiKey.name }}
										</td>
										<td class="font-mono">
											{{ apiKey.prefix }}
										</td>
										<td class="font-mono">
											{{ formatDate(apiKey.created) }}
										</td>
										<td>
											<span v-if="apiKey.last_used">
												{{
													relativeFromDate(
														apiKey.last_used
													)
												}}
											</span>
											<span v-else>&mdash;</span>
										</td>
										<td class="flex justify-end">
											<PButton
												type="error"
												:loading="
													apiKey.id === inDeletionId
												"
												@click="
													deleteAPIKey(apiKey.id)
												">
												Revoke
											</PButton>
										</td>
									</tr>
								</tbody>
							</PTable>
							<div
								v-else-if="!loaded"
								class="text-center font-mono text-white/80">
								Loading API Keys.
							</div>
							<div
								v-else
								class="text-center font-mono text-white/80">
								No API Keys yet. Create your first API Key.
							</div>
						</div>
					</div>
				</div>
				<div class="px-6 py-3">
					<div
						class="bg-white/5 border border-dark-gray border-dashed rounded flex flex-col gap-3 p-3">
						<h3 class="uppercase font-bold">
							Authorization Implementation
						</h3>
						<div class="space-y-4">
							<div>
								<span
									class="text-xs text-prunplanner block mb-1">
									HTTP Header
								</span>
								<code
									class="text-xs text-white/80 bg-gray-dark p-2 rounded block border border-white/10">
									Authorization: Api-Key &lt;KEY&gt;
								</code>
							</div>

							<div>
								<span
									class="text-xs text-prunplanner block mb-1">
									URL Parameter
								</span>
								<code
									class="text-xs text-white/80 bg-gray-dark p-2 rounded block border border-white/10">
									?api_key=&lt;KEY&gt;
								</code>
							</div>

							<a
								href="https://api.prunplanner.org/docs"
								target="_blank"
								class="font-mono text-xs font-bold text-white hover:text-prunplanner underline mt-2">
								View REST API Reference &rarr;
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
