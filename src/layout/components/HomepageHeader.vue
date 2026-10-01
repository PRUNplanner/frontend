<script setup lang="ts">
	import { onUnmounted } from "vue";

	const { showHeader = true } = defineProps<{
		showHeader?: boolean;
	}>();

	// UI
	import { NCollapseTransition } from "naive-ui";
	import { PButton } from "@/ui";

	// Composables
	import { useAuthPanel } from "@/features/account/useAuthPanel";

	// Components
	import LoginComponent from "@/features/account/components/LoginComponent.vue";
	import RegistrationComponent from "@/features/account/components/RegistrationComponent.vue";

	const {
		showLogin: refShowLogin,
		showRegistration: refShowRegistration,
		toggleLogin,
		toggleRegistration,
		close,
	} = useAuthPanel();

	// the header leaves on login, the next visitor starts with closed panels
	onUnmounted(close);
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
			<div class="flex flex-row items-center gap-x-4 sm:gap-x-6">
				<button
					type="button"
					class="cursor-pointer text-base text-muted-strong hover:text-white hover:underline"
					@click="toggleLogin">
					{{ $t("homepage.navigation.login") }}
				</button>
				<PButton @click="toggleRegistration">
					{{ $t("homepage.navigation.registration") }}
				</PButton>
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
