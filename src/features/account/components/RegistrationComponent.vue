<script setup lang="ts">
	import { onMounted, ref, Ref, computed, ComputedRef } from "vue";

	import { PForm, PFormItem, PFormSeperator, PButton, PInput } from "@/ui";
	import { IUserRegistrationPayload } from "@/features/api/userData.types";
	import { useQuery } from "@/lib/query_cache/useQuery";

	const isLoading = ref(false);
	const hasError = ref(false);
	const hasErrorMessage: Ref<string | null> = ref(null);
	const registrationSuccess = ref(false);
	const registrationUsername: Ref<string | null> = ref(null);

	const inputUsername: Ref<string | null> = ref(null);
	const inputPassword: Ref<string | null> = ref(null);
	const inputEmail: Ref<string | null> = ref(null);
	const inputPlanetName: Ref<string | null> = ref(null);
	const activeSecurityOption: Ref<string | null> = ref(null);

	const securityOptionList = [
		"OT-580b",
		"KW-688c",
		"ZV-759c",
		"ZV-896b",
		"FK-794b",
		"UV-351c",
		"RC-040b",
		"OT-442b",
		"KW-020c",
	];

	function randomSecurityOption() {
		activeSecurityOption.value =
			securityOptionList[
				Math.floor(Math.random() * securityOptionList.length)
			];
	}

	const canRegister = computed(() => {
		// username at least 3 characters, no spaces
		if (
			inputUsername.value === null ||
			inputUsername.value.length < 3 ||
			inputUsername.value.includes(" ")
		)
			return false;

		// password at least 8 characters
		if (inputPassword.value === null || inputPassword.value.length < 8)
			return false;

		// planetname must be filled
		if (inputPlanetName.value === null || inputPlanetName.value === "")
			return false;

		return true;
	});

	const registrationPayload: ComputedRef<IUserRegistrationPayload> = computed(
		() => ({
			username: inputUsername.value ?? "",
			password: inputPassword.value ?? "",
			planet_id: activeSecurityOption.value ?? "",
			planet_input: inputPlanetName.value ?? "",
			...(inputEmail.value ? { email: inputEmail.value } : {}),
		})
	);

	async function registerUser(): Promise<void> {
		isLoading.value = true;
		hasError.value = false;
		registrationSuccess.value = false;
		hasErrorMessage.value = null;

		try {
			const data = await useQuery(
				"PostUserRegistration",
				registrationPayload.value
			).execute();
			registrationUsername.value = data.username;
			registrationSuccess.value = true;
		} catch (err: any) {
			if (err.validationFields) {
				hasErrorMessage.value = err.validationFields;
			} else {
				hasErrorMessage.value =
					"Unknown error. Please try again later.";
			}
			hasError.value = true;
			randomSecurityOption();
		} finally {
			isLoading.value = false;
		}
	}

	onMounted(() => randomSecurityOption());
</script>

<template>
	<div class="mx-auto max-w-100">
		<template v-if="registrationSuccess">
			<div>
				<div class="text-xl text-white font-bold font-mono pb-1">
					Welcome, {{ registrationUsername }}!
				</div>
				<div class="pt-3">
					Registration successful. You can now login to PRUNplanner.
				</div>
			</div>
		</template>
		<template v-else>
			<div class="text-xl text-white font-bold font-mono pb-1">
				Account Information
			</div>
			<div class="pb-3 text-white/60 text-xs font-mono">
				PRUNplanner is free to use. By creating an account, you
				acknowledge and agree to the
				<router-link
					to="/imprint-tos"
					class="underline hover:text-link-primary">
					Terms of Service.
				</router-link>
			</div>
			<div v-if="hasError" class="pb-3 text-red-600">
				Error during registration.
				{{ hasErrorMessage }}
			</div>
			<PForm>
				<PFormItem label="Username">
					<PInput v-model:value="inputUsername" class="w-full" />
					<template #info>
						Must be at least 3 characters long. Can't contain
						spaces.
					</template>
				</PFormItem>
				<PFormItem label="Password">
					<PInput
						v-model:value="inputPassword"
						type="password"
						class="w-full" />
					<template #info>
						Must be at least 8 characters long.
					</template>
				</PFormItem>
				<PFormItem label="Email">
					<PInput
						v-model:value="inputEmail"
						placeholder="Not mandatory, but recommended."
						class="w-full" />
					<template #info>
						Not mandatory. Increases your account security.
					</template>
				</PFormItem>
				<PFormSeperator>
					<div
						class="text-xl text-white font-bold font-mono pt-3 pb-1">
						Security Question
					</div>
					<div class="font-mono text-xs text-white/60 pb-3">
						Enter the name of planet
						<span
							class="text-nowrap bg-prunplanner text-black px-1"
							>{{ activeSecurityOption }}</span
						>. To find it, open a new Prosperous Universe buffer
						with the command
						<span
							class="text-nowrap bg-prunplanner text-black px-0.5"
							>{{ `PLI ${activeSecurityOption}` }}</span
						>. You'll see the planet's name listed under "Name" in
						the planet information.
					</div>
				</PFormSeperator>
				<PFormItem label="Name">
					<PInput v-model:value="inputPlanetName" class="w-full" />
				</PFormItem>
				<PFormItem label="">
					<PButton
						:disabled="!canRegister"
						:loading="isLoading"
						class="mt-3"
						@click="registerUser">
						Create Account
					</PButton>
				</PFormItem>
			</PForm>
		</template>
	</div>
</template>
