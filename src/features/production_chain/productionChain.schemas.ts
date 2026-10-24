import { z } from "zod";

/** the last chain in localStorage: its URL query values */
export const ChainStorageSchema = z.record(z.string(), z.string());
