<script setup lang="ts">
	import type { PropType } from "vue";

	// Types & Interfaces
	import type {
		IAssignmentEmpire,
		IAssignmentRow,
	} from "@/features/manage/useAssignmentMatrix.types";

	// UI
	import { PIcon, PSpin } from "@/ui";
	import { RemoveRedEyeSharp } from "@vicons/material";

	// props are primitives or stable objects: a toggle re-renders one row only
	defineProps({
		row: {
			type: Object as PropType<IAssignmentRow>,
			required: true,
		},
		empires: {
			type: Array as PropType<IAssignmentEmpire[]>,
			required: true,
		},
		/** one AssignmentCell char per empire */
		cells: {
			type: String,
			required: true,
		},
		viewCount: {
			type: Number,
			required: false,
			default: undefined,
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
	<tr class="h-13 bg-black even:bg-gray-dark border-b border-white/5">
		<td class="sticky left-0 z-1 bg-inherit px-4 py-1.75">
			<div class="flex flex-col gap-0.5 min-w-0">
				<div class="flex items-center gap-2 min-w-0">
					<router-link
						:to="`/plan/${row.planetId}/${row.planUuid}`"
						:title="row.planName"
						class="text-link-primary font-bold hover:underline truncate">
						{{ row.planName }}
					</router-link>
					<span
						v-if="viewCount !== undefined"
						class="shrink-0 flex items-center gap-1 px-1.75 rounded-full bg-positive/15 text-positive text-xs"
						:title="$t('sharing.buttons.views', { count: viewCount })">
						<PIcon :size="12"><RemoveRedEyeSharp /></PIcon>
						{{ viewCount }}
					</span>
				</div>
				<div
					class="text-xs text-white/55 truncate"
					:title="
						row.planetName
							? `${row.planetName} · ${row.planetId}`
							: row.planetId
					">
					<template v-if="row.planetName">
						{{ row.planetName }} ·
					</template>
					<span class="font-mono">{{ row.planetId }}</span>
				</div>
			</div>
		</td>
		<td class="px-2 text-center">
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
		</td>
		<td
			v-for="(e, i) in empires"
			:key="e.empireUuid"
			class="p-0 border-l border-white/5">
			<label
				class="relative flex h-13 items-center justify-center cursor-pointer"
				:class="{
					'bg-unsaved-stripes': cells[i] === '+' || cells[i] === '-',
				}"
				:title="
					cells[i] === '+'
						? $t('management.assignments.will_add', {
								empire: e.empireName,
							})
						: cells[i] === '-'
							? $t('management.assignments.will_remove', {
									empire: e.empireName,
								})
							: undefined
				">
				<span
					v-if="cells[i] === '+' || cells[i] === '-'"
					class="absolute size-6.5 rounded bg-black" />
				<input
					type="checkbox"
					class="relative size-4.5 accent-blue-700 cursor-pointer"
					:checked="cells[i] === '1' || cells[i] === '+'"
					:aria-label="
						$t('management.assignments.table.assign_label', {
							plan: row.planName,
							empire: e.empireName,
						})
					"
					@change="$emit('toggle', row.planUuid, e.empireUuid)" />
			</label>
		</td>
	</tr>
</template>
