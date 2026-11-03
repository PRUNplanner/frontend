import { describe, expect, it, vi } from "vitest";

import { downloadFile, toCsv } from "@/util/download";

describe("toCsv", () => {
	it("joins cells and lines, quoting only where needed", () => {
		expect(
			toCsv([
				["a", 1],
				['b"c', "d,e"],
			])
		).toBe('a,1\n"b""c","d,e"');
	});

	it("quotes by the given delimiter", () => {
		expect(toCsv([["a;b", "c,d", "e\nf"]], ";")).toBe('"a;b";c,d;"e\nf"');
	});
});

describe("downloadFile", () => {
	it("clicks a link to the blob and revokes it", async () => {
		const create = vi
			.spyOn(URL, "createObjectURL")
			.mockReturnValue("blob:x");
		const revoke = vi.spyOn(URL, "revokeObjectURL").mockReturnValue();
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(function (this: HTMLAnchorElement) {
				expect(this.download).toBe("f.csv");
				expect(this.href).toBe("blob:x");
				expect(this.isConnected).toBe(true);
			});

		downloadFile("f.csv", "a,b", "text/csv");

		const blob = create.mock.calls[0][0] as Blob;
		expect(blob.type).toBe("text/csv");
		expect(await blob.text()).toBe("a,b");
		expect(click).toHaveBeenCalledOnce();
		expect(revoke).toHaveBeenCalledWith("blob:x");
		expect(document.querySelector("a[download]")).toBeNull();
		vi.restoreAllMocks();
	});
});
