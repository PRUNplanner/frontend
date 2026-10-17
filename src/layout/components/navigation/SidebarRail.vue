<script setup lang="ts">
	import { ref, watch } from "vue";
	import { useRoute } from "vue-router";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useNavigation } from "@/layout/components/navigation/useNavigation";

	// Util
	import {
		initials,
		trackNav,
	} from "@/layout/components/navigation/navigation.util";

	// Components
	import NavPlanList from "@/layout/components/navigation/NavPlanList.vue";
	import NavFioStatus from "@/layout/components/navigation/NavFioStatus.vue";
	import NavAccountMenu from "@/layout/components/navigation/NavAccountMenu.vue";

	// UI
	import { PIcon, PPopover, PTooltip } from "@/ui";
	import {
		AddSharp,
		GridViewSharp,
		HelpOutlineSharp,
		KeyboardDoubleArrowRightSharp,
		LayersOutlined,
	} from "@vicons/material";

	/**
	 * Collapsed navigation (64 px): icons with tooltips, the plans and the
	 * tools in popovers
	 *
	 * @author jplacht
	 */
	defineEmits<{ (e: "expand"): void }>();

	const route = useRoute();
	const {
		currentEmpire,
		plans,
		openPlanUuid,
		strayPlan,
		isActive,
		planning,
		toolGroups,
		toolActive,
		fioSynced,
	} = useNavigation();

	const plansOpen = ref(false);
	const toolsOpen = ref(false);
	watch(
		() => route.fullPath,
		() => {
			plansOpen.value = false;
			toolsOpen.value = false;
		}
	);

	function iconClass(active: boolean): string {
		return [
			"touch-target relative flex items-center justify-center size-11 rounded-lg cursor-pointer",
			active
				? "bg-prunplanner/10 text-prunplanner"
				: "text-muted-strong hover:text-ink hover:bg-hover",
		].join(" ");
	}
</script>

