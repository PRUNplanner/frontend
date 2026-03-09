import { it, expect } from "vitest";

import {
	PButton,
	PCheckbox,
	PTooltip,
	PButtonGroup,
	PForm,
	PFormItem,
	PInputNumber,
	PInput,
	PSelect,
} from "@/ui";

it("UI importer", async () => {
	expect(PButton).toBeDefined();
	expect(PCheckbox).toBeDefined();
	expect(PTooltip).toBeDefined();
	expect(PButtonGroup).toBeDefined();
	expect(PForm).toBeDefined();
	expect(PFormItem).toBeDefined();
	expect(PInputNumber).toBeDefined();
	expect(PInput).toBeDefined();
	expect(PSelect).toBeDefined();
});
