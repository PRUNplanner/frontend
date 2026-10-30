import { watch } from "vue";
import { describe, vi } from "vitest";
import { bench } from "@/tests/bench";
import { createPinia, setActivePinia } from "pinia";

// test data: the burst the production stream sends on connect, recorded
// with its arrival times (company names blanked)
import stream from "@/tests/test_data/sse_cx_stream.json";

/**
 * 1,500 CX stream messages (the recorded connect burst, replayed until
 * 1,500) at their arrival times, with the table data read on every render
 * like the Market Live table does. Runs unchanged on main for the before:
 * there each message is processed in its own task, so the table data
 * recomputes per message; here once per 16 ms frame.
 */

class FakeEventSource {
	static last: FakeEventSource;
	onopen?: () => void;
	onerror?: (err: unknown) => void;
	onmessage?: (event: { data: string }) => void;
	close() {}
	constructor(public url: string) {
		FakeEventSource.last = this;
	}
}
vi.stubGlobal("EventSource", FakeEventSource);
// performance stays real, the bench measures with it
vi.useFakeTimers({
	toFake: ["setTimeout", "clearTimeout", "Date"],
});

setActivePinia(createPinia());
const { useExchangeSSE } =
	await import("@/features/market_live/useExchangeSSE");
const sse = useExchangeSSE();
sse.connect();

// the table renders the data once per flush of the page
let tableRuns = 0;
watch(sse.cxPointTableData, () => tableRuns++);

const messages = Array.from({ length: 1500 }, (_, i) => {
	const { t, m } = stream[i % stream.length];
	// one replay of the burst per second
	return {
		t: t + Math.floor(i / stream.length) * 1000,
		data: JSON.stringify(m),
	};
});

async function replay(): Promise<void> {
	let now = 0;
	for (const { t, data } of messages) {
		if (t > now) {
			// the page renders between the arrivals
			await vi.advanceTimersByTimeAsync(t - now);
			now = t;
		}
		FakeEventSource.last.onmessage?.({ data });
	}
	// the last frame and the processing cooldown
	await vi.advanceTimersByTimeAsync(400);
}

await replay();
console.log(
	`[count] 1,500 messages: table runs=${tableRuns} ` +
		`points=${Object.keys(sse.cxPointMap).length} ` +
		`events=${sse.eventLog.length}`
);

describe("market live stream", () => {
	bench("1,500 messages, table read per render", replay, {
		iterations: 10,
		warmupIterations: 1,
		time: 0,
		warmupTime: 0,
	});
});
