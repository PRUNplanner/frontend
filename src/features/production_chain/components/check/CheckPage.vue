<script setup lang="ts">
	import { computed, defineAsyncComponent, ref, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import ChainModeSwitch from "@/features/production_chain/components/ChainModeSwitch.vue";
	import CheckBar from "@/features/production_chain/components/check/CheckBar.vue";
	import CheckResults from "@/features/production_chain/components/check/CheckResults.vue";
	import CheckBases from "@/features/production_chain/components/check/CheckBases.vue";
	import CheckFindings from "@/features/production_chain/components/check/CheckFindings.vue";
	import CheckChains from "@/features/production_chain/components/check/CheckChains.vue";
	import CheckAside from "@/features/production_chain/components/check/CheckAside.vue";
	// opens on demand; it brings the jump map along
	const CheckPlanetList = defineAsyncComponent(
		() =>
			import("@/features/production_chain/components/check/CheckPlanetList.vue")
	);

	// Composables
	import { useChainCheck } from "@/features/production_chain/useChainCheck";

	// Engine
	import { SEARCH_CX } from "@/features/planet_search/planetSearch.engine";

	// Util
	import { copyToClipboard } from "@/util/data";

	// Types & Interfaces
	import type { PlanetSearchCX } from "@/features/planet_search/planetSearch.schemas";
	import type { ICheckFinding } from "@/features/production_chain/engine/chainCheck.types";

	// UI
	import { PButton, PButtonGroup, PTag, useToast } from "@/ui";

	const toast = useToast();
	const {
		state,
		cxUuid,
		empires,
		notYours,
		plans,
		loading,
		error,
		ctx,
		result,
		load,
		setEmpire,
		setTargets,
		addAll,
		setSetup,
		patch,
		setPick,
		tryFinding,
		checkLink,
		track,
	} = useChainCheck();

	type IView = "bases" | "findings" | "chains";
	const view: Ref<IView> = ref("bases");
	const VIEWS: IView[] = ["bases", "findings", "chains"];

	const setup = computed({
		get: () => state.value.setup,
		set: (v: boolean) => setSetup(v),
	});
	const min = computed({
		get: () => state.value.min,
		set: (v: number) => patch({ min: v }),
	});
	const payback = computed({
		get: () => state.value.payback,
		set: (v: number) => patch({ payback: v }),
	});

	const nameOf = (id: string) =>
		plans.value?.find((p) => p.id === id)?.name ?? id;

	const summary = computed(() => {
		// read only once there is a result
		const bases = result.value!.bases;
		const n = (v: string) => bases.filter((b) => b.verdict === v).length;
		return { ok: n("ok"), imp: n("imp"), fix: n("fix"), out: n("out") };
	});

	async function copyLink(): Promise<void> {
		if (!(await copyToClipboard(checkLink()))) return;
		toast(t("production_chains.check.link_copied"));
		track("link_copy");
	}

	// the planet list of one location finding, by id so a pick updates it
	const listId: Ref<string | null> = ref(null);
	const showList = ref(false);
	const listFinding = computed(() => {
		const f = result.value?.findings.find((x) => x.id === listId.value);
		return f?.kind === "location" ? f : null;
	});
	const listBase = computed(() =>
		result.value?.bases.find((b) => b.id === listFinding.value?.base)
	);
	const listCX = computed<PlanetSearchCX>(() => {
		const ticker = listFinding.value?.step.ticker;
		const cx = ticker
			? ctx.value.prices.getPriceSource(ticker, "BUY").exchange
			: null;
		return SEARCH_CX.includes(cx as PlanetSearchCX)
			? (cx as PlanetSearchCX)
			: "AI1";
	});
	// the planet list opens from a finding, so the index is loaded
	const index = computed(() => [...ctx.value.planets!.values()]);

	function openList(f: ICheckFinding): void {
		listId.value = f.id;
		showList.value = true;
	}
	function resetPick(f: ICheckFinding): void {
		if (f.step) setPick(f.step.key, undefined);
	}
</script>

<template>
	<!-- @container: the aside goes beside the panel only when the page leaves it room -->
	<div
		class="@container min-h-screen flex flex-col gap-6 px-3 sm:px-6 py-3 min-w-0">
		<header
			class="flex flex-wrap justify-between gap-3 border-b border-line pb-3">
			<div class="min-w-0">
				<h1 class="text-2xl font-bold">
					{{ $t("production_chains.title") }}
				</h1>
				<p class="text-muted">
					{{ $t("production_chains.check.description") }}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<ChainModeSwitch />
				<PButton
					type="secondary"
					:disabled="!state.empire"
					data-testid="check-copy-link"
					@click="copyLink">
					{{ $t("production_chains.check.copy_link") }}
				</PButton>
				<HelpDrawer file-name="tools_production_chain" />
			</div>
		</header>

		<CheckBar
			v-if="empires?.length"
			v-model:cx-uuid="cxUuid"
			v-model:setup="setup"
			v-model:min="min"
			v-model:payback="payback"
			:empires="empires"
			:empire="notYours ? undefined : state.empire"
			:targets="state.targets"
			:sold="result?.sold ?? null"
			:net="result?.net ?? {}"
			@empire="setEmpire"
			@targets="setTargets"
			@add-all="addAll" />

		<p v-if="error" class="text-negative" role="alert">
			{{ $t("production_chains.check.error") }}
			<button
				type="button"
				class="text-link hover:underline cursor-pointer"
				@click="load">
				{{ $t("production_chains.check.retry") }}
			</button>
		</p>
		<p v-else-if="loading" class="text-muted" role="status">
			{{ $t("production_chains.check.loading") }}
		</p>
		<p
			v-else-if="empires && !empires.length"
			class="text-muted"
			data-testid="check-no-empires">
			{{ $t("production_chains.check.no_empires") }}
		</p>
		<p
			v-else-if="notYours"
			class="text-warning"
			role="alert"
			data-testid="check-not-yours">
			{{ $t("production_chains.check.not_yours") }}
		</p>
		<p
			v-else-if="plans && !plans.length"
			class="text-muted"
			data-testid="check-no-plans">
			{{ $t("production_chains.check.no_plans") }}
		</p>
		<div
			v-else-if="result && !state.targets.length"
			class="flex-1 flex flex-col items-center justify-center text-center gap-3 py-24"
			data-testid="check-empty">
			<h2 class="text-xl font-bold">
				{{ $t("production_chains.check.empty.title") }}
			</h2>
			<p class="text-muted max-w-md">
				{{ $t("production_chains.check.empty.text") }}
			</p>
			<PButton
				:disabled="!result.sold.length"
				data-testid="check-empty-all"
				@click="addAll">
				{{ $t("production_chains.check.empty.all") }}
			</PButton>
		</div>

		<template v-else-if="result">
			<CheckResults :result="result" :setup="state.setup" />
			<div
				class="grid grid-cols-1 @min-[1400px]:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
				<section class="rounded-panel border border-line min-w-0">
					<div
						class="flex flex-wrap items-center gap-3 p-3 border-b border-line">
						<PButtonGroup
							:aria-label="
								t('production_chains.check.tabs.label')
							">
							<PButton
								v-for="v in VIEWS"
								:key="v"
								:pressed="view === v"
								:data-testid="`check-tab-${v}`"
								@click="view = v">
								{{ $t(`production_chains.check.tabs.${v}`) }}
							</PButton>
						</PButtonGroup>
						<span class="flex flex-wrap items-center gap-2 text-sm">
							<PTag v-if="summary.ok" size="sm" type="success">
								{{
									$t(
										"production_chains.check.summary.optimal",
										{ n: summary.ok }
									)
								}}
							</PTag>
							<PTag v-if="summary.imp" size="sm" type="warning">
								{{
									$t(
										"production_chains.check.summary.improvements",
										{ n: summary.imp }
									)
								}}
							</PTag>
							<PTag v-if="summary.fix" size="sm" type="error">
								{{
									$t(
										"production_chains.check.summary.fixes",
										summary.fix
									)
								}}
							</PTag>
							<span v-if="summary.out" class="text-muted">
								{{
									$t("production_chains.check.summary.out", {
										n: summary.out,
									})
								}}
							</span>
						</span>
					</div>
					<CheckBases
						v-if="view === 'bases'"
						:result="result"
						:name-of="nameOf"
						:payback="state.payback"
						@try="tryFinding"
						@planets="openList"
						@reset="resetPick"
						@open="track('check_open_base')"
						@open-plan="track('check_open_plan')" />
					<CheckFindings
						v-else-if="view === 'findings'"
						:result="result"
						:name-of="nameOf"
						:payback="state.payback"
						@try="tryFinding"
						@planets="openList"
						@reset="resetPick"
						@open-plan="track('check_open_plan')" />
					<CheckChains v-else :result="result" />
				</section>
				<CheckAside
					:result="result"
					@add="
						(tickers) => setTargets([...state.targets, ...tickers])
					" />
			</div>
		</template>

		<CheckPlanetList
			v-if="listFinding && listBase"
			:key="listFinding.id"
			v-model:show="showList"
			:finding="listFinding"
			:base="listBase"
			:name-of="nameOf"
			:payback="state.payback"
			:index="index"
			:now="ctx.now"
			:default-c-x="listCX"
			@use="(id) => setPick(listFinding!.step.key, id)" />
	</div>
</template>
