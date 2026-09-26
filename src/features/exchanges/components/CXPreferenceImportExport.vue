<script setup lang="ts">
	// UI
	import { PButton } from "@/ui";
	import { ArrowDownwardFilled, ArrowUpwardFilled } from "@vicons/material";

	import {
		ICXDataExchangeOption,
		ICXDataTickerOption,
	} from "@/stores/planningStore.types";
	import { PropType, ref } from "vue";
	import { ICXPlanetMap } from "../manageCX.types";

	import { useCXImportExport } from "../useCXImportExport";

	const { parseSettingsCSV, generateSettingsCSV } = useCXImportExport();

	const props = defineProps({
		cxEmpire: {
			type: Array as PropType<ICXDataExchangeOption[]>,
			required: true,
		},
		cxPlanets: {
			type: Array as PropType<ICXPlanetMap[string][]>,
			required: true,
		},
		empireTickerOptions: {
			type: Array as PropType<ICXDataTickerOption[]>,
			required: true,
		},
		planetTickerOptions: {
			type: Array as PropType<ICXPlanetMap[string][]>,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "update:cxEmpire", value: ICXDataExchangeOption[]): void;
		(e: "update:cxPlanets", value: ICXPlanetMap[string][]): void;
		(e: "update:empireTickerOptions", value: ICXDataTickerOption[]): void;
		(e: "update:planetTickerOptions", value: ICXPlanetMap[string][]): void;
	}>();

	const fileInput = ref<HTMLInputElement | null>(null);

	const triggerFileSelect = () => fileInput.value?.click();

	const handleFileChange = async (event: Event) => {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		try {
			const data = await parseSettingsCSV(file);

			emit("update:cxEmpire", data.empireCX);
			emit("update:empireTickerOptions", data.empireTickerOptions);
			emit("update:cxPlanets", data.planetsCX);
			emit("update:planetTickerOptions", data.plantesTickerOptions);
		} catch (e) {
			console.error(e);
		}
		target.value = "";
	};

	function exportSettings() {
		let csvContent = generateSettingsCSV(
			props.cxEmpire,
			props.empireTickerOptions,
			props.cxPlanets,
			props.planetTickerOptions
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
</script>

<template>
	<div class="flex flex-row justify-between items-center">
		<h2 class="text-xl font-bold my-auto">
			{{ $t("exchanges.components.csv_import_export.title") }}
		</h2>
		<div class="flex flex-row gap-x-3">
			<input
				ref="fileInput"
				type="file"
				accept=".csv"
				style="display: none"
				@change="handleFileChange" />
			<PButton @click="triggerFileSelect">
				<template #icon>
					<ArrowDownwardFilled />
				</template>
				{{
					$t("exchanges.components.csv_import_export.buttons.import")
				}}
			</PButton>
			<PButton @click="exportSettings">
				<template #icon>
					<ArrowUpwardFilled />
				</template>
				{{
					$t("exchanges.components.csv_import_export.buttons.export")
				}}
			</PButton>
		</div>
	</div>
	<div class="py-3">
		{{ $t("exchanges.components.csv_import_export.warning") }}
	</div>
</template>
