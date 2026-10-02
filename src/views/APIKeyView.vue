<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: `${t("api_keys.view_title")} | PRUNplanner`,
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
		:title="t('api_keys.create.title')"
		:show-icon="false">
		<template #header>{{ $t("api_keys.create.title") }}</template>
		<div v-if="creationStep === 'start'">
			<PForm>
				<PFormItem :label="t('api_keys.create.form.key_name')">
					<PInput v-model:value="creationAPIKeyName" class="w-full" />
				</PFormItem>
				<PFormSeperator>
					<span class="py-1 text-muted text-xs">
						{{ $t("api_keys.create.form.key_description") }}
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
				{{ $t("api_keys.create.form.success_title") }}
			</h3>
			<div
				class="flex flex-col gap-2 items-center bg-white/5 border border-dark-gray border-dashed rounded p-3">
				<span
					class="uppercase font-bold text-xs text-center text-white/80">
					{{ $t("api_keys.create.form.success_key") }}
				</span>
				<span class="ph-no-capture font-mono text-prunplanner text-nowrap">
					{{ lastCreatedKey }}
				</span>
			</div>
			<div class="text-red-500">
				{{ $t("api_keys.create.form.success_note") }}
			</div>
		</div>
		<div v-else-if="creationStep === 'error'">
			<div class="text-center text-red-500">
				{{ $t("api_keys.create.form.error") }}
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
					{{ $t("api_keys.create.buttons.cancel") }}
				</PButton>
				<PButton
					:loading="creationLoading"
					:disabled="!creationHasName"
					@click="createKey">
					{{ $t("api_keys.create.buttons.create") }}
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
					{{ $t("api_keys.create.buttons.saved") }}
				</PButton>
			</div>
		</template>
	</n-modal>

	<div class="min-h-screen flex flex-col">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row justify-between">
			<h1 class="text-2xl font-bold">{{ $t("api_keys.title") }}</h1>
		</div>
		<div>
			<div
				class="grid grid-cols-1 lg:grid-cols-3 divide-x divide-white/10 min-h-screen">
				<div class="xl:col-span-2 flex flex-col gap-3 px-6 py-3">
					<i18n-t keypath="api_keys.info.description.p1" tag="div">
						<template #link>
							<a
								href="https://api.prunplanner.org/docs"
								target="_blank"
								class="font-bold underline hover:text-prunplanner"
								>{{ $t("api_keys.info.description.link") }}</a
							>
						</template>
					</i18n-t>
					<div>
						{{ $t("api_keys.info.description.p2") }}
					</div>
					<div
						class="bg-prunplanner/10 border-l-4 border-prunplanner p-3">
						<p class="text-white font-mono text-xs">
							{{ $t("api_keys.info.description.warning") }}
						</p>
					</div>

					<div>
						<div
							class="flex flex-row justify-between items-center pt-6 pb-3">
							<h2 class="text-lg font-bold">
								{{ $t("api_keys.manage.title") }}
							</h2>
							<div class="flex flex-row gap-3">
								<PButton
									@click="
										() => {
											showCreateModal = !showCreateModal;
										}
									">
									{{
										$t("api_keys.manage.buttons.new_apikey")
									}}
								</PButton>
								<PButton
									:aria-label="$t('common.buttons.reload')"
									@click="fetchAPIKeys">
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
										<th>
											{{
												$t(
													"api_keys.manage.table.apikey_name"
												)
											}}
										</th>
										<th>
											{{
												$t(
													"api_keys.manage.table.apikey_prefix"
												)
											}}
										</th>
										<th>
											{{
												$t(
													"api_keys.manage.table.apikey_created"
												)
											}}
										</th>
										<th>
											{{
												$t(
													"api_keys.manage.table.apikey_lastused"
												)
											}}
										</th>
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
												{{
													$t(
														"api_keys.manage.buttons.revoke_apikey"
													)
												}}
											</PButton>
										</td>
									</tr>
								</tbody>
							</PTable>
							<div
								v-else-if="!loaded"
								class="text-center font-mono text-white/80">
								{{ $t("api_keys.manage.loading") }}
							</div>
							<div
								v-else
								class="text-center font-mono text-white/80">
								{{ $t("api_keys.manage.empty") }}
							</div>
						</div>
					</div>
				</div>
				<div class="px-6 py-3">
					<div
						class="bg-white/5 border border-dark-gray border-dashed rounded flex flex-col gap-3 p-3">
						<h3 class="uppercase font-bold">
							{{ $t("api_keys.implementation.title") }}
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
								{{ $t("api_keys.implementation.link") }}
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
