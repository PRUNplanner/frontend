import { ref, reactive, computed } from "vue";
import { storeToRefs } from "pinia";
import { z } from "zod";

// Stores
import { useAlertsStore } from "@/stores/userAlertsStore";

// Types & Interfaces
import {
	SSECXOrderSchema,
	SSECXSchema,
	type SSECXSchemaType,
} from "@/features/market_live/schemas/cxSSE.schema";
import {
	MarketEvent,
	MessageHistory,
} from "@/features/market_live/cxDetectors.types";
import { processUserDetectors } from "@/features/market_live/cxDetectors";
import { CXDataPoint } from "@/features/market_live/cxExchange.types";

const isConnected = ref(false);
const connectionError = ref<string | null>(null);

const cxPointMap = reactive<Record<string, CXDataPoint>>({});
const eventLog = reactive<MarketEvent[]>([]);

const messageHistory = ref<MessageHistory[]>([]);

const isProcessing = ref(false);
let activeMessages = 0;
let processingTimeout: number | null = null;

const EVENT_LOG_MAX = 500;
const MESSAGE_HISTORY_MAX = 25;

export function useExchangeSSE() {
	const urlCXSSE = "https://api.prunplanner.org/data/stream/?channels=cx";
	const alertsStore = useAlertsStore();
	const { userAlerts } = storeToRefs(alertsStore);

	let eventSource: EventSource | null = null;

	const detectorsActive = ref<boolean>(true);

	const targetExchanges = ["NC1", "AI1", "IC1", "CI1"];

	const cxPointTableData = computed(() =>
		Object.values(cxPointMap)
			.filter((e) => targetExchanges.includes(e.exchange_code))
			.sort((a, b) => a.ticker.localeCompare(b.ticker))
	);

	function calculateDelta(next?: number, prev?: number): number | undefined {
		if (next === undefined || prev === undefined) return undefined;
		return next - prev;
	}

	function transformSSEToPoint(data: SSECXSchemaType): CXDataPoint {
		// processing orders
		const processOrders = (
			orders: z.infer<typeof SSECXOrderSchema>[],
			type: "BUY" | "SELL"
		) => {
			if (!orders || orders.length === 0) return null;

			// book processing
			let totalVolume = 0;
			let totalWeightedValue = 0;
			let extremePrice = type === "BUY" ? -Infinity : Infinity;

			for (let i = 0; i < orders.length; i++) {
				const order = orders[i];
				const count = order.item_count ?? 0;
				const cost = order.item_cost;

				totalVolume += count;
				totalWeightedValue += cost * count;

				if (type === "BUY") {
					if (cost > extremePrice) extremePrice = cost;
				} else {
					if (cost < extremePrice) extremePrice = cost;
				}
			}

			return {
				volume: totalVolume,
				vwap:
					totalVolume > 0
						? totalWeightedValue / totalVolume
						: undefined,
				extreme: totalVolume > 0 ? extremePrice : undefined,
			};
		};

		const buyStats = processOrders(data.buy_orders, "BUY");
		const sellStats = processOrders(data.sell_orders, "SELL");

		const point: CXDataPoint = {
			ticker: `${data.material_ticker}.${data.exchange_code}`,
			material_ticker: data.material_ticker,
			exchange_code: data.exchange_code,
			last_updated: Date.now(),

			// pass throughs
			price: data.price,
			bid: data.bid,
			ask: data.ask,
			demand: data.demand,
			supply: data.supply,
			traded: data.traded,
			volume: data.volume ?? 0,

			// order book stats
			buy_volume_total: buyStats?.volume ?? 0,
			sell_volume_total: sellStats?.volume ?? 0,
			buy_volume_change: 0,
			sell_volume_change: 0,
			buy_vwap: buyStats?.vwap,
			sell_vwap: sellStats?.vwap,
			highest_buy_cost: buyStats?.extreme,
			lowest_sell_cost: sellStats?.extreme,
		};

		// spread calculation
		const effectiveAsk = point.ask ?? point.lowest_sell_cost;
		const effectiveBid = point.bid ?? point.highest_buy_cost;

		if (effectiveAsk && effectiveBid && effectiveAsk > 0) {
			point.spread = effectiveAsk - effectiveBid;
			point.spread_pct = (point.spread / effectiveAsk) * 100;
		}

		return point;
	}

	function processIncomingData(
		rawData: SSECXSchemaType,
		prev: CXDataPoint | undefined
	): CXDataPoint {
		const key = `${rawData.material_ticker}.${rawData.exchange_code}`;
		const next = transformSSEToPoint(rawData);

		// delta calculations, if previous point exists
		if (prev) {
			next.price_change = calculateDelta(next.price, prev.price);
			next.bid_change = calculateDelta(next.bid, prev.bid);
			next.ask_change = calculateDelta(next.ask, prev.ask);

			next.buy_volume_change = Math.abs(
				next.buy_volume_total - prev.buy_volume_total
			);
			next.sell_volume_change = Math.abs(
				next.sell_volume_total - prev.sell_volume_total
			);

			if (next.price_change !== undefined && prev.price) {
				next.price_change_pct = (next.price_change / prev.price) * 100;
			}

			// merge old and new
			const updatedPoint = { ...prev };

			for (const key in next) {
				if (next[key] !== undefined && next[key] !== null) {
					updatedPoint[key] = next[key];
				}
			}
			cxPointMap[key] = updatedPoint;
		} else {
			cxPointMap[key] = next;
		}

		return next;
	}

	function processData(event: MessageEvent) {
		const rawData = JSON.parse(event.data);

		// zod validation
		const result = SSECXSchema.safeParse(rawData);

		if (!result.success) {
			console.error(
				"CX SEE Validation failed",
				z.treeifyError(result.error)
			);
			return;
		}

		// prepare data
		const data = result.data;
		const key = `${data.material_ticker}.${data.exchange_code}`;

		// incoming data log
		const now = new Date();
		const minuteKey = new Date(now.setSeconds(0, 0)).getTime();
		let bundle = messageHistory.value.find(
			(e) => e.timestamp === minuteKey
		);

		if (!bundle) {
			messageHistory.value.unshift({
				timestamp: minuteKey,
				tickers: [],
			});

			// keep only last 5 data ingestions
			if (messageHistory.value.length > MESSAGE_HISTORY_MAX) {
				messageHistory.value.pop();
			}
			bundle = messageHistory.value[0];
		}

		// push in new ticker, if not already present
		if (!bundle.tickers.includes(key)) {
			bundle.tickers.push(key);
		}

		// process grab old, process new data
		const oldData = cxPointMap[key] as CXDataPoint | undefined;
		const newData = processIncomingData(data, oldData);

		// trigger detectors
		if (detectorsActive.value) {
			const userEvents = processUserDetectors(
				userAlerts.value,
				oldData,
				newData
			);
			userEvents.forEach((event) => eventLog.unshift(event));
		}

		// prevent eventLog overflow
		if (eventLog.length > EVENT_LOG_MAX) {
			eventLog.length = EVENT_LOG_MAX;
		}
	}

	const connect = () => {
		// already connected
		if (eventSource || isConnected.value) return;

		eventSource = new EventSource(urlCXSSE);

		eventSource.onopen = () => {
			isConnected.value = true;
			connectionError.value = null;
		};

		eventSource.onerror = (err) => {
			console.error("CX SSE Error", err);
			connectionError.value = "Connection lost. Reconnecting...";
			isConnected.value = false;
		};

		eventSource.onmessage = (event) => {
			isProcessing.value = true;
			activeMessages++;

			if (processingTimeout) {
				clearTimeout(processingTimeout);
				processingTimeout = null;
			}

			setTimeout(() => {
				try {
					processData(event);
				} finally {
					// decrease active messages and only start cooldown timer
					// if there are no messages left
					activeMessages--;

					if (activeMessages === 0) {
						processingTimeout = window.setTimeout(() => {
							isProcessing.value = false;
						}, 300);
					}
				}
			}, 0);
		};
	};

	const disconnect = () => {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		isConnected.value = false;
	};

	const clearEventLog = () => {
		eventLog.length = 0;
	};

	return {
		// state
		eventLog,
		detectorsActive,
		isConnected,
		connectionError,
		isProcessing,
		cxPointMap,
		cxPointTableData,
		messageHistory,
		// actions
		connect,
		disconnect,
		clearEventLog,
	};
}
