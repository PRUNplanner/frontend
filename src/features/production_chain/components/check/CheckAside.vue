<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type {
		CheckVerdict,
		ICheckResult,
	} from "@/features/production_chain/engine/chainCheck.types";

	// UI
	import { PButton } from "@/ui";

	const { result } = defineProps<{ result: ICheckResult }>();

	const emit = defineEmits<{
		(e: "add", tickers: string[]): void;
	}>();

	const ICON: Record<CheckVerdict, { icon: string; tone: string }> = {
		ok: { icon: "✓", tone: "text-positive" },
		imp: { icon: "●", tone: "text-warning" },
		fix: { icon: "●", tone: "text-negative" },
		out: { icon: "○", tone: "text-muted" },
	};
	const LEGEND: CheckVerdict[] = ["ok", "imp", "fix", "out"];

	const outside = computed(() =>
		result.bases.filter((b) => !b.checked).map((b) => b.id)
	);
</script>

<template>
	<aside class="flex flex-col gap-3 min-w-0">
		<section
			class="rounded-panel border border-line p-3 flex flex-col gap-2"
			data-testid="check-coverage">
			<div class="flex items-baseline justify-between gap-2">
				<h2 class="font-bold">
					{{ $t("production_chains.check.aside.coverage") }}
				</h2>
				<span class="text-xs text-muted">
					{{
						$t("production_chains.check.aside.coverage_count", {
							n: result.totals.checked,
							total: result.bases.length,
						})
					}}
				</span>
			</div>
			<ul class="flex flex-col gap-1">
				<li
					v-for="b in result.bases"
					:key="b.id"
					class="flex items-center gap-2 text-sm">
					<span
						class="px-1 rounded-control border border-line font-mono font-bold text-xs">
						{{ b.id }}
					</span>
					<span class="flex-1 min-w-0 truncate">{{
						b.plan.name
					}}</span>
					<span
						:class="ICON[b.verdict].tone"
						:title="
							t(
								`production_chains.check.aside.legend_${b.verdict}`
							)
						">
						<span aria-hidden="true">{{
							ICON[b.verdict].icon
						}}</span>
						<span class="sr-only">{{
							t(
								`production_chains.check.aside.legend_${b.verdict}`
							)
						}}</span>
					</span>
				</li>
			</ul>
			<p v-if="outside.length" class="text-xs text-muted">
				{{
					$t(
						"production_chains.check.aside.outside",
						{ list: outside.join(", ") },
						outside.length
					)
				}}
			</p>
			<PButton
				v-if="result.unchecked.length"
				size="sm"
				type="secondary"
				data-testid="check-coverage-add"
				@click="emit('add', result.unchecked)">
				{{
					$t("production_chains.check.aside.add", {
						list: result.unchecked.join(", "),
					})
				}}
			</PButton>
			<p class="flex flex-wrap gap-x-3 text-xs text-muted">
				<span v-for="v in LEGEND" :key="v">
					<span :class="ICON[v].tone" aria-hidden="true">{{
						ICON[v].icon
					}}</span>
					{{ $t(`production_chains.check.aside.legend_${v}`) }}
				</span>
			</p>
		</section>
		<section
			class="rounded-panel border border-line p-3 flex flex-col gap-2">
			<h2 class="font-bold">
				{{ $t("production_chains.check.aside.compared") }}
			</h2>
			<ul class="list-disc pl-5 text-sm text-muted flex flex-col gap-1">
				<li>{{ $t("production_chains.check.aside.as_planned") }}</li>
				<li>{{ $t("production_chains.check.aside.chain_default") }}</li>
				<li>{{ $t("production_chains.check.aside.prices") }}</li>
				<li>{{ $t("production_chains.check.aside.gains") }}</li>
			</ul>
		</section>
	</aside>
</template>
