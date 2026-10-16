<script setup lang="ts">
	import {
		onMounted,
		ref,
		type Ref,
		computed,
		type ComputedRef,
		watch,
		nextTick,
		useTemplateRef,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n({ useScope: "global" });

	import {
		PForm,
		PFormItem,
		PFormSeparator,
		PButton,
		PInput,
		PNotice,
	} from "@/ui";
	import type { UserRegistrationPayload } from "@/features/api/schemas/user.schemas";
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { isEmailAddress } from "@/features/account/account.util";

	const isLoading = ref(false);
	const registrationSuccess = ref(false);
	const registrationUsername: Ref<string | null> = ref(null);

	const inputUsername: Ref<string | null> = ref(null);
	const inputPassword: Ref<string | null> = ref(null);
	const inputEmail: Ref<string | null> = ref(null);
	const inputPlanetName: Ref<string | null> = ref(null);
	const activeSecurityOption: Ref<string | null> = ref(null);

	// backend messages per form field, in form order
	const FIELDS = ["username", "password", "email", "planet_input"] as const;
	type Field = (typeof FIELDS)[number];
	const fieldErrors: Ref<Partial<Record<Field, string[]>>> = ref({});
	// top alert: what went wrong, plus messages that belong to no field
	const alertKind: Ref<"fix_fields" | "throttled" | "unknown" | null> =
		ref(null);
	const alertMessages: Ref<string[]> = ref([]);
	// "fix the fields" only while a field still shows an error
	const alertText = computed(() =>
		alertKind.value === "fix_fields" &&
		!Object.keys(fieldErrors.value).length
			? null
			: alertKind.value
	);

	type InputRef = InstanceType<typeof PInput>;
	const fieldInputs = {
		username: useTemplateRef<InputRef>("username"),
		password: useTemplateRef<InputRef>("password"),
		email: useTemplateRef<InputRef>("email"),
		planet_input: useTemplateRef<InputRef>("planet_input"),
	};

	// editing a field clears only that field's error
	watch(inputUsername, () => delete fieldErrors.value.username);
	watch(inputPassword, () => delete fieldErrors.value.password);
	watch(inputEmail, () => delete fieldErrors.value.email);
	watch(inputPlanetName, () => delete fieldErrors.value.planet_input);

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
		const options = securityOptionList.filter(
			(o) => o !== activeSecurityOption.value
		);
		activeSecurityOption.value =
			options[Math.floor(Math.random() * options.length)];
	}

	function anotherPlanet() {
		randomSecurityOption();
		inputPlanetName.value = null;
	}

	// optional, but when filled: one @ and a dot in the domain part
	const emailValid = computed(
		() => !inputEmail.value || isEmailAddress(inputEmail.value)
	);

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

		if (!emailValid.value) return false;

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

	function isField(key: string): key is Field {
		return (FIELDS as readonly string[]).includes(key);
	}

	async function registerUser(): Promise<void> {
		isLoading.value = true;
		registrationSuccess.value = false;
		fieldErrors.value = {};
		alertKind.value = null;
		alertMessages.value = [];

		try {
			const data = await useQuery(
				"PostUserRegistration",
				registrationPayload.value
			).execute();
			registrationUsername.value = data.username;
			registrationSuccess.value = true;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			// the security planet stays: the typed answer belongs to it
			if (err.status === 429) {
				alertKind.value = "throttled";
			} else if (err.fieldErrors) {
				for (const [key, messages] of Object.entries(
					err.fieldErrors as Record<string, string[]>
				)) {
					if (isField(key)) fieldErrors.value[key] = messages;
					else alertMessages.value.push(...messages);
				}
				alertKind.value = Object.keys(fieldErrors.value).length
					? "fix_fields"
					: null;
			} else {
				alertKind.value = "unknown";
			}

			const firstError = FIELDS.find((f) => fieldErrors.value[f]);
			if (firstError) {
				await nextTick();
				fieldInputs[firstError].value?.focus();
			}
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
			<div class="pb-3 text-muted text-xs font-mono">
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
			<PNotice
				v-if="alertText || alertMessages.length"
				type="error"
				class="mb-3">
				{{ $t("account.components.registration.result.error") }}
				<template v-if="alertText">
					<br />
					{{
						$t(`account.components.registration.result.${alertText}`)
					}}
				</template>
				<template v-for="(message, i) in alertMessages" :key="i">
					<br />
					{{ message }}
				</template>
			</PNotice>
			<PForm>
				<PFormItem
					:label="t('account.components.registration.form.username')">
					<PInput
						ref="username"
						v-model:value="inputUsername"
						autocomplete="username"
						:placeholder="t('account.components.hints.username')"
						class="w-full" />
					<template #info>
						<span
							v-if="fieldErrors.username"
							class="text-negative"
							role="alert">
							{{ fieldErrors.username.join(" ") }}
						</span>
						<template v-else>
							{{
								$t(
									"account.components.registration.form.username_info"
								)
							}}
						</template>
					</template>
				</PFormItem>
				<PFormItem
					:label="t('account.components.registration.form.password')">
					<PInput
						ref="password"
						v-model:value="inputPassword"
						autocomplete="new-password"
						:placeholder="
							t('account.components.hints.new_password')
						"
						type="password"
						class="w-full" />
					<template #info>
						<span
							v-if="fieldErrors.password"
							class="text-negative"
							role="alert">
							{{ fieldErrors.password.join(" ") }}
						</span>
						<template v-else>
							{{
								$t(
									"account.components.registration.form.password_info"
								)
							}}
						</template>
					</template>
				</PFormItem>
				<PFormItem
					:label="t('account.components.registration.form.email')">
					<PInput
						ref="email"
						v-model:value="inputEmail"
						type="email"
						autocomplete="email"
						:placeholder="
							t(
								'account.components.registration.form.email_placeholder'
							)
						"
						class="w-full" />
					<template #info>
						<span
							v-if="fieldErrors.email"
							class="text-negative"
							role="alert">
							{{ fieldErrors.email.join(" ") }}
						</span>
						<span v-else-if="!emailValid" class="text-negative">
							{{
								$t(
									"account.components.registration.form.email_invalid"
								)
							}}
						</span>
						<template v-else>
							{{
								$t(
									"account.components.registration.form.email_info"
								)
							}}
						</template>
					</template>
				</PFormItem>
				<PFormSeparator>
					<div
						class="text-xl text-white font-bold font-mono pt-3 pb-1">
						{{
							$t(
								"account.components.registration.form.security_question"
							)
						}}
					</div>
					<div class="font-mono text-xs text-muted pb-3">
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
						<button
							type="button"
							class="min-h-11 lg:min-h-6 underline hover:text-white cursor-pointer"
							@click="anotherPlanet">
							{{
								$t(
									"account.components.registration.form.another_planet"
								)
							}}
						</button>
					</div>
				</PFormSeparator>
				<PFormItem
					:label="
						t('account.components.registration.form.planet_name')
					">
					<PInput
						ref="planet_input"
						v-model:value="inputPlanetName"
						class="w-full" />
					<template v-if="fieldErrors.planet_input" #info>
						<span class="text-negative" role="alert">
							{{ fieldErrors.planet_input.join(" ") }}
						</span>
					</template>
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
