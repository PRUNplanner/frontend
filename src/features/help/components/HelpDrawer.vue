<script setup lang="ts">
	import { computed, PropType, ref, Ref, watch } from "vue";

	// pre-parsing glob
	const HELP_FILES = import.meta.glob("@/assets/help/**/*.md", {
		query: "?raw",
		import: "default",
	}) as Record<string, () => Promise<string>>;

	import { useI18n } from "vue-i18n";
	const { t, locale } = useI18n({ useScope: "global" });

	import { PButton } from "@/ui";
	import { NDrawer, NDrawerContent } from "naive-ui";
	import { VueShowdown } from "vue-showdown";

	const showDrawer: Ref<boolean> = ref(false);

	async function loadMarkdown(): Promise<string> {
		const fileName = props.fileName;
		const currentLocale = locale.value;
		const fallbackLocale = "en_US";

		const targetPath = `/src/assets/help/${currentLocale}/${fileName}.md`;
		const fallbackPath = `/src/assets/help/${fallbackLocale}/${fileName}.md`;

		let loader = HELP_FILES[targetPath];

		// fallback
		if (!loader) {
			loader = HELP_FILES[fallbackPath];
		}

		// error if fallback unavailable
		if (!loader) {
			throw new Error(
				`Markdown file "${fileName}" not found in ${currentLocale} or ${fallbackLocale}.`
			);
		}

		return await loader();
	}

	const markdownContent = ref("");

	const props = defineProps({
		fileName: {
			type: String,
			required: true,
		},
		drawerTitle: {
			type: String,
			required: false,
			default: undefined,
		},
		buttonTitle: {
			type: String,
			required: false,
			default: undefined,
		},
		buttonSize: {
			type: String as PropType<"sm" | "md">,
			required: false,
			default: "md",
		},
		buttonClass: {
			type: String,
			required: false,
			default: "",
		},
		drawerWidth: {
			type: Number,
			required: false,
			default: 600,
		},
	});

	// the error only shows once loading failed, not while a page loads
	const loadFailed: Ref<boolean> = ref(false);

	watch(showDrawer, async () => {
		if (showDrawer.value) {
			try {
				markdownContent.value = await loadMarkdown();
			} catch (err) {
				console.error(err);
				loadFailed.value = true;
			}
		}
	});

	const displayDrawerTitle = computed(
		() => props.drawerTitle ?? t("common.buttons.help")
	);
	const displayButtonTitle = computed(
		() => props.buttonTitle ?? t("common.buttons.help")
	);
</script>

<template>
	<PButton
		:size="buttonSize"
		:class="buttonClass"
		type="secondary"
		@click="() => (showDrawer = !showDrawer)">
		{{ displayButtonTitle }}
	</PButton>
	<n-drawer v-model:show="showDrawer" :width="drawerWidth" placement="right">
		<n-drawer-content closable>
			<template #header>
				{{ displayDrawerTitle }}
			</template>
			<div v-if="markdownContent != ''" id="markdown">
				<VueShowdown :markdown="markdownContent" />
			</div>
			<div v-else-if="loadFailed" class="text-center text-red-500">
				{{ t("help.load_error", { file_name: fileName }) }}
			</div>
		</n-drawer-content>
	</n-drawer>
</template>