<template>
	<div class="flex flex-col items-center gap-1 h-full min-h-0 py-3">
		<RouterLink
			to="/"
			class="flex items-center justify-center min-w-11 h-8 mb-2 text-prunplanner text-lg font-bold"
			aria-label="PRUNplanner">
			PP
		</RouterLink>

		<PTooltip v-if="currentEmpire" placement="right">
			<template #trigger>
				<RouterLink
					to="/empire"
					class="touch-target flex items-center justify-center size-11 rounded-lg hover:bg-hover"
					:aria-label="currentEmpire.empire_name"
					:aria-current="isActive('empire') ? 'page' : undefined"
					@click="trackNav('empire', 'rail', 'empire')">
					<span
						class="flex items-center justify-center size-7 rounded-md bg-prunplanner text-black text-xs font-bold"
						:class="
							isActive('empire')
								? 'outline-2 outline-offset-2 outline-prunplanner'
								: ''
						">
						{{ initials(currentEmpire.empire_name) }}
					</span>
				</RouterLink>
			</template>
			{{ currentEmpire.empire_name }}
		</PTooltip>
		<PTooltip v-else placement="right">
			<template #trigger>
				<RouterLink
					to="/manage"
					:class="iconClass(false)"
					:aria-label="t('common.navigation.create_empire')"
					@click="trackNav('manage', 'rail', 'empire')">
					<PIcon :size="20"><AddSharp /></PIcon>
				</RouterLink>
			</template>
			{{ t("common.navigation.create_empire") }}
		</PTooltip>

		<PPopover
			v-if="currentEmpire"
			v-model:show="plansOpen"
			placement="right-start"
			panel-class="p-1.5 w-72 flex flex-col max-h-[70vh]"
			:aria-label="t('common.navigation.plans')">
			<template #trigger>
				<PTooltip placement="right" :disabled="plansOpen">
					<template #trigger>
						<button
							type="button"
							:class="iconClass(!!openPlanUuid)"
							:aria-label="t('common.navigation.plans')"
							:aria-expanded="plansOpen">
							<PIcon :size="20"><LayersOutlined /></PIcon>
						</button>
					</template>
					{{ t("common.navigation.plans") }}
				</PTooltip>
			</template>
			<div
				class="shrink-0 px-2.5 pt-1.5 pb-2 text-xs font-medium uppercase tracking-wider text-muted">
				{{
					t("common.navigation.plans_count", {
						name: currentEmpire.empire_name,
						count: plans.length,
					})
				}}
			</div>
			<NavPlanList
				class="flex-1"
				:plans="plans"
				:empire-uuid="currentEmpire.uuid"
				:open-plan-uuid="openPlanUuid"
				:stray="strayPlan"
				area="rail" />
		</PPopover>

		<div class="w-8 h-px my-1.5 bg-line" />

		<PTooltip v-for="item in planning" :key="item.name" placement="right">
			<template #trigger>
				<RouterLink
					:to="item.to"
					:class="iconClass(isActive(item.name))"
					:aria-label="t(`common.navigation.${item.label}`)"
					:aria-current="isActive(item.name) ? 'page' : undefined"
					@click="trackNav(item.name, 'rail', 'planning')">
					<PIcon :size="20"><component :is="item.icon" /></PIcon>
				</RouterLink>
			</template>
			{{ t(`common.navigation.${item.label}`) }}
		</PTooltip>

		<div class="w-8 h-px my-1.5 bg-line" />

		<PPopover
			v-model:show="toolsOpen"
			placement="right-start"
			panel-class="p-1.5 w-60"
			:aria-label="t('common.navigation.tools')">
			<template #trigger>
				<PTooltip placement="right" :disabled="toolsOpen">
					<template #trigger>
						<button
							type="button"
							:class="iconClass(toolActive)"
							:aria-label="t('common.navigation.tools')"
							:aria-expanded="toolsOpen">
							<PIcon :size="20"><GridViewSharp /></PIcon>
						</button>
					</template>
					{{ t("common.navigation.tools") }}
				</PTooltip>
			</template>
			<template v-for="group in toolGroups" :key="group.label">
				<template v-if="group.items.some((i) => i.display)">
					<div
						class="flex items-center justify-between px-2.5 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted">
						{{ t(`common.navigation.${group.label}`) }}
						<span
							v-if="group.label === 'fio.fio' && fioSynced"
							class="flex items-center gap-1 normal-case tracking-normal">
							<span class="size-1.5 rounded-full bg-positive" />
							{{ fioSynced }}
						</span>
					</div>
					<template v-for="item in group.items" :key="item.name">
						<RouterLink
							v-if="item.display"
							:to="item.to"
							class="flex items-center gap-3 h-8 px-2.5 rounded-control"
							:class="
								isActive(item.name)
									? 'bg-prunplanner/10 text-prunplanner'
									: 'text-ink hover:bg-hover'
							"
							:aria-current="
								isActive(item.name) ? 'page' : undefined
							"
							@click="trackNav(item.name, 'rail', 'tools')">
							<PIcon :size="16">
								<component :is="item.icon" />
							</PIcon>
							{{ t(`common.navigation.${item.label}`) }}
						</RouterLink>
					</template>
				</template>
			</template>
		</PPopover>

		<div class="flex-1" />

		<NavFioStatus area="rail" placement="right" />
		<PTooltip placement="right">
			<template #trigger>
				<RouterLink
					to="/help"
					:class="iconClass(isActive('help'))"
					:aria-label="t('common.navigation.help')"
					:aria-current="isActive('help') ? 'page' : undefined"
					@click="trackNav('help', 'rail', 'footer')">
					<PIcon :size="20"><HelpOutlineSharp /></PIcon>
				</RouterLink>
			</template>
			{{ t("common.navigation.help") }}
		</PTooltip>
		<NavAccountMenu area="rail" compact />
		<PTooltip placement="right">
			<template #trigger>
				<button
					type="button"
					:class="iconClass(false)"
					:aria-label="t('common.navigation.expand')"
					aria-expanded="false"
					@click="$emit('expand')">
					<PIcon :size="18"><KeyboardDoubleArrowRightSharp /></PIcon>
				</button>
			</template>
			{{ t("common.navigation.expand") }}
		</PTooltip>
	</div>
</template>
