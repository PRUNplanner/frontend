<script setup lang="ts">
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { copyToClipboard } from "@/util/data";
	import {
		MCP_BUNDLE_URL,
		MCP_SERVER_URL,
	} from "@/features/api_keys/apiEndpoints";

	// UI
	import { PButton, useToast } from "@/ui";
	import { ContentCopySharp } from "@vicons/material";

	/**
	 * How to connect an AI assistant to the MCP server; the setup per
	 * client lives in the `mcp` help article
	 *
	 * @author jplacht
	 */
	const toast = useToast();

	async function copyURL(): Promise<void> {
		if (!(await copyToClipboard(MCP_SERVER_URL))) return;
		toast(t("api_keys.mcp.copied"));
		trackEvent("apikey:mcp_url_copy");
	}
</script>

<template>
	<section
		class="bg-white/5 border border-dark-gray border-dashed rounded flex flex-col gap-3 p-3"
		data-testid="mcp-card">
		<h2 class="text-lg font-bold">{{ $t("api_keys.mcp.title") }}</h2>
		<p>{{ $t("api_keys.mcp.description") }}</p>
		<div>
			<span class="text-xs text-prunplanner block mb-1">
				{{ $t("api_keys.mcp.server_url") }}
			</span>
			<div class="flex flex-row gap-2 items-center">
				<code
					class="text-xs text-white/80 bg-gray-dark p-2 rounded border border-white/10 grow min-w-0 break-all"
					data-testid="mcp-url">
					{{ MCP_SERVER_URL }}
				</code>
				<PButton
					type="secondary"
					:aria-label="$t('api_keys.mcp.copy_url')"
					data-testid="mcp-copy"
					@click="copyURL">
					<template #icon><ContentCopySharp /></template>
				</PButton>
			</div>
		</div>
		<div>
			<span class="text-xs text-prunplanner block mb-1">
				{{ $t("api_keys.mcp.header") }}
			</span>
			<code
				class="text-xs text-white/80 bg-gray-dark p-2 rounded block border border-white/10 break-all">
				Authorization: Api-Key &lt;YOUR_KEY&gt;
			</code>
		</div>
		<p class="text-sm text-white/80">{{ $t("api_keys.mcp.keys") }}</p>
		<div class="flex flex-row flex-wrap gap-x-6 gap-y-2">
			<a
				:href="MCP_BUNDLE_URL"
				class="font-bold underline hover:text-prunplanner"
				data-testid="mcp-download"
				@click="trackEvent('apikey:mcpb_download')">
				{{ $t("api_keys.mcp.download") }}
			</a>
			<RouterLink
				to="/help/mcp"
				class="font-bold underline hover:text-prunplanner"
				data-testid="mcp-help">
				{{ $t("api_keys.mcp.setup_link") }}
			</RouterLink>
		</div>
	</section>
</template>
