<script setup lang="ts">
	import { onMounted, ref, type Ref, computed, type ComputedRef } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n({ useScope: "global" });

	import { PForm, PFormItem, PFormSeperator, PButton, PInput } from "@/ui";
	import type { UserRegistrationPayload } from "@/features/api/schemas/user.schemas";
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

	const registrationPayload: ComputedRef<UserRegistrationPayload> = computed(
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
					{{
						$t("account.components.registration.result.ok_header", {
							username: registrationUsername,
						})
					}}
				</div>
				<div class="pt-3">
					{{
						$t("account.components.registration.result.ok_message")
					}}
				</div>
			</div>
		</template>
		<template v-else>
			<div class="text-xl text-white font-bold font-mono pb-1">
				{{ $t("account.components.registration.title") }}
			</div>
			<div class="pb-3 text-white/60 text-xs font-mono">
				<i18n-t keypath="account.components.registration.tos" tag="p">
					<template #tos_link>
						<router-link
							to="/imprint-tos"
							class="hover:cursor-pointer underline">
							{{ $t("account.components.registration.tos_link") }}
						</router-link>
					</template>
				</i18n-t>
			</div>
			<div v-if="hasError" class="pb-3 text-red-600">
				{{ $t("account.components.registration.result.error") }}
				<br />
				{{ hasErrorMessage }}
			</div>
			<PForm>
				<PFormItem
					:label="t('account.components.registration.form.username')">
					<PInput v-model:value="inputUsername" class="w-full" />
					<template #info>
						{{
							$t(
								"account.components.registration.form.username_info"
							)
						}}
					</template>
				</PFormItem>
				<PFormItem
					:label="t('account.components.registration.form.password')">
					<PInput
						v-model:value="inputPassword"
						type="password"
						class="w-full" />
					<template #info>
						{{
							$t(
								"account.components.registration.form.password_info"
							)
						}}
					</template>
				</PFormItem>
				<PFormItem
					:label="t('account.components.registration.form.email')">
					<PInput
						v-model:value="inputEmail"
						:placeholder="
							t(
								'account.components.registration.form.email_placeholder'
							)
						"
						class="w-full" />
					<template #info>
						{{
							$t(
								"account.components.registration.form.email_info"
							)
						}}
					</template>
				</PFormItem>
				<PFormSeperator>
					<div
						class="text-xl text-white font-bold font-mono pt-3 pb-1">
						{{
							$t(
								"account.components.registration.form.security_question"
							)
						}}
					</div>
					<div class="font-mono text-xs text-white/60 pb-3">
						<i18n-t
							keypath="account.components.registration.form.question"
							tag="p">
							<template #planet>
								<span
									class="text-nowrap bg-prunplanner text-black px-1"
									>{{ activeSecurityOption }}</span
								>
							</template>
							<template #command>
								<span
									class="text-nowrap bg-prunplanner text-black px-0.5"
									>{{ `PLI ${activeSecurityOption}` }}</span
								>
							</template>
						</i18n-t>
					</div>
				</PFormSeperator>
				<PFormItem
					:label="
						t('account.components.registration.form.planet_name')
					">
					<PInput v-model:value="inputPlanetName" class="w-full" />
				</PFormItem>
				<PFormItem label="">
					<PButton
						:disabled="!canRegister"
						:loading="isLoading"
						class="mt-3"
						@click="registerUser">
						{{
							$t(
								"account.components.registration.buttons.register"
							)
						}}
					</PButton>
				</PFormItem>
			</PForm>
		</template>
	</div>
</template>
