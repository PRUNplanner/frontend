<script setup lang="ts">
	import { onUnmounted } from "vue";

	const { showHeader = true } = defineProps<{
		showHeader?: boolean;
	}>();

	// UI
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
		<!-- the height animates from 0fr to 1fr, as naive-ui's collapse did -->
		<Transition
			enter-active-class="transition-[grid-template-rows] duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
			leave-active-class="transition-[grid-template-rows] duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
			enter-from-class="grid-rows-[0fr]"
			enter-to-class="grid-rows-[1fr]"
			leave-from-class="grid-rows-[1fr]"
			leave-to-class="grid-rows-[0fr]">
			<div v-if="refShowLogin" class="grid">
				<div class="overflow-hidden min-h-0">
					<div
						class="mt-5 md:px-10 lg:px-0 bg-white/5 border-t border-b border-white/10">
						<div class="mx-auto max-w-7xl py-10">
							<LoginComponent />
						</div>
					</div>
				</div>
			</div>
		</Transition>
		<Transition
			enter-active-class="transition-[grid-template-rows] duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
			leave-active-class="transition-[grid-template-rows] duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
			enter-from-class="grid-rows-[0fr]"
			enter-to-class="grid-rows-[1fr]"
			leave-from-class="grid-rows-[1fr]"
			leave-to-class="grid-rows-[0fr]">
			<div v-if="refShowRegistration" class="grid">
				<div class="overflow-hidden min-h-0">
					<div
						class="mt-5 md:px-10 lg:px-0 bg-white/5 border-t border-b border-white/10">
						<div class="mx-auto max-w-7xl py-10">
							<RegistrationComponent />
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</div>
</template>
