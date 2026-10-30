<script setup lang="ts">
	// the table before its rows: the real header row and skeleton rows at
	// the real row height, so nothing moves when the rows arrive
	const {
		titles,
		rows = 12,
		header = true,
	} = defineProps<{
		/** the visible columns' titles */
		titles: string[];
		rows?: number;
		/** off below rows already shown */
		header?: boolean;
	}>();

	const pulse = "bg-white/5 motion-safe:animate-pulse";
</script>

<template>
	<div aria-busy="true" data-skeleton class="overflow-hidden">
		<span class="sr-only">{{ $t("wrapper.loading") }}</span>
		<table class="w-full text-sm">
			<thead v-if="header">
				<tr class="border-b border-white/10">
					<th
						v-for="title in titles"
						:key="title"
						class="px-2 py-2 text-left font-bold whitespace-nowrap">
						{{ title }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="i in rows"
					:key="i"
					class="h-[51px] border-b border-white/5">
					<td v-for="title in titles" :key="title" class="px-2">
						<div :class="pulse" class="h-3.5 rounded" />
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>
