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

	import PFormItem from "@/ui/components/PFormItem.vue";
	import PIcon from "@/ui/components/PIcon.vue";
	import PInput from "@/ui/components/PInput.vue";
	import PNotice from "@/ui/components/PNotice.vue";
	import PSpin from "@/ui/components/PSpin.vue";
	import { CheckSharp } from "@vicons/material";
	import {
		landingField,
		landingHeading,
		landingInput,
		landingPrimaryButton,
	} from "@/features/homepage/homepage.constants";
	import type { UserRegistrationPayload } from "@/features/api/schemas/user.schemas";
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { isApiError } from "@/lib/apiError";
	import { isEmailAddress } from "@/features/account/account.util";

	// the welcome state's button: the panel switches to the login form
	defineEmits<{
		(e: "login"): void;
	}>();

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
		} catch (err) {
			const apiError = isApiError(err) ? err : undefined;
			// the security planet stays: the typed answer belongs to it
			if (apiError?.status === 429) {
				alertKind.value = "throttled";
			} else if (apiError?.fieldErrors) {
				for (const [key, messages] of Object.entries(
					apiError.fieldErrors
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
	<div v-if="registrationSuccess" role="status" class="flex flex-col gap-5">
		<span
			aria-hidden="true"
			class="size-13 rounded-xl bg-prunplanner/12 inline-flex items-center justify-center text-prunplanner">
			<PIcon :size="26"><CheckSharp /></PIcon>
		</span>
		<h2 :class="landingHeading">
			{{
				$t("account.components.registration.result.ok_header", {
					username: registrationUsername,
				})
			}}
		</h2>
		<p class="m-0 text-white/78">
			{{ $t("account.components.registration.result.ok_message") }}
		</p>
		<button
			type="button"
			:class="[landingPrimaryButton, 'w-full']"
			@click="$emit('login')">
			{{ $t("account.components.login.buttons.login") }}
		</button>
	</div>
	<form v-else class="flex flex-col gap-5" @submit.prevent>
		<h2 :class="landingHeading">
			{{ $t("account.components.registration.title") }}
		</h2>
		<PNotice v-if="alertText || alertMessages.length" type="error">
			{{ $t("account.components.registration.result.error") }}
			<span v-if="alertText">
				<br />
				{{ $t(`account.components.registration.result.${alertText}`) }}
			</span>
			<span v-for="(message, i) in alertMessages" :key="i">
				<br />
				{{ message }}
			</span>
		</PNotice>
		<div :class="landingField">
			<PFormItem
				:label="t('account.components.registration.form.username')">
				<PInput
					ref="username"
					v-model:value="inputUsername"
					autocomplete="username"
					:placeholder="t('account.components.hints.username')"
					:class="landingInput" />
				<template #info>
					<span
						v-if="fieldErrors.username"
						class="text-negative"
						role="alert">
						{{ fieldErrors.username.join(" ") }}
					</span>
					<span v-else>
						{{
							$t(
								"account.components.registration.form.username_info"
							)
						}}
					</span>
				</template>
			</PFormItem>
		</div>
		<div :class="landingField">
			<PFormItem
				:label="t('account.components.registration.form.password')">
				<PInput
					ref="password"
					v-model:value="inputPassword"
					autocomplete="new-password"
					:placeholder="t('account.components.hints.new_password')"
					type="password"
					:class="landingInput" />
				<template #info>
					<span
						v-if="fieldErrors.password"
						class="text-negative"
						role="alert">
						{{ fieldErrors.password.join(" ") }}
					</span>
					<span v-else>
						{{
							$t(
								"account.components.registration.form.password_info"
							)
						}}
					</span>
				</template>
			</PFormItem>
		</div>
		<div :class="landingField">
			<PFormItem :label="t('account.components.registration.form.email')">
				<PInput
					ref="email"
					v-model:value="inputEmail"
					type="email"
					autocomplete="email"
					:placeholder="t('account.components.hints.email')"
					:class="landingInput" />
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
					<span v-else>
						{{
							$t(
								"account.components.registration.form.email_info"
							)
						}}
					</span>
				</template>
			</PFormItem>
		</div>
		<fieldset
			class="mt-1 p-4.5 border border-white/16 rounded-xl flex flex-col gap-3.5">
			<legend
				class="px-2 font-mono text-[12.5px] tracking-[0.08em] uppercase text-prunplanner">
				{{
					$t("account.components.registration.form.security_question")
				}}
			</legend>
			<i18n-t
				keypath="account.components.registration.form.question"
				tag="p"
				class="m-0 text-[15px] text-white/78">
				<template #planet>
					<span class="font-mono font-bold text-white text-nowrap">{{
						activeSecurityOption
					}}</span>
				</template>
			</i18n-t>
			<div
				class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#030707] border border-white/10 font-mono text-[15px]">
				<span aria-hidden="true" class="text-white/62">&gt;</span>
				<span class="font-bold text-prunplanner">{{
					`PLI ${activeSecurityOption}`
				}}</span>
			</div>
			<div :class="landingField">
				<PFormItem
					:label="
						t('account.components.registration.form.planet_name')
					">
					<PInput
						ref="planet_input"
						v-model:value="inputPlanetName"
						autocomplete="off"
						:placeholder="''"
						:class="landingInput" />
					<template v-if="fieldErrors.planet_input" #info>
						<span class="text-negative" role="alert">
							{{ fieldErrors.planet_input.join(" ") }}
						</span>
					</template>
				</PFormItem>
			</div>
			<button
				type="button"
				class="self-start min-h-11 text-sm text-white/78 underline hover:text-white cursor-pointer"
				@click="anotherPlanet">
				{{ $t("account.components.registration.form.another_planet") }}
			</button>
		</fieldset>
		<button
			type="button"
			:disabled="!canRegister || isLoading"
			:aria-busy="isLoading"
			:class="[landingPrimaryButton, 'w-full']"
			@click="registerUser">
			<PSpin v-if="isLoading" color="muted" />
			{{ $t("account.components.registration.buttons.register") }}
		</button>
		<i18n-t
			keypath="account.components.registration.tos"
			tag="p"
			class="m-0 font-mono text-xs text-white/62">
			<template #tos_link>
				<router-link to="/imprint-tos" class="underline">
					{{ $t("account.components.registration.tos_link") }}
				</router-link>
			</template>
		</i18n-t>
	</form>
</template>
