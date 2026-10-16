<script setup lang="ts">
	import { computed, onBeforeUnmount, reactive, watch } from "vue";
	import { debounce } from "lodash-es";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import {
		API_KEY_PLACEHOLDER,
		useAPIBuilder,
	} from "@/features/api_keys/useAPIBuilder";
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { API_ENDPOINTS, API_EXCHANGES } from "@/features/api_keys/apiEndpoints";
	import { copyToClipboard } from "@/util/data";

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";

	// Types & Interfaces
	import type { APISnippetKind } from "@/features/api_keys/apiEndpoints.types";
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import {
		PButton,
		PButtonGroup,
		PForm,
		PFormItem,
		PInput,
		PNotice,
		PSelect,
		useToast,
	} from "@/ui";
	import { ContentCopySharp } from "@vicons/material";

	/**
	 * The API Keys page's URL builder: pick an endpoint, its format and
	 * values, copy a URL, Google Sheets formula, curl or Python snippet
	 */
	const { apiKey } = defineProps<{
		// the key created on this visit, else the snippets show a placeholder
		apiKey: string | null;
	}>();

	const toast = useToast();
	const { materialSelectOptions } = useMaterialData();

	const { endpointId, endpoint, formats, format, values, snippets } =
		useAPIBuilder(() => apiKey);

	const endpointOptions = computed<PSelectOption[]>(() =>
		(["new", "planning", "public"] as const).map((group) => ({
			label: t(`api_keys.builder.groups.${group}`),
			value: group,
			children: API_ENDPOINTS.filter((e) => e.group === group).map(
				(e) => ({ label: t(e.labelKey), value: e.id })
			),
		}))
	);

	const exchangeOptions: PSelectOption[] = API_EXCHANGES.map((e) => ({
		label: e,
		value: e,
	}));

	// the user's empires, plans and CX preferences, loaded when an
	// endpoint needs them; null until loaded
	type ListParam = "empire" | "plan" | "cx";
	const lists = reactive<Record<ListParam, PSelectOption[] | null>>({
		empire: null,
		plan: null,
		cx: null,
	});

	async function fetchList(param: ListParam): Promise<PSelectOption[]> {
		if (param === "empire")
			return (await useQuery("GetAllEmpires").execute()).map((e) => ({
				label: e.empire_name,
				value: e.uuid,
			}));
		if (param === "plan")
			return (await useQuery("GetAllPlans").execute()).map((p) => ({
				label: `${p.plan_name} (${p.planet_natural_id})`,
				value: p.uuid,
			}));
		return (await useQuery("GetAllCX").execute()).map((c) => ({
			label: c.cx_name,
			value: c.uuid,
		}));
	}

	async function loadList(param: ListParam): Promise<void> {
		if (lists[param] !== null) return;
		// on an error the select stays empty, the query layer reports it
		lists[param] = await fetchList(param).catch(() => null);
		const first = lists[param]?.[0]?.value;
		if (!values[param] && typeof first === "string") values[param] = first;
	}

	watch(
		() => endpoint.value.params,
		(params) =>
			params.forEach((p) => {
				if (p === "empire" || p === "plan" || p === "cx") loadList(p);
			}),
		{ immediate: true }
	);

	const needs = (param: string): boolean =>
		endpoint.value.params.some((p) => p === param);

	// an empty list builds no URL: the note links to Manage instead
	const emptyList = computed<ListParam | undefined>(() =>
		(["empire", "plan", "cx"] as const).find(
			(p) => needs(p) && lists[p]?.length === 0
		)
	);

	const outputs = computed<{ kind: APISnippetKind; text: string }[]>(() => {
		const s = snippets.value;
		if (!s || emptyList.value) return [];
		return (["sheets", "url", "curl", "python"] as const).flatMap(
			(kind) => (s[kind] === null ? [] : [{ kind, text: s[kind] }])
		);
	});

	function copy(kind: APISnippetKind, text: string): void {
		copyToClipboard(text);
		toast(t("api_keys.builder.copied"));
		trackEvent("apikey:snippet_copy", {
			endpoint: endpoint.value.id,
			format: format.value,
			kind,
			has_key: apiKey !== null,
		});
	}

	// one event per settled choice, not per click
	const trackChange = debounce(
		() =>
			trackEvent("apikey:builder_change", {
				endpoint: endpointId.value,
				format: format.value,
			}),
		1000
	);
	watch([endpointId, format], trackChange);
	onBeforeUnmount(() => trackChange.flush());
