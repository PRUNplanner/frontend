<script setup lang="ts">
	import { computed, nextTick, onMounted, ref, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: t("api_keys.view_title"),
	});

	// Composables
	import { useAPIKeys } from "@/features/api_keys/useAPIKeys";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import config from "@/lib/config";
	import { copyToClipboard } from "@/util/data";
	import { formatDate, relativeFromDate } from "@/util/date";

	// Components
	import APIMCPCard from "@/features/api_keys/components/APIMCPCard.vue";
	import APIURLBuilder from "@/features/api_keys/components/APIURLBuilder.vue";
	import HelpPanel from "@/features/help/components/HelpPanel.vue";

	// Types & Interfaces
	import type {
		APIKey,
		APIKeyScope,
	} from "@/features/api/schemas/apiKeysData.schemas";

	// UI
	import {
		PButton,
		PForm,
		PFormItem,
		PFormSeparator,
		PInput,
		PModal,
		PNotice,
		PSegmented,
		PTable,
		PTooltip,
		useConfirm,
		useToast,
	} from "@/ui";
	import {
		CheckSharp,
		ContentCopySharp,
		RestartAltSharp,
	} from "@vicons/material";

	const {
		loaded,
		apiKeyData,
		lastCreatedKey,
		lastCreatedScope,
		inDeletionId,
		fetchAPIKeys,
		createAPIKey,
		resetCreation,
		deleteAPIKey,
	} = useAPIKeys();

	const confirm = useConfirm();
	const toast = useToast();

	const docsUrl = `${config.API_BASE_URL}/docs`;

	// the key created on this visit, for the URL builder; memory only
	const builderKey = ref<string | null>(null);
	const builderRef = ref<HTMLElement | null>(null);

	const showCreateModal = ref<boolean>(false);
	const creationStep = ref<"start" | "key" | "error">("start");
	const creationAPIKeyName = ref<string>("");
	// new keys are read-only unless the user picks otherwise
	const creationScope = ref<APIKeyScope>("read");
	const scopeOptions = computed(() =>
		(["read", "read_write"] as const).map((value) => ({
			value,
			label: t(`api_keys.scope.${value}`),
		}))
	);
	const creationLoading = ref<boolean>(false);

	const creationHasName = computed(
		() =>
			creationAPIKeyName.value &&
			creationAPIKeyName.value.trim().length > 0
	);

	async function createKey(): Promise<void> {
		if (!creationHasName.value || creationLoading.value) return;
		creationLoading.value = true;

		const creationStatus: boolean = await createAPIKey(
			creationAPIKeyName.value,
			creationScope.value
		).finally(() => {});

		if (creationStatus) {
			creationStep.value = "key";
		} else {
			creationStep.value = "error";
		}

		creationAPIKeyName.value = "";

		creationLoading.value = false;
	}

	function closeCreation(): void {
		showCreateModal.value = false;
	}

	// however the last dialog closed (button, X, Esc, mask), a new one starts
	// at the name; reset on open, so the closing dialog doesn't flash the form
	watch(showCreateModal, (open) => {
		if (!open) return;
		creationStep.value = "start";
		creationScope.value = "read";
		resetCreation();
	});

	async function copyKey(): Promise<void> {
		if (!lastCreatedKey.value) return;
		if (!(await copyToClipboard(lastCreatedKey.value))) return;
		toast(t("api_keys.create.copied"));
		trackEvent("apikey:key_copy");
	}

	async function useInBuilder(): Promise<void> {
		builderKey.value = lastCreatedKey.value;
		trackEvent("apikey:use_in_builder");
		closeCreation();
		await nextTick();
		builderRef.value?.scrollIntoView({ behavior: "smooth" });
	}

	async function revokeKey(apiKey: APIKey): Promise<void> {
		const confirmed = await confirm({
			title: t("api_keys.confirm_revoke.title", { name: apiKey.name }),
			content: t("api_keys.confirm_revoke.content"),
			positiveText: t("api_keys.confirm_revoke.positive"),
			negativeText: t("api_keys.confirm_revoke.negative"),
		});
		if (confirmed) await deleteAPIKey(apiKey.id);
	}

	onMounted(async () => {
		fetchAPIKeys();
	});
