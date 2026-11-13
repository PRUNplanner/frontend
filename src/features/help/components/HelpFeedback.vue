<script setup lang="ts">
	/**
	 * "Was this page helpful?" Yes or No; No asks what was missing, sent
	 * to the PostHog survey (docs/analytics.md#help), never in an event.
	 *
	 * @author jplacht
	 */
	import { onBeforeUnmount, ref, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { capture } from "@/lib/analytics/usePostHog";

	// UI (public pages import kit files by path)
	import PButton from "@/ui/components/PButton.vue";
	import PInput from "@/ui/components/PInput.vue";

	// Constants
	import {
		HELP_SURVEY_ID,
		HELP_SURVEY_QUESTION_ID,
	} from "@/features/help/help.constants";

	const { article } = defineProps<{ article: string }>();

	const answer: Ref<"yes" | "no" | null> = ref(null);
	const missing: Ref<string | null> = ref("");
	const sent: Ref<boolean> = ref(false);

	function vote(helpful: boolean): void {
		answer.value = helpful ? "yes" : "no";
		trackEvent("help:feedback", { article, is_helpful: helpful });
		if (!helpful) capture("survey shown", { $survey_id: HELP_SURVEY_ID });
	}

	function send(): void {
		// the survey question takes at most 1,000 characters
		const text = (missing.value ?? "").trim().slice(0, 1000);
		if (!text) return;
		capture("survey sent", {
			$survey_id: HELP_SURVEY_ID,
			[`$survey_response_${HELP_SURVEY_QUESTION_ID}`]: text,
			$survey_questions: [
				{
					id: HELP_SURVEY_QUESTION_ID,
					question: t("help.feedback.missing"),
				},
			],
			article,
		});
		sent.value = true;
	}

	// shown, left without an answer
	onBeforeUnmount(() => {
		if (answer.value === "no" && !sent.value)
			capture("survey dismissed", { $survey_id: HELP_SURVEY_ID });
	});
</script>

<template>
	<div
		class="mt-4 pt-4 border-t border-line flex flex-col gap-3"
		data-testid="help-feedback">
		<div
			v-if="answer === null"
			class="flex flex-wrap items-center gap-3"
			role="group"
			:aria-label="t('help.feedback.question')">
			<span class="text-sm text-ink-strong">
				{{ t("help.feedback.question") }}
			</span>
			<PButton size="sm" type="secondary" @click="vote(true)">
				{{ t("help.feedback.yes") }}
			</PButton>
			<PButton size="sm" type="secondary" @click="vote(false)">
				{{ t("help.feedback.no") }}
			</PButton>
		</div>
		<p
			v-else-if="answer === 'yes' || sent"
			class="text-sm text-muted"
			role="status">
			{{ sent ? t("help.feedback.sent") : t("help.feedback.thanks") }}
		</p>
		<form
			v-else
			class="flex flex-col gap-2 max-w-xl"
			@submit.prevent="send">
			<p class="text-sm text-ink-strong" aria-hidden="true">
				{{ t("help.feedback.missing") }}
			</p>
			<PInput
				v-model:value="missing"
				type="textarea"
				:rows="3"
				:aria-label="t('help.feedback.missing')" />
			<div>
				<PButton
					size="sm"
					html-type="submit"
					:disabled="!missing?.trim()">
					{{ t("help.feedback.send") }}
				</PButton>
			</div>
		</form>
	</div>
</template>