</script>

<template>
	<div class="flex flex-col gap-3">
		<!-- below sm each label sits above its input -->
		<PForm class="max-sm:grid-cols-1">
			<PFormItem :label="t('api_keys.builder.endpoint')">
				<PSelect
					v-model:value="endpointId"
					:options="endpointOptions"
					searchable
					class="w-full" />
			</PFormItem>
			<PFormItem
				v-if="formats.length > 1"
				:label="t('api_keys.builder.format')">
				<PButtonGroup>
					<PButton
						v-for="f in formats"
						:key="f"
						:pressed="format === f"
						@click="format = f">
						{{ f.toUpperCase() }}
					</PButton>
				</PButtonGroup>
			</PFormItem>
			<template v-for="list in ['empire', 'plan', 'cx'] as const" :key="list">
				<PFormItem
					v-if="needs(list) && lists[list]?.length"
					:label="t(`api_keys.builder.params.${list}`)">
					<PSelect
						v-model:value="values[list]"
						:options="lists[list] ?? []"
						searchable
						class="w-full" />
				</PFormItem>
			</template>
			<PFormItem
				v-if="needs('planet')"
				:label="t('api_keys.builder.params.planet')">
				<PInput
					v-model:value="values.planet"
					:placeholder="t('api_keys.builder.planet_placeholder')"
					class="w-full" />
			</PFormItem>
			<PFormItem
				v-if="needs('ticker')"
				:label="t('api_keys.builder.params.ticker')">
				<WrapperGameDataLoader minimal load-materials>
					<PSelect
						v-model:value="values.ticker"
						:options="materialSelectOptions"
						searchable
						class="w-full" />
				</WrapperGameDataLoader>
			</PFormItem>
			<PFormItem
				v-if="needs('exchange')"
				:label="t('api_keys.builder.params.exchange')">
				<PSelect
					v-model:value="values.exchange"
					:options="exchangeOptions"
					class="w-full" />
			</PFormItem>
		</PForm>

		<p class="text-sm text-muted">{{ t(endpoint.descriptionKey) }}</p>

		<PNotice v-if="emptyList" type="info">
			{{ t(`api_keys.builder.empty.${emptyList}`) }}
			<RouterLink to="/manage" class="text-link">
				{{ t("api_keys.builder.empty_link") }}
			</RouterLink>
		</PNotice>
		<template v-else-if="outputs.length">
			<PNotice v-if="endpoint.freshnessKey" type="info">
				{{ t(endpoint.freshnessKey) }}
			</PNotice>
			<PNotice v-if="endpoint.needsKey && apiKey" type="warning">
				{{ t("api_keys.builder.key_warning") }}
			</PNotice>
			<p
				v-else-if="endpoint.needsKey"
				class="text-xs text-muted">
				{{
					t("api_keys.builder.placeholder_note", {
						placeholder: API_KEY_PLACEHOLDER,
					})
				}}
			</p>
		</template>
		<p v-else-if="!emptyList" class="text-sm text-muted">
			{{ t("api_keys.builder.incomplete") }}
		</p>

		<div
			v-for="output in outputs"
			:key="output.kind"
			class="flex flex-col gap-1"
			:data-snippet="output.kind">
			<div class="flex flex-row items-center justify-between gap-3">
				<span class="text-xs uppercase font-bold text-muted">
					{{ t(`api_keys.builder.outputs.${output.kind}`) }}
				</span>
				<PButton
					size="sm"
					type="secondary"
					:aria-label="
						t('api_keys.builder.copy', {
							what: t(`api_keys.builder.outputs.${output.kind}`),
						})
					"
					@click="copy(output.kind, output.text)">
					<template #icon><ContentCopySharp /></template>
				</PButton>
			</div>
			<pre
				class="ph-no-capture font-mono text-xs text-white/80 bg-gray-dark p-2 rounded border border-white/10 whitespace-pre-wrap break-all"
				>{{ output.text }}</pre
			>
		</div>
	</div>
</template>
