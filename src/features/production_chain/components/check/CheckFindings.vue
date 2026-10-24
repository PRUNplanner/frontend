<script setup lang="ts">
	import { computed, ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import CheckFinding from "@/features/production_chain/components/check/CheckFinding.vue";

	// Util
	import { signedMoney } from "@/features/production_chain/chainCheck.util";

	// Types & Interfaces
	import type {
		CheckKind,
		ICheckBase,
		ICheckFinding,
		ICheckResult,
	} from "@/features/production_chain/engine/chainCheck.types";

	// UI
	import { PButton } from "@/ui";

	const { result, nameOf, payback } = defineProps<{
		result: ICheckResult;
		nameOf: (id: string) => string;
		payback: number;
	}>();

	const emit = defineEmits<{
		(e: "try", f: ICheckFinding): void;
		(e: "planets", f: ICheckFinding): void;
		(e: "reset", f: ICheckFinding): void;
		(e: "open-plan"): void;
	}>();

	const KINDS: CheckKind[] = ["fix", "recipe", "buy", "location", "setup"];
	const kind = ref<CheckKind | "all">("all");

	const baseOf = (f: ICheckFinding): ICheckBase =>
		result.bases.find((b) => b.id === f.base)!;

	const groups = computed(() =>
		KINDS.filter((k) => kind.value === "all" || kind.value === k)
			.map((k) => {
				const list = result.findings.filter((f) => f.kind === k);
				return {
					kind: k,
					list,
					sum: list.reduce((s, f) => s + f.delta, 0),
				};
			})
			.filter((g) => g.list.length)
	);
</script>

<template>
	<div class="flex flex-col gap-4 p-3" data-testid="check-findings">
		<div
			class="flex flex-wrap gap-2"
			role="group"
			:aria-label="t('production_chains.check.tabs.findings')">
			<PButton
				size="sm"
				:pressed="kind === 'all'"
				data-testid="check-findings-kind-all"
				@click="kind = 'all'">
				{{ $t("production_chains.check.kind.all") }}
				{{ result.findings.length }}
			</PButton>
			<template v-for="k in KINDS" :key="k">
				<PButton
					v-if="result.totals.counts[k]"
					size="sm"
					:pressed="kind === k"
					:data-testid="`check-findings-kind-${k}`"
					@click="kind = k">
					{{ $t(`production_chains.check.kind.${k}`) }}
					{{ result.totals.counts[k] }}
				</PButton>
			</template>
		</div>

		<section
			v-for="g in groups"
			:key="g.kind"
			class="flex flex-col gap-2"
			:data-testid="`check-findings-group-${g.kind}`">
			<h3 class="text-xs uppercase text-muted">
				{{ $t(`production_chains.check.kind.${g.kind}`) }}
				<span
					class="pl-1 tabular-nums"
					:class="g.sum >= 0 ? 'text-positive' : 'text-negative'">
					{{
						$t("production_chains.check.finding.per_day", {
							value: signedMoney(t, g.sum),
						})
					}}
				</span>
			</h3>
			<CheckFinding
				v-for="f in g.list"
				:key="f.id"
				:finding="f"
				:base="baseOf(f)"
				:name-of="nameOf"
				:payback="payback"
				@try="emit('try', f)"
				@planets="emit('planets', f)"
				@reset="emit('reset', f)"
				@open-plan="emit('open-plan')" />
		</section>
		<p v-if="!groups.length" class="text-sm text-muted">
			{{ $t("production_chains.check.bases.no_findings") }}
		</p>
		<p class="text-xs text-muted">
			{{ $t("production_chains.check.aside.gains") }}
		</p>
	</div>
</template>
