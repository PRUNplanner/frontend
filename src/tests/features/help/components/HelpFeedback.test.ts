import { describe, expect, it, vi } from "vitest";

import HelpFeedback from "@/features/help/components/HelpFeedback.vue";
import { mountComponent } from "@/tests/mountComponent";

const { trackEvent, capture } = vi.hoisted(() => ({
	trackEvent: vi.fn(),
	capture: vi.fn(),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent }));
vi.mock("@/lib/analytics/usePostHog", () => ({ capture }));

const SURVEY = "01a1d485-e276-0000-cb5a-3ac257d59f29";
const QUESTION = "55beceae-5049-4ba6-aabd-e47b0bcc9a38";

const buttons = (w: Awaited<ReturnType<typeof mountComponent>>["wrapper"]) =>
	w.findAll("button");

describe("HelpFeedback", () => {
	it("thanks for a Yes", async () => {
		const { wrapper } = await mountComponent(HelpFeedback, {
			article: "plan_check",
		});
		await buttons(wrapper)[0]!.trigger("click");

		expect(trackEvent).toHaveBeenCalledWith("help:feedback", {
			article: "plan_check",
			is_helpful: true,
		});
		expect(capture).not.toHaveBeenCalled();
		expect(wrapper.text()).toContain("help.feedback.thanks");
	});

	it("asks what was missing after a No and sends it to the survey only", async () => {
		const { wrapper } = await mountComponent(HelpFeedback, {
			article: "plan_check",
		});
		await buttons(wrapper)[1]!.trigger("click");

		expect(trackEvent).toHaveBeenCalledWith("help:feedback", {
			article: "plan_check",
			is_helpful: false,
		});
		expect(capture).toHaveBeenCalledWith("survey shown", {
			$survey_id: SURVEY,
		});
		const field = wrapper.find("textarea");
		const send = wrapper.find("button[type=submit]");
		expect(send.attributes("disabled")).toBeDefined();

		await field.setValue("  The flags need an example  ");
		await wrapper.find("form").trigger("submit");

		expect(capture).toHaveBeenCalledWith("survey sent", {
			$survey_id: SURVEY,
			[`$survey_response_${QUESTION}`]: "The flags need an example",
			$survey_questions: [
				{ id: QUESTION, question: "help.feedback.missing" },
			],
			article: "plan_check",
		});
		// the text is in no help:* event
		expect(JSON.stringify(trackEvent.mock.calls)).not.toContain(
			"flags need"
		);
		expect(wrapper.text()).toContain("help.feedback.sent");

		wrapper.unmount();
		expect(capture).not.toHaveBeenCalledWith(
			"survey dismissed",
			expect.anything()
		);
	});

	it("counts a No left without an answer as dismissed", async () => {
		const { wrapper } = await mountComponent(HelpFeedback, {
			article: "exchanges",
		});
		await buttons(wrapper)[1]!.trigger("click");
		await wrapper.find("form").trigger("submit");
		expect(capture).not.toHaveBeenCalledWith(
			"survey sent",
			expect.anything()
		);

		wrapper.unmount();
		expect(capture).toHaveBeenCalledWith("survey dismissed", {
			$survey_id: SURVEY,
		});
	});
});