</script>

<template>
	<!-- 446 px, the dialog's width -->
	<PModal
		v-model:show="showCreateModal"
		:width="446"
		:title="t('api_keys.create.title')">
		<div v-if="creationStep === 'start'">
			<PForm as-form @submit="createKey">
				<PFormItem :label="t('api_keys.create.form.key_name')">
					<PInput v-model:value="creationAPIKeyName" class="w-full" />
				</PFormItem>
				<PFormItem :label="t('api_keys.create.form.access')">
					<PSegmented
						v-model:value="creationScope"
						:options="scopeOptions"
						:label="t('api_keys.create.form.access')"
						data-testid="scope-choice" />
					<!-- #info wraps; the control row is nowrap and clips -->
					<template #info>
						<span data-testid="scope-hint">
							{{ $t(`api_keys.scope.hint.${creationScope}`) }}
						</span>
					</template>
				</PFormItem>
				<PFormSeparator>
					<span class="py-1 text-muted text-xs">
						{{ $t("api_keys.create.form.key_description") }}
					</span>
				</PFormSeparator>
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
				<span
					class="ph-no-capture font-mono text-prunplanner break-all"
					data-testid="created-key">
					{{ lastCreatedKey }}
				</span>
				<span
					v-if="lastCreatedScope"
					class="text-xs text-white/80"
					data-testid="created-scope">
					{{ $t("api_keys.create.form.access") }}:
					{{ $t(`api_keys.scope.${lastCreatedScope}`) }}
				</span>
				<PButton type="secondary" @click="copyKey">
					<template #icon><ContentCopySharp /></template>
					{{ $t("api_keys.create.buttons.copy") }}
				</PButton>
			</div>
			<PNotice type="warning">
				{{ $t("api_keys.create.form.success_note") }}
			</PNotice>
		</div>
		<div v-else-if="creationStep === 'error'">
			<PNotice type="error">
				{{ $t("api_keys.create.form.error") }}
			</PNotice>
		</div>
		<template #action>
			<div
				v-if="creationStep === 'start'"
				class="flex flex-row justify-end gap-3 items-end">
				<PButton type="secondary" @click="showCreateModal = false">
					{{ $t("api_keys.create.buttons.cancel") }}
				</PButton>
				<PButton
					:loading="creationLoading"
					:disabled="!creationHasName"
					@click="createKey">
					{{ $t("api_keys.create.buttons.create") }}
				</PButton>
			</div>
			<div
				v-else-if="creationStep === 'key'"
				class="w-full flex flex-col sm:flex-row gap-3">
				<PButton
					type="secondary"
					class="w-full sm:w-auto sm:grow"
					@click="useInBuilder">
					{{ $t("api_keys.create.buttons.use_in_builder") }}
				</PButton>
				<PButton
					class="w-full sm:w-auto sm:grow"
					@click="closeCreation">
					{{ $t("api_keys.create.buttons.saved") }}
				</PButton>
			</div>
		</template>
	</PModal>

	<div class="min-h-screen flex flex-col">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row flex-wrap gap-x-6 gap-y-2 justify-between">
			<h1 class="text-2xl font-bold">{{ $t("api_keys.title") }}</h1>
			<HelpPanel article="api_keys" />
		</div>
		<div class="min-w-0 max-w-5xl flex flex-col gap-3 px-6 py-3">
			<i18n-t keypath="api_keys.info.description.p1" tag="p">
				<template #link>
					<a
						:href="docsUrl"
						target="_blank"
						class="font-bold underline hover:text-prunplanner"
						>{{ $t("api_keys.info.description.link") }}</a
					>
				</template>
			</i18n-t>
			<div
				class="bg-prunplanner/10 border-l-4 border-prunplanner p-3 text-xs"
				data-testid="key-warning">
				<i18n-t keypath="api_keys.info.description.warning" tag="p">
					<template #link>
						<RouterLink
							to="/help/api_keys#validity"
							class="font-bold underline hover:text-prunplanner"
							>{{
								$t("api_keys.info.description.warning_link")
							}}</RouterLink
						>
					</template>
				</i18n-t>
			</div>

			<section data-testid="manage-keys">
				<div
					class="flex flex-row flex-wrap gap-3 justify-between items-center pt-3 pb-3">
					<h2 class="text-lg font-bold">
						{{ $t("api_keys.manage.title") }}
					</h2>
					<div class="flex flex-row gap-3">
						<PButton @click="showCreateModal = !showCreateModal">
							{{ $t("api_keys.manage.buttons.new_apikey") }}
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
				<template v-if="apiKeyData?.length">
					<div class="hidden md:block">
						<PTable class="w-full" striped>
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
												"api_keys.manage.table.apikey_access"
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
									<td data-testid="key-access">
										{{
											$t(`api_keys.scope.${apiKey.scope}`)
										}}
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
										<PTooltip v-else>
											<template #trigger>
												<span class="text-muted">
													{{
														$t(
															"api_keys.manage.never"
														)
													}}
												</span>
											</template>
											{{
												$t(
													"api_keys.manage.last_used_hint"
												)
											}}
										</PTooltip>
									</td>
									<td class="flex justify-end">
										<PButton
											type="error"
											:loading="
												apiKey.id === inDeletionId
											"
											@click="revokeKey(apiKey)">
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
					</div>
					<ul class="md:hidden flex flex-col gap-3">
						<li
							v-for="apiKey in apiKeyData"
							:key="apiKey.id"
							class="border border-white/10 rounded p-3 flex flex-col gap-2">
							<div
								class="flex flex-row justify-between items-center gap-3">
								<span class="font-bold break-all">
									{{ apiKey.name }}
								</span>
								<PButton
									type="error"
									:loading="apiKey.id === inDeletionId"
									@click="revokeKey(apiKey)">
									{{
										$t(
											"api_keys.manage.buttons.revoke_apikey"
										)
									}}
								</PButton>
							</div>
							<dl
								class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
								<dt class="text-muted">
									{{
										$t(
											"api_keys.manage.table.apikey_prefix"
										)
									}}
								</dt>
								<dd class="font-mono">
									{{ apiKey.prefix }}
								</dd>
								<dt class="text-muted">
									{{
										$t(
											"api_keys.manage.table.apikey_access"
										)
									}}
								</dt>
								<dd>
									{{ $t(`api_keys.scope.${apiKey.scope}`) }}
								</dd>
								<dt class="text-muted">
									{{
										$t(
											"api_keys.manage.table.apikey_created"
										)
									}}
								</dt>
								<dd class="font-mono">
									{{ formatDate(apiKey.created) }}
								</dd>
								<dt class="text-muted">
									{{
										$t(
											"api_keys.manage.table.apikey_lastused"
										)
									}}
								</dt>
								<dd>
									<span v-if="apiKey.last_used">
										{{ relativeFromDate(apiKey.last_used) }}
									</span>
									<PTooltip v-else>
										<template #trigger>
											<span class="text-muted">
												{{
													$t("api_keys.manage.never")
												}}
											</span>
										</template>
										{{
											$t("api_keys.manage.last_used_hint")
										}}
									</PTooltip>
								</dd>
							</dl>
						</li>
					</ul>
				</template>
				<div
					v-else-if="!loaded"
					class="text-center font-mono text-white/80">
					{{ $t("api_keys.manage.loading") }}
				</div>
				<div v-else class="text-center font-mono text-white/80">
					{{ $t("api_keys.manage.empty") }}
				</div>
			</section>

			<APIMCPCard />

			<section class="flex flex-col gap-1 pt-3">
				<h2 class="text-lg font-bold">
					{{ $t("api_keys.get_started.title") }}
				</h2>
				<ol class="list-decimal pl-6 flex flex-col gap-1">
					<li>{{ $t("api_keys.get_started.step_create") }}</li>
					<li>{{ $t("api_keys.get_started.step_pick") }}</li>
					<li>{{ $t("api_keys.get_started.step_paste") }}</li>
				</ol>
			</section>

			<section
				id="api-builder"
				ref="builderRef"
				class="flex flex-col gap-3 pt-3 scroll-mt-3">
				<h2 class="text-lg font-bold">
					{{ $t("api_keys.builder.title") }}
				</h2>
				<APIURLBuilder :api-key="builderKey" />
			</section>
		</div>
	</div>
</template>
