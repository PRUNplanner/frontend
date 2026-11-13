<script setup lang="ts">
	/**
	 * The help centre's navigation: search, then every article by area,
	 * the plan page's articles grouped under it. A column on wide screens,
	 * a menu on phones (HelpLayout).
	 *
	 * @author jplacht
	 */
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { articlesByArea } from "@/features/help/helpArticles";
	import { markHelpSource } from "@/features/help/helpSource";

	const { current = undefined } = defineProps<{ current?: string }>();
	defineEmits<{ (e: "search"): void }>();

	const groups = articlesByArea().map(({ area, articles }) => ({
		area,
		top: articles.filter((a) => !a.parent),
		plan: articles.filter((a) => a.parent === "plan"),
	}));

	const linkClass = (id: string) =>
		[
			"flex items-center min-h-8 px-2.5 rounded-panel text-sm",
			id === current
				? "bg-prunplanner/10 text-prunplanner font-medium"
				: "text-ink hover:bg-hover",
		].join(" ");
</script>

<template>
	<nav :aria-label="t('help.article.menu')" class="flex flex-col gap-4">
		<RouterLink
			to="/help"
			class="px-2.5 text-lg font-bold text-ink-strong hover:underline"
			@click="markHelpSource('nav')">
			{{ t("help.article.root") }}
		</RouterLink>
		<button
			type="button"
			class="flex items-center gap-2 h-9 px-2.5 border border-line rounded-control text-sm text-muted hover:bg-hover cursor-pointer text-left"
			@click="$emit('search')">
			<span class="flex-1">{{ t("help.search.open") }}</span>
			<kbd
				class="font-mono text-[11px] border border-line rounded-control px-1.5"
				>/</kbd
			>
		</button>
		<div v-for="g in groups" :key="g.area" class="flex flex-col gap-px">
			<h2
				class="px-2.5 h-6 flex items-center text-xs font-medium uppercase tracking-wider text-muted">
				{{ t(`help.areas.${g.area}`) }}
			</h2>
			<template v-if="g.plan.length">
				<span
					class="flex items-center min-h-8 px-2.5 text-sm font-medium text-ink-strong">
					{{ t("help.parents.plan") }}
				</span>
				<div
					class="flex flex-col gap-px ml-4 pl-2 border-l border-line">
					<RouterLink
						v-for="a in g.plan"
						:key="a.id"
						:to="`/help/${a.id}`"
						:class="linkClass(a.id)"
						:aria-current="a.id === current ? 'page' : undefined"
						@click="markHelpSource('nav')">
						{{ t(`help.articles.${a.id}.title`) }}
					</RouterLink>
				</div>
			</template>
			<RouterLink
				v-for="a in g.top"
				:key="a.id"
				:to="`/help/${a.id}`"
				:class="linkClass(a.id)"
				:aria-current="a.id === current ? 'page' : undefined"
				@click="markHelpSource('nav')">
				{{ t(`help.articles.${a.id}.title`) }}
			</RouterLink>
		</div>
	</nav>
</template>
