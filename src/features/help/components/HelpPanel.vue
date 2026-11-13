<script setup lang="ts">
	/**
	 * A page's Help button and side panel: the help centre's article,
	 * opened at a section, beside the page (its unsaved state stays), with
	 * "Open in Help centre" and the plan page's other articles as chips.
	 *
	 * @author jplacht
	 */
	import { computed, defineAsyncComponent, ref, type Ref, watch } from "vue";
	import { useI18n } from "vue-i18n";
	const { t, locale } = useI18n({ useScope: "global" });

	// Components
	const HelpArticle = defineAsyncComponent(
		() => import("@/features/help/components/HelpArticle.vue")
	);

	// Composables
	import { reportError, trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { getArticle, siblings } from "@/features/help/helpArticles";
	import { loadArticle } from "@/features/help/helpContent";

	// UI
	import { PButton, PDrawer, PNotice } from "@/ui";

	// Types & Interfaces
	import type { IHelpArticle, IHelpDoc } from "@/features/help/help.types";

	const {
		article: articleId,
		section = undefined,
		buttonTitle = undefined,
		buttonSize = "md",
		buttonClass = "",
	} = defineProps<{
		/** an id of helpArticles.ts */
		article: string;
		section?: string;
		buttonTitle?: string;
		buttonSize?: "sm" | "md";
		buttonClass?: string;
	}>();

	const show: Ref<boolean> = ref(false);
	// a chip switches the panel to a sibling article
	const shownId: Ref<string> = ref(articleId);
	const shownSection: Ref<string | undefined> = ref(section);
	const shown = computed(() => getArticle(shownId.value));

	const loaded: Ref<{ doc: IHelpDoc | null; isFallback: boolean } | null> =
		ref(null);
	const loadFailed: Ref<boolean> = ref(false);

	async function load(article: IHelpArticle): Promise<void> {
		loaded.value = null;
		loadFailed.value = false;
		try {
			const result = (await loadArticle(article, locale.value)) ?? {
				doc: null,
				isFallback: false,
			};
			// a later chip click won the race
			if (article.id !== shownId.value) return;
			loaded.value = result;
			trackEvent("help:article_view", {
				article: article.id,
				section: shownSection.value,
				source: "panel",
				is_fallback_locale: loaded.value.isFallback,
			});
		} catch (err) {
			reportError(err);
			loadFailed.value = true;
		}
	}

	function open(): void {
		shownId.value = articleId;
		shownSection.value = section;
		show.value = true;
		trackEvent("help:panel_open", { article: articleId, section });
	}

	watch([show, shownId, locale], () => {
		if (!show.value) return;
		if (shown.value) load(shown.value);
		else {
			reportError(new Error(`Unknown help article "${shownId.value}"`));
			loadFailed.value = true;
		}
	});

	function pick(id: string): void {
		shownSection.value = undefined;
		shownId.value = id;
	}

	const chips = computed(() => (shown.value ? siblings(shown.value) : []));
	const centreLink = computed(
		() =>
			`/help/${shownId.value}${shownSection.value ? `#${shownSection.value}` : ""}`
	);
</script>

<template>
	<PButton
		:size="buttonSize"
		:class="buttonClass"
		type="secondary"
		aria-haspopup="dialog"
		@click="open">
		{{ buttonTitle ?? t("common.buttons.help") }}
	</PButton>
	<PDrawer v-model:show="show" :width="640" data-testid="help-panel">
		<template #header>
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
				<span class="text-xs font-normal text-muted">
					{{ t("help.article.root") }} /
					<span v-if="shown?.parent">
						{{ t(`help.parents.${shown.parent}`) }} /
					</span>
				</span>
				<span class="text-base font-bold">
					{{ shown ? t(`help.articles.${shown.id}.title`) : "" }}
				</span>
				<RouterLink
					:to="centreLink"
					class="ml-auto text-xs font-normal text-link-primary hover:underline"
					@click="show = false">
					{{ t("help.panel.open_in_centre") }}
				</RouterLink>
			</div>
		</template>

		<div
			v-if="chips.length"
			class="flex flex-wrap items-center gap-1.5 mb-4"
			role="group"
			data-testid="help-chips"
			:aria-label="t(`help.parents.${shown!.parent}`)">
			<span class="text-xs text-muted mr-1">
				{{ t(`help.parents.${shown!.parent}`) }}:
			</span>
			<button
				v-for="c in chips"
				:key="c.id"
				type="button"
				class="px-2.5 py-1 rounded-control border text-xs cursor-pointer"
				:class="
					c.id === shownId
						? 'border-prunplanner/50 bg-prunplanner/10 text-prunplanner'
						: 'border-line text-ink hover:bg-hover'
				"
				:aria-current="c.id === shownId ? 'page' : undefined"
				@click="pick(c.id)">
				{{ t(`help.articles.${c.id}.title`) }}
			</button>
		</div>

		<HelpArticle
			v-if="shown && loaded"
			:article="shown"
			:doc="loaded.doc"
			:is-fallback="loaded.isFallback"
			:section="shownSection"
			in-panel
			@navigate="show = false" />
		<PNotice v-else-if="loadFailed" type="error">
			{{ t("help.article.not_found") }}
		</PNotice>
	</PDrawer>
</template>
