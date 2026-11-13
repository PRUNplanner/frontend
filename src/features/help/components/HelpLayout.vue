<script setup lang="ts">
	/**
	 * The help centre's frame: nav column (a menu on phones), the page,
	 * an optional right column, and the search dialog (also on "/"). A
	 * centred container, so it reads well without the app sidebar too.
	 *
	 * @author jplacht
	 */
	import {
		defineAsyncComponent,
		onBeforeUnmount,
		onMounted,
		ref,
		type Ref,
	} from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import HelpNav from "@/features/help/components/HelpNav.vue";
	const HelpSearch = defineAsyncComponent(
		() => import("@/features/help/components/HelpSearch.vue")
	);

	// Stores
	import { useUserStore } from "@/stores/userStore";
	const userStore = useUserStore();

	const { current = undefined } = defineProps<{ current?: string }>();

	const searchOpen: Ref<boolean> = ref(false);
	// the dialog's chunk loads with the first search
	const searchUsed: Ref<boolean> = ref(false);

	function openSearch(): void {
		searchUsed.value = true;
		searchOpen.value = true;
	}
	defineExpose({ openSearch });

	// "/" opens search, unless typing somewhere
	function onKeydown(event: KeyboardEvent): void {
		if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey)
			return;
		const el = event.target;
		if (
			el instanceof Element &&
			el.closest("input, textarea, select, [contenteditable=true]")
		)
			return;
		event.preventDefault();
		openSearch();
	}
	onMounted(() => window.addEventListener("keydown", onKeydown));
	onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

	const menu: Ref<HTMLDetailsElement | null> = ref(null);
</script>

<template>
	<!-- logged out, a section heading stops below the sticky homepage header -->
	<div
		class="w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row lg:items-start"
		:class="userStore.isLoggedIn ? '' : '[--help-anchor-offset:6.5rem]'">
		<!-- wide: a sticky column -->
		<div
			class="hidden lg:block w-64 shrink-0 self-stretch border-r border-line">
			<div
				class="sticky top-0 max-h-screen overflow-y-auto px-3 pt-6 pb-10">
				<HelpNav :current="current" @search="openSearch" />
			</div>
		</div>

		<!-- phones and tablets: a menu above the page -->
		<details
			ref="menu"
			class="lg:hidden border-b border-line px-4 py-2"
			data-testid="help-menu">
			<summary
				class="cursor-pointer py-1 text-sm font-medium text-ink-strong">
				{{ t("help.article.menu") }}
			</summary>
			<div class="pt-3 pb-2" @click="menu?.removeAttribute('open')">
				<HelpNav :current="current" @search="openSearch" />
			</div>
		</details>

		<div
			class="flex-1 min-w-0 flex flex-col xl:flex-row xl:items-start gap-8 xl:gap-12 px-4 sm:px-6 lg:px-12 pt-6 lg:pt-8 pb-16">
			<div class="flex-1 min-w-0 max-w-[760px]">
				<slot :open-search="openSearch" />
			</div>
			<aside
				v-if="$slots.aside"
				class="hidden xl:block w-56 shrink-0 sticky top-8">
				<slot name="aside" />
			</aside>
		</div>

		<HelpSearch v-if="searchUsed" v-model:show="searchOpen" />
	</div>
</template>
