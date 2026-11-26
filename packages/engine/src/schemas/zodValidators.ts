import { z } from "zod";

/**
 * Validates a schema for a number being either 0 or positive
 * @author jplacht
 *
 * @type {*}
 */
export const PositiveOrZeroNumber = z.number().refine((value) => value >= 0, {
	message: "Number must be 0 or positive",
});
