<script setup lang="ts">
	// UI
	import { PIcon } from "@/ui";
	import { HourglassEmptySharp } from "@vicons/material";
</script>

<template>
	<div class="relative w-full h-full">
		<div class="absolute inset-0 flex items-center justify-center">
			<!-- the tables' empty state look -->
			<div class="flex flex-col items-center text-[14px]">
				<PIcon :size="40" class="text-white/38">
					<HourglassEmptySharp />
				</PIcon>
				<div class="mt-2 text-muted">Feature Not Yet Implemented</div>
				<div class="mt-3 text-center text-white/82">
					<div>
						PRUNplanner v2 is Open Source. Check out the
						<a
							href="https://github.com/PRUNplanner/frontend"
							target="_blank"
							class="text-link-primary hover:underline">
							Github repository</a
						>.
					</div>
					<div>
						Get in touch on the
						<a
							href="https://discord.gg/2MDR5DYSfY"
							target="_blank"
							class="text-link-primary hover:underline"
							>PrUn Community Tools Discord</a
						>.
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
