import { computed, type ComputedRef, ref, type Ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Composables
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Util
import {
	IO_SOURCES,
	type IOSource,
	materialIOCsv,
	materialIOTotals,
} from "@/features/planning/planView.util";
import { downloadFile } from "@/util/download";

// Types & Interfaces
import type { IPlanResult } from "@/features/planning/usePlanCalculation.types";

/**
 * Plan's Material I/O pane: which flow, which rows and which value per
 * day, and its CSV download
 * @author jplacht
 *
 * @param {ComputedRef<IPlanResult>} result Plan result
 * @param {() => string} fileName CSV file name, without its suffix
 */
export function usePlanIO(
	result: ComputedRef<IPlanResult>,
	fileName: () => string
) {
	const { t } = useI18n();

	const refIOSource: Ref<IOSource> = ref("all");
	const refIOFilter: Ref<"all" | "exports" | "imports"> = ref("all");
	const refIOValue: Ref<"price" | "weight" | "volume" | "share"> =
		ref("price");
	// only the user changes these three
	watch([refIOSource, refIOFilter, refIOValue], ([source, filter, value]) =>
		trackEvent("plan:io_view", { source, filter, value })
	);

	const ioRows = computed(() =>
		refIOSource.value === "production"
			? result.value.productionMaterialIO
			: refIOSource.value === "workforce"
				? result.value.workforceMaterialIO
				: result.value.materialio
	);
	const ioTotals = computed(() => materialIOTotals(ioRows.value));

	const ioSourceOptions = computed(() =>
		IO_SOURCES.map((value) => ({
			value,
			label: t(`plan.io.source.${value}`),
		}))
	);
	const ioFilterOptions = computed(() => [
		{ value: "all" as const, label: t("plan.io.filter.all") },
		{ value: "exports" as const, label: t("plan.io.filter.exports") },
		{ value: "imports" as const, label: t("plan.io.filter.imports") },
	]);
	const ioValueOptions = [
		{ value: "price" as const, label: "ȼ" },
		{ value: "weight" as const, label: "t" },
		{ value: "volume" as const, label: "m³" },
		{ value: "share" as const, label: "%" },
	];

	function downloadMaterialIO(): void {
		downloadFile(
			`${fileName()}-material-io.csv`,
			materialIOCsv(ioRows.value),
			"text/csv"
		);
	}

	return {
		refIOSource,
		refIOFilter,
		refIOValue,
		ioRows,
		ioTotals,
		ioSourceOptions,
		ioFilterOptions,
		ioValueOptions,
		downloadMaterialIO,
	};
}
