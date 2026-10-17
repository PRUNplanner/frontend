<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Stores
	import { useUserStore } from "@/stores/userStore";
	import { useQueryStore } from "@/lib/query_cache/queryStore";
	import { toCacheKey } from "@/lib/query_cache/cacheKeys";
	import { usePlanningStore } from "@/stores/planningStore";

	// Util
	import { relativeFromDate } from "@/util/date";
	import { trackNav } from "@/layout/components/navigation/navigation.util";

	// Types & Interfaces
	import type { FIOStatus } from "@/features/api/schemas/user.schemas";
	import type { ColorKey } from "@/ui/ui.types";
	import type { NavArea } from "@/layout/components/navigation/navigation.types";

	// UI
	import { PIcon, PTable, PTooltip } from "@/ui";
	import { SensorsSharp } from "@vicons/material";

	/**
	 * FIO state as an icon with a coloured dot; the tooltip has the state,
	 * or the sync times when it is ok. Not ok links to the profile, where
	 * the state is explained.
	 *
	 * @author jplacht
	 */
	const { area, placement = "top" } = defineProps<{
		area: NavArea;
		placement?: "top" | "right";
	}>();

	const userStore = useUserStore();
	const queryStore = useQueryStore();
	const planningStore = usePlanningStore();

	// last successful fetch, also while a refresh keeps failing
	const storageTimestamp = computed(
		() =>
			queryStore.cacheState[toCacheKey(["gamedata", "fio", "storage"])]
				?.timestamp ?? 0
	);
	const storageAge = computed(() => planningStore.fio_storage_timestamp ?? 0);

	const FIO_TAGS: Record<
		Exclude<FIOStatus, "ok">,
		{ label: string; type: ColorKey }
	> = {
		none: { label: "fio_inactive", type: "warning" },
		error: { label: "fio_inactive", type: "warning" },
		syncing: { label: "fio_syncing", type: "secondary" },
		no_data: { label: "fio_no_data", type: "warning" },
		invalid_credentials: { label: "fio_rejected", type: "error" },
	};
	const tag = computed(() =>
		userStore.fioStatus === "ok"
			? { label: "fio_active", type: "success" as ColorKey }
			: FIO_TAGS[userStore.fioStatus]
	);
	const label = computed(() => t(`common.navigation.fio.${tag.value.label}`));

	const DOT: Record<ColorKey, string> = {
		success: "bg-positive",
		warning: "bg-warning",
		error: "bg-negative",
		secondary: "bg-white/40",
		primary: "bg-link-primary",
	};

	const iconClass =
		"relative flex items-center justify-center size-9 pointer-coarse:size-11 rounded-md text-muted-strong hover:bg-hover hover:text-ink";
</script>

<template>
	<PTooltip :placement="placement">
		<template #trigger>
			<span
				v-if="userStore.fioStatus === 'ok'"
				tabindex="0"
				:class="iconClass"
				:aria-label="label"
				:data-fio-state="tag.type"
				role="img">
				<PIcon :size="18"><SensorsSharp /></PIcon>
				<span
					class="absolute top-1.5 right-1.5 size-1.5 rounded-full"
					:class="DOT[tag.type]" />
			</span>
			<RouterLink
				v-else
				to="/profile"
				:class="iconClass"
				:aria-label="label"
				:data-fio-state="tag.type"
				@click="trackNav('profile', area, 'footer')">
				<PIcon :size="18"><SensorsSharp /></PIcon>
				<span
					class="absolute top-1.5 right-1.5 size-1.5 rounded-full"
					:class="DOT[tag.type]" />
			</RouterLink>
		</template>
		<div>{{ label }}</div>
		<PTable v-if="userStore.fioStatus === 'ok'" striped>
			<thead>
				<tr>
					<th>{{ t("common.navigation.fio.backend") }}</th>
					<th>{{ t("common.navigation.fio.fio") }}</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>
						{{ relativeFromDate(storageTimestamp || undefined) }}
					</td>
					<td>{{ relativeFromDate(storageAge || undefined) }}</td>
				</tr>
			</tbody>
		</PTable>
	</PTooltip>
</template>
