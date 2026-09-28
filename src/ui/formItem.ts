import type { InjectionKey } from "vue";

/**
 * Provided by PFormItem so the control inside it is labelled: inputs take
 * `inputId` (the label's `for`), non-input controls use `labelId` with
 * aria-labelledby. Controls that render other kit controls provide `null`.
 */
export const formItemKey: InjectionKey<{
	inputId: string;
	labelId: string;
} | null> = Symbol("PFormItem");
