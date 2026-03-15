<script setup lang="ts">
	const screenshots: { image: string; text: string }[] = [
		{
			image: "/images/homepage/homepage-empire.png",
			text: "Empire: Track production, supply chains, and growth across all your planets.",
		},
		{
			image: "/images/homepage/homepage-plan.png",
			text: "Plan: Strategize and analyze without spending in-game resources.",
		},
		{
			image: "/images/homepage/homepage-management.png",
			text: "Management: Coordinate plans, expansions, and your next moves effortlessly.",
		},
		{
			image: "/images/homepage/homepage-exchanges.png",
			text: "Exchanges: Optimize in-game pricing and trading strategies.",
		},
		{
			image: "/images/homepage/homepage-market-exploration.png",
			text: "Exploration: Analyze years of market data for smarter insights.",
		},
		{
			image: "/images/homepage/homepage-planet-search.png",
			text: "Search: Find the exact planets and resources you need instantly.",
		},
	];
</script>

<template>
	<div class="mx-auto w-full max-w-7xl pb-5 md:px-10 lg:px-0">
		<div class="lg:mb-10">
			<h1
				class="bg-linear-to-b bg-clip-text pb-4 text-7xl font-extrabold leading-tight text-transparent from-white/50 to-white">
				Plan your empire. <br />
				Rule Prosperous Universe.
			</h1>
			<p class="text-xl text-white/60 font-mono">
				Say goodbye to cumbersome spreadsheets and hello to seamless
				management of your in-game assets.
			</p>
		</div>

		<h1 class="pb-4 text-4xl tracking-tight text-white text-center mt-30">
			Powerful Features, Free For Everyone
		</h1>
		<p class="text-white/60 text-center text-xl mb-10">
			Streamline your planning and resource management, ensure you stay
			ahead in the galaxy.
		</p>

		<div
			class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 bg-white/20 gap-px child:p-10 child:hover:bg-linear-315 child:from-white/10 child:to-transparent mb-20">
			<div class="bg-black">
				<div class="flex flex-col">
					<div class="text-white text-2xl font-bold mb-2">
						Base Simulation
					</div>
					<div class="text-white/60 text-lg font-mono">
						PRUNplanner lets you design and try new bases without
						spending in-game resources. It mirrors all aspects of a
						base, from habitation and production buildings to COGC
						programs and planet resources.
					</div>
				</div>
			</div>
			<div class="bg-black">
				<div class="flex flex-col">
					<div class="text-white text-2xl font-bold mb-2">
						Empire Planning
					</div>
					<div class="text-white/60 text-lg font-mono">
						Effortlessly organize and manage your entire empire.
						With PRUNplanner, you can plan across multiple bases and
						complex supply chains, ensuring your material flows
						remain on schedule and your empire runs smoothly.
					</div>
				</div>
			</div>
			<div class="bg-black">
				<div class="flex flex-col">
					<div class="text-white text-2xl font-bold mb-2">
						Game Data
					</div>
					<div class="text-white/60 text-lg font-mono">
						Stay ahead with up-to-date market information integrated
						directly from the game's community API (FIO). Make
						informed planning and expansion decisions based on
						actual markets and the best ROI.
					</div>
				</div>
			</div>
			<div class="bg-black">
				<div class="flex flex-col">
					<div class="text-white text-2xl font-bold mb-2">
						Burn & Repair
					</div>
					<div class="text-white/60 text-lg font-mono">
						Prevent shortages and bottlenecks with detailed
						management tools. PRUNplanner tracks your resources and
						consumables, ensuring you have everything you need right
						when you need it, keeping your operations seamless.
					</div>
				</div>
			</div>
			<div class="bg-black">
				<div class="flex flex-col">
					<div class="text-white text-2xl font-bold mb-2">
						Market Exploration
					</div>
					<div class="text-white/60 text-lg font-mono">
						Explore historic market trends from past years and
						uncover how markets truly behave. Spot exciting
						opportunities, and effortlessly calculate Return on
						Investment for every recipe and resource — giving you
						the strategic edge you need for smarter planning.
					</div>
				</div>
			</div>
			<div class="bg-black">
				<div class="flex flex-col">
					<div class="text-white text-2xl font-bold mb-2">
						A Wealth of Additional Tools
					</div>
					<div class="text-white/60 text-lg font-mono">
						Explore material prices from now to years past, know the
						optimal times for repairing production buildings,
						monitor expert spawn times, and optimize habitation
						buildings for minimal area or cost. PRUNplanner offers
						these features and many more.
					</div>
				</div>
			</div>
		</div>

		<div>
			<h1
				class="pb-4 text-4xl tracking-tight text-white text-center mt-30">
				Command Your Empire from Anywhere
			</h1>
			<p class="text-white/60 text-center text-xl mb-10">
				Monitor bases, manage production, and control your plans
				effortlessly. With intuitive, powerful tools, you can
				strategize, expand, and outsmart your rivals wherever you are.
			</p>
			<div class="grid grid-cols-1 xl:grid-cols-3 gap-3">
				<div
					v-for="(screenshot, index) in screenshots"
					:key="screenshot.image"
					:class="[index >= 3 ? 'hidden xl:block' : '']">
					<img :src="screenshot.image" :alt="screenshot.text" />
					<div class="text-center font-mono text-white/60 px-2">
						{{ screenshot.text }}
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto w-full max-w-7xl px-5 md:px-10 lg:px-0">
		<h1 class="pb-4 text-4xl tracking-tight text-white text-center mt-30">
			Core Concepts
		</h1>
		<p class="text-white/60 text-center text-xl mb-10">
			PRUNplanner consists of three main components that allow you to plan
			and manage your Prosperous Universe empire.
		</p>
		<div
			class="grid grid-cols-1 lg:grid-cols-3 divide-x divide-white/20 child:p-10 mb-10">
			<div>
				<div class="text-white text-2xl font-bold mb-2">Plans</div>
				<div class="text-lg font-mono text-white/60">
					Plans are the backbone of what you do in PRUNplanner. They
					consist of all buildings, productions and bonuses of a base
					you can put down in Prosperous Universe. You can create new
					plans by searching for the planet you would like to create a
					base for. Also, a plan should be assigned a CX Exchange
					preference, as well as be assigned to an Empire.
				</div>
			</div>
			<div>
				<div class="text-white text-2xl font-bold mb-2">Empires</div>
				<div class="text-lg font-mono text-white/60">
					An Empire is a collection of plans (e.g. all the bases you
					currently have settled in Prosperous Universe, or that you
					would like to settle, all interconnected together). Each
					empire is like a container that consists of multiple plans.
					Additionally, an exchange preference can be assigned to each
					Empire.
				</div>
			</div>
			<div class="">
				<div class="text-white text-2xl font-bold mb-2">Exchanges</div>
				<div class="text-lg font-mono text-white/60">
					The Exchange Settings allow you to define market preferences
					for the pricing of materials. Each preference can be used in
					multiple Empires. However, each Empire can only have a
					single Exchange preference assigned to it. This ensures that
					prices are properly calculated for all individual plans that
					are part of the Empire.
				</div>
			</div>
		</div>
	</div>
	<div>
		<h1 class="pb-4 text-4xl tracking-tight text-white text-center mt-20">
			Powered by tools we love to use
		</h1>
		<div class="flex flex-row items-center justify-center pt-3 gap-10">
			<a href="https://posthog.com/" target="_blank">
				<img
					src="/images/homepage/posthog-logo-white@2x.png"
					class="h-7.5" />
			</a>
		</div>
	</div>
	<h1 class="pb-4 text-4xl tracking-tight text-white text-center mt-30">
		Free &amp; Open Source
	</h1>
	<p class="text-white/60 text-center text-xl mb-5">
		PRUNplanner is completely free to use, and its frontend is fully
		<a
			href="https://github.com/PRUNplanner/frontend"
			target="_blank"
			class="underline"
			>Open Source</a
		>.
		<br />
		Love it? We'd be thrilled if you contributed!
	</p>
	<p class="text-white/60 text-center font-mono">
		Made with &hearts; in Munich, with contributions from around the world.
	</p>
</template>
