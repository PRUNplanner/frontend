<script setup lang="ts">
	import type { PropType } from "vue";

	// Types & Interfaces
	import type {
		IAssignmentEmpire,
		IAssignmentRow,
	} from "@/features/manage/useAssignmentMatrix.types";

	// UI
	import { PSpin } from "@/ui";

	// narrow screens: same props and events as ManageAssignmentRow
	defineProps({
		row: {
			type: Object as PropType<IAssignmentRow>,
			required: true,
		},
		empires: {
			type: Array as PropType<IAssignmentEmpire[]>,
			required: true,
		},
		cells: {
			type: String,
			required: true,
		},
		busy: {
			type: Boolean,
			required: false,
			default: false,
		},
	});

	defineEmits<{
		(e: "toggle", planUuid: string, empireUuid: string): void;
		(e: "menu", planUuid: string, target: HTMLElement): void;
	}>();
</script>

<template>
	<div
		class="border border-white/10 rounded bg-gray-dark p-3 [content-visibility:auto] [contain-intrinsic-size:auto_140px]">
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<router-link
					:to="`/plan/${row.planetId}/${row.planUuid}`"
					class="block text-link-primary font-bold hover:underline truncate">
					{{ row.planName }}
				</router-link>
				<div class="text-xs text-white/55 truncate">
					<template v-if="row.planetName">
						{{ row.planetName }} ·
					</template>
					<span class="font-mono">{{ row.planetId }}</span>
				</div>
			</div>
			<!-- native and static: cheap in every row -->
			<button
				type="button"
				class="inline-flex size-9 items-center justify-center rounded text-white/80 hover:bg-white/10 cursor-pointer"
				:aria-label="
					$t('management.assignments.row_actions', {
						plan: row.planName,
					})
				"
				:aria-busy="busy"
				@click="
					$emit(
						'menu',
						row.planUuid,
						$event.currentTarget as HTMLElement
					)
				">
				<PSpin v-if="busy" color="white" />
				<svg
					v-else
					viewBox="0 0 24 24"
					class="size-5"
					fill="currentColor"
					aria-hidden="true">
					<circle cx="6" cy="12" r="2" />
					<circle cx="12" cy="12" r="2" />
					<circle cx="18" cy="12" r="2" />
				</svg>
			</button>
		</div>
		<div class="flex flex-wrap gap-2 pt-3">
			<button
				v-for="(e, i) in empires"
				:key="e.empireUuid"
				type="button"
				class="h-9.5 px-3.5 rounded-full border cursor-pointer"
				:class="[
					cells[i] === '1' || cells[i] === '+'
						? 'bg-blue-800 border-blue-800 text-white'
						: 'border-white/20 text-white/80',
					{
						'bg-unsaved-stripes': cells[i] === '+' || cells[i] === '-',
						'line-through': cells[i] === '-',
					},
				]"
				:aria-pressed="cells[i] === '1' || cells[i] === '+'"
				:aria-label="
					$t('management.assignments.table.assign_label', {
						plan: row.planName,
						empire: e.empireName,
					})
				"
				@click="$emit('toggle', row.planUuid, e.empireUuid)">
				{{ e.empireName }}
			</button>
		</div>
	</div>
</template>
