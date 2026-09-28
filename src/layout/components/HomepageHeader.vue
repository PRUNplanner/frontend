<script setup lang="ts">
	import { ref, type Ref } from "vue";

	const { showHeader = true } = defineProps<{
		showHeader?: boolean;
	}>();

	// UI
	import { NCollapseTransition } from "naive-ui";

	// Components
	import LoginComponent from "@/features/account/components/LoginComponent.vue";
	import RegistrationComponent from "@/features/account/components/RegistrationComponent.vue";

	const refShowLogin: Ref<boolean> = ref(false);
	const refShowRegistration: Ref<boolean> = ref(false);

	function toggleLogin(): void {
		refShowRegistration.value = false;
		refShowLogin.value = !refShowLogin.value;
	}

	function toggleRegistration(): void {
		refShowLogin.value = false;
		refShowRegistration.value = !refShowRegistration.value;
	}
</script>

<template>
	<div
		class="mx-auto w-full max-w-7xl mt-10 px-3 flex flex-row flex-wrap justify-between gap-3">
		<div>
			<h2 class="text-3xl text-prunplanner font-light">
				<span class="font-bold">PRUN</span>planner
			</h2>
		</div>
		<div
			class="flex flex-row justify-between gap-x-7 child:text-white child:my-auto">
			<div>
				<RouterLink to="/">
					<h2
						v-if="showHeader"
						class="text-3xl text-prunplanner font-light">
						<span class="font-bold">PRUN</span>planner
					</h2>
				</RouterLink>
			</div>
			<div
				class="flex flex-row gap-x-2 sm:gap-x-7 child:cursor-pointer child:px-3 child:py-1 child:text-lg child:font-light child:hover:bg-white/10 child:hover:rounded-lg">
				<button type="button" @click="toggleRegistration">
					{{ $t("homepage.navigation.registration") }}
				</button>
				<button type="button" @click="toggleLogin">
					{{ $t("homepage.navigation.login") }}
				</button>
			</div>
		</div>
	</div>
	<div class="lg:pb-5">
		<n-collapse-transition :show="refShowLogin">
			<div
				class="mt-5 md:px-10 lg:px-0 bg-white/5 border-t border-b border-white/10">
				<div class="mx-auto max-w-7xl py-10">
					<LoginComponent />
				</div>
			</div>
		</n-collapse-transition>
		<n-collapse-transition :show="refShowRegistration">
			<div
				class="mt-5 md:px-10 lg:px-0 bg-white/5 border-t border-b border-white/10">
				<div class="mx-auto max-w-7xl py-10">
					<RegistrationComponent />
				</div>
			</div>
		</n-collapse-transition>
	</div>
</template>
