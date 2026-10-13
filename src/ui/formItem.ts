import type { ComputedRef, InjectionKey } from "vue";

import type { FieldStatus } from "@/ui/ui.types";

/**
 * Provided by PFormItem so the control inside it is labelled: inputs take
 * `inputId` (the label's `for`), non-input controls use `labelId` with
 * aria-labelledby. `describedBy` links its error and #info, `status` is
 * "error" while it shows an error. Controls that render other kit controls
 * provide `null`.
 */
export const formItemKey: InjectionKey<{
	inputId: string;
	labelId: string;
	describedBy: ComputedRef<string | undefined>;
	status: ComputedRef<FieldStatus | undefined>;
} | null> = Symbol("PFormItem");
