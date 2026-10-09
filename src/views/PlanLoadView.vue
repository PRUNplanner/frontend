<script setup lang="ts">
	import { computed, defineAsyncComponent, onMounted } from "vue";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Router
	import router from "@/router";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// Util
	import { isOwnPlan } from "@/features/sharing/sharedPlan.util";

	// Types & Interfaces
	import type {
		Plan,
		PlanShare,
	} from "@/features/api/schemas/planningData.schemas";

	// Components
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	const AsyncWrapperGameData = defineAsyncComponent(
		() => import("@/features/wrapper/components/WrapperGameDataLoader.vue")
	);

	// Views
	const AsyncPlanView = defineAsyncComponent(
		() => import("@/views/PlanView.vue")
	);

	const props = defineProps({
		planetNaturalId: {
			type: String,
			required: false,
			default: undefined,
		},
		planUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		sharedPlanUuid: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const userStore = useUserStore();

	// the owner redirect keeps this page, only its props change
	const notShared = computed(() => props.sharedPlanUuid === undefined);

	// a shared plan loads the viewer's empires, CX and plans once logged in,
	// also after logging in on the page
	const loadUserData = computed(
		() => notShared.value || userStore.isLoggedIn
	);

	/*
	 * The owner opening their own share link edits their plan instead
	 */
	let sharedPlan: PlanShare | undefined;
	let ownPlans: Plan[] | undefined;

	function redirectOwner(): void {
		if (!sharedPlan || !ownPlans) return;
		const { uuid, planet_natural_id } = sharedPlan.plan_details;
		if (isOwnPlan(ownPlans, uuid))
			router.replace(`/plan/${planet_natural_id}/${uuid}`);
	}

	function onSharedPlan(data: PlanShare): void {
		sharedPlan = data;
		redirectOwner();
	}

	function onOwnPlans(data: Plan[]): void {
		ownPlans = data;
		redirectOwner();
	}

	onMounted(() =>
		trackEvent("plan:view", {
			planet_natural_id: props.planetNaturalId,
			is_shared: !notShared.value,
		})
	);
</script>

<template>
	<WrapperPlanningDataLoader
		:planet-natural-id="planetNaturalId"
		:plan-uuid="planUuid"
		:shared-plan-uuid="sharedPlanUuid"
		:empire-list="loadUserData"
		:load-c-x="loadUserData"
		:plan-list="!notShared && userStore.isLoggedIn"
		@data:shared:plan="onSharedPlan"
		@data:plan:list="onOwnPlans">
		<template #default="{ planDefinition, empireList, disabled, shared }">
			<AsyncWrapperGameData
				v-if="planDefinition != null"
				load-materials
				load-exchanges
				load-recipes
				load-buildings>
				<AsyncPlanView
					:disabled="disabled"
					:shared="shared"
					:plan-data="planDefinition"
					:empire-list="empireList"
					:shared-plan-uuid="sharedPlanUuid" />
			</AsyncWrapperGameData>
		</template>
	</WrapperPlanningDataLoader>
</template>
