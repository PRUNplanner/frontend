import { h } from "vue";
import { type MessageReactive, useMessage } from "naive-ui";

import PToast from "@/ui/components/PToast.vue";
import type { PToastOptions } from "@/ui/ui.types";

/**
 * Toasts in the kit's look: naive-ui's message queue (placement,
 * timing, hover to keep) rendering a `PToast`
 *
 * @returns {Function} toast(text, options), returns the message to close it early
 */
export function useToast() {
	const message = useMessage();

	return function toast(
		text: string,
		{ type = "info", action, duration = 6000 }: PToastOptions = {}
	): MessageReactive {
		return message.create(text, {
			duration,
			keepAliveOnHover: true,
			render: () =>
				h(PToast, {
					type,
					text,
					actionLabel: action?.label,
					onAction: action?.onClick,
				}),
		});
	};
}
