<script setup lang="ts">
	import { defineAsyncComponent } from "vue";

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

	const notShared: boolean =
		props.sharedPlanUuid === undefined ? true : false;
</script>

<template>
	<WrapperPlanningDataLoader
		:planet-natural-id="planetNaturalId"
		:plan-uuid="planUuid"
		:shared-plan-uuid="sharedPlanUuid"
		:empire-list="notShared"
		:load-c-x="notShared">
		<template #default="{ planDefinition, empireList, disabled }">
			<AsyncWrapperGameData
				v-if="planDefinition != null"
				load-materials
				load-exchanges
				load-recipes
				load-buildings>
				<AsyncPlanView
					:disabled="disabled"
					:plan-data="planDefinition"
					:empire-list="empireList" />
			</AsyncWrapperGameData>
		</template>
	</WrapperPlanningDataLoader>
</template>
