<script setup lang="ts">
	import { computed, ref, useTemplateRef } from "vue";
	import { useI18n } from "vue-i18n";
	import { useRouter } from "vue-router";

	// Composables
	import { useCXImportExport } from "@/features/exchanges/useCXImportExport";

	// Components
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";

	// Types & Interfaces
	import type { CXData } from "@/features/api/schemas/cxData.schemas";

	// UI
	import {
		PButton,
		PDropdown,
		PForm,
		PFormItem,
		PInput,
		PModal,
		useConfirm,
		useToast,
	} from "@/ui";
	import {
		ArrowDownwardFilled,
		ArrowUpwardFilled,
		MoreHorizSharp,
	} from "@vicons/material";

	/*
	 * The Exchanges header: the preference name, CSV import (with a
	 * confirm) and export, a menu to rename it or manage preferences, Help
	 */
	const { name, cxData } = defineProps<{
		// the edited name, empty without a preference
		name: string;
		// the rules as edited, exported as they are
		cxData: CXData | undefined;
	}>();

	const emit = defineEmits<{
		(e: "rename", name: string): void;
		(e: "import", data: CXData): void;
	}>();

	const { t } = useI18n();
	const router = useRouter();
	const confirm = useConfirm();
	const toast = useToast();
	const { parseSettingsCSV, generateSettingsCSV } = useCXImportExport();

	// Rename
	const showRename = ref(false);
	const newName = ref("");
	function openRename(): void {
		newName.value = name;
		showRename.value = true;
	}
	function applyRename(): void {
		if (!newName.value.trim()) return;
		emit("rename", newName.value.trim());
		showRename.value = false;
	}

	const menuOptions = computed(() => [
		{ key: "rename", label: t("exchanges.header.rename") },
		{ key: "manage", label: t("exchanges.header.manage") },
	]);
	function onMenu(key: string): void {
		if (key === "rename") openRename();
		else router.push("/manage");
	}

	// CSV, the schema of useCXImportExport
	function exportCSV(): void {
		if (!cxData) return;
		const csvContent = generateSettingsCSV(
			cxData.cx_empire,
			cxData.ticker_empire,
			cxData.cx_planets.map((p) => ({
				planet: p.planet,
				exchanges: p.preferences,
				ticker: [],
			})),
			cxData.ticker_planets.map((p) => ({
				planet: p.planet,
				exchanges: [],
				ticker: p.preferences,
			}))
		);

		const blob = new Blob([csvContent], {
			type: "text/csv;charset=utf-8;",
		});

		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", "PRUNPlannerExchangePreferences.csv");

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		URL.revokeObjectURL(url);
	}

	const fileInput = useTemplateRef<HTMLInputElement>("file");

	async function importCSV(event: Event): Promise<void> {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		target.value = "";
		if (!file) return;

		let parsed: Awaited<ReturnType<typeof parseSettingsCSV>>;
		try {
			parsed = await parseSettingsCSV(file);
		} catch (err) {
			toast(
				t("exchanges.csv.error", {
					file: file.name,
					reason: err instanceof Error ? err.message : String(err),
				}),
				{ type: "error" }
			);
			return;
		}

		const data: CXData = {
			cx_empire: parsed.empireCX,
			ticker_empire: parsed.empireTickerOptions,
			cx_planets: parsed.planetsCX.map((p) => ({
				planet: p.planet,
				preferences: p.exchanges,
			})),
			ticker_planets: parsed.plantesTickerOptions.map((p) => ({
				planet: p.planet,
				preferences: p.ticker,
			})),
		};
		const exchanges =
			data.cx_empire.length +
			data.cx_planets.reduce((n, p) => n + p.preferences.length, 0);
		const fixed =
			data.ticker_empire.length +
			data.ticker_planets.reduce((n, p) => n + p.preferences.length, 0);

		const replace = await confirm({
			title: t("exchanges.csv.confirm_title"),
			content: t("exchanges.csv.confirm", {
				preference: name,
				exchanges: t("exchanges.csv.exchange_rules", exchanges),
				fixed: t("exchanges.csv.fixed_prices", fixed),
				file: file.name,
			}),
			positiveText: t("exchanges.csv.replace"),
			negativeText: t("common.buttons.cancel"),
		});
		if (replace) emit("import", data);
	}
</script>

<template>
	<div
		class="px-6 py-3 border-b border-white/10 flex flex-row flex-wrap justify-between gap-3">
		<h1 class="text-2xl font-bold my-auto min-w-0 break-words">
			{{ name || $t("exchanges.title") }}
		</h1>
		<div class="flex flex-row flex-wrap gap-3">
			<input
				ref="file"
				type="file"
				accept=".csv"
				class="hidden"
				:aria-label="$t('exchanges.header.import')"
				@change="importCSV" />
			<PButton
				type="secondary"
				:disabled="!cxData"
				@click="fileInput?.click()">
				<template #icon><ArrowDownwardFilled /></template>
				{{ $t("exchanges.header.import") }}
			</PButton>
			<PButton type="secondary" :disabled="!cxData" @click="exportCSV">
				<template #icon><ArrowUpwardFilled /></template>
				{{ $t("exchanges.header.export") }}
			</PButton>
			<PDropdown
				v-if="cxData"
				placement="bottom-end"
				:options="menuOptions"
				@select="onMenu">
				<PButton
					type="ghost"
					aria-haspopup="menu"
					:aria-label="$t('exchanges.header.more')">
					<template #icon><MoreHorizSharp /></template>
				</PButton>
			</PDropdown>
			<HelpDrawer file-name="exchanges" />
		</div>

		<PModal
			v-model:show="showRename"
			:title="$t('exchanges.header.rename_title')"
			:width="400">
			<PForm as-form @submit="applyRename">
				<PFormItem :label="$t('exchanges.header.name')">
					<PInput
						v-model:value="newName"
						:status="newName.trim() ? undefined : 'warning'" />
				</PFormItem>
			</PForm>
			<template #action>
				<div class="flex justify-end gap-3">
					<PButton type="secondary" @click="showRename = false">
						{{ $t("common.buttons.cancel") }}
					</PButton>
					<PButton :disabled="!newName.trim()" @click="applyRename">
						{{ $t("exchanges.header.apply") }}
					</PButton>
				</div>
			</template>
		</PModal>
	</div>
</template>
