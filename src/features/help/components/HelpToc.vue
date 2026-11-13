<script setup lang="ts">
	/**
	 * "On this page": the article's sections, the one in view marked.
	 *
	 * @author jplacht
	 */
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import type { IHelpTocEntry } from "@/features/help/help.types";

	const { toc, active = undefined } = defineProps<{
		toc: IHelpTocEntry[];
		active?: string;
	}>();
</script>

<template>
	<nav :aria-label="t('help.article.on_this_page')">
		<h2
			class="text-xs font-medium uppercase tracking-wider text-muted mb-2">
			{{ t("help.article.on_this_page") }}
		</h2>
		<ul class="flex flex-col border-l border-line">
			<li v-for="e in toc.filter((x) => x.level <= 3)" :key="e.id">
				<RouterLink
					:to="{ hash: `#${e.id}` }"
					class="block -ml-px border-l py-1 text-sm hover:text-ink-strong"
					:class="[
						e.level === 3 ? 'pl-6' : 'pl-3',
						e.id === active
							? 'border-prunplanner text-prunplanner'
							: 'border-transparent text-muted-strong',
					]"
					:aria-current="e.id === active ? 'location' : undefined">
					{{ e.title }}
				</RouterLink>
			</li>
		</ul>
	</nav>
</template>
