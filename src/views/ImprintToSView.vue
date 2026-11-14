<script setup lang="ts">
	import { useI18n } from "vue-i18n";
	import { useHead } from "@unhead/vue";

	const { t } = useI18n();
	useHead({
		title: t("homepage.seo.imprint_title"),
		meta: [
			{
				name: "description",
				content: t("homepage.seo.imprint_description"),
			},
		],
	});
</script>

<template>
	<div class="px-6 py-3">
		<h1 class="text-2xl font-bold my-auto">Imprint & Terms of Service</h1>

		<div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
			<div>
				<h2 class="text-lg font-bold py-3">Imprint</h2>

				<p class="pb-3">
					This website was created by: Jan Placht Horemansstr. 1 80636
					Munich Germany Phone: +49 15140507844 Mail: jplacht at gmail
					dot com
				</p>
				<h3 class="text-lg pb-3">Accountability for content</h3>
				<p>
					The contents of our pages have been created with the utmost
					care. However, we cannot guarantee the contents accuracy,
					completeness or topicality. According to statutory
					provisions, we are furthermore responsible for our own
					content on these web pages. In this context, please note
					that we are accordingly not obliged to monitor merely the
					transmitted or saved information of third parties, or
					investigate circumstances pointing to illegal activity. Our
					obligations to remove or block the use of information under
					generally applicable laws remain unaffected by this as per
					§§ 8 to 10 of the Telemedia Act (TMG).
				</p>
				<h3 class="text-lg py-3">Accountability for links</h3>
				<p>
					Responsibility for the content of external links (to web
					pages of third parties) lies solely with the operators of
					the linked pages. No violations were evident to us at the
					time of linking. Should any legal infringement become known
					to us, we will remove the respective link immediately.
				</p>
				<h3 class="text-lg py-3">Copyright</h3>
				<p class="pb-3">
					Our web pages and their contents are subject to German
					copyright law. Unless expressly permitted by law (§ 44a et
					seq. of the copyright law), every form of utilizing,
					reproducing or processing works subject to copyright
					protection on our web pages requires the prior consent of
					the respective owner of the rights. Individual reproductions
					of a work are allowed only for private use, so must not
					serve either directly or indirectly for earnings.
					Unauthorized utilization of copyrighted works is punishable
					(§ 106 of the copyright law).
				</p>
				<p>
					Prosperous Universe is created and copyrighted by Simulogics
					GmbH. The FIO service is copyrighted by its respective
					creators.
				</p>
			</div>
			<div>
				<h2 class="text-lg font-bold py-3">Terms of Service</h2>
				<p>
					This document describes how PRUNplanner handles your data.
					PRUNplanner is designed to collect only required information
					from you to provide login and authentication and aims to not
					store additional PII. Your username can be freely chosen
					without any link to your real name or identity. PRUNplanner
					requires registration and authentication to store your
					Prosperous Universe empire and base planning. Additionally
					you may choose to integrate FIO data that will contain your
					personal ingame Prosperous Universe data. Your account
					information is stored in the PRUNplanner database. Your
					password is stored only as a one-way hash, so administrators
					cannot read it. PRUNplanner does not take responsibility for
					the correctness or completeness of data and information it
					provides.
				</p>
				<h3 class="text-lg py-3">Information Storage</h3>
				<p class="pb-3">
					PRUNplanner runs on our own server at Hetzner Online GmbH in
					Falkenstein, Germany, which serves both the website and the
					API. Your account and planning data are stored in Germany.
					PRUNplanner stores information in your browsers LocalStorage
					(gamedata, backend responses, your analytics choice) as well
					as SessionStorage (authentication information) and
					IndexedDB. PRUNplanner does not use any cookies, and
					Cloudflare, which delivers our website and API (see below),
					sets none on our site either. Only after you have consented
					to usage analytics, PostHog stores an identifier and session
					information in your browsers LocalStorage and
					SessionStorage; it sets no cookies either.
				</p>
				<h3 class="text-lg py-3">3rd-Party Interactions</h3>
				<p>
					PRUNplanner communicates with FIO to retrieve relevant game
					data and, if chosen, also fetches your Prosperous Universe
					storage data. The connection with FIO is done through the
					API Key you provide which itself is stored in the
					PRUNplanner database.
				</p>
				<p class="pt-3">
					Our server is hosted by Hetzner Online GmbH, Germany, in its
					data centre in Falkenstein. Hetzner provides the server and
					its network connection and so processes the data stored on
					and sent to our server, including IP addresses, on our
					behalf. Hetzner's privacy policy applies:
					https://www.hetzner.com/legal/privacy-policy
				</p>
				<p class="pt-3">
					Our website and API are delivered through the network of
					Cloudflare, Inc. (USA). Cloudflare works as a reverse proxy
					and content delivery network: it handles DNS and the
					encrypted (HTTPS) connection, keeps copies of the website's
					files (HTML, JavaScript, CSS, images) at locations near you
					so pages load faster, and protects PRUNplanner against
					attacks. To do this, Cloudflare processes your IP address
					and the technical data of each request, such as the
					requested address (URL), the time, your browser's user agent
					and the request headers. We use Cloudflare for the secure
					and fast delivery of our service, which is our legitimate
					interest (Art. 6 (1) f GDPR). Cloudflare, Inc. is certified
					under the EU-U.S. Data Privacy Framework, and Standard
					Contractual Clauses are part of Cloudflare's Data Processing
					Addendum. We do not use Cloudflare Web Analytics.
					Cloudflare's responses also ask your browser to report
					failed connections to our site, never successful ones, to
					Cloudflare. Cloudflare's privacy policy applies:
					https://www.cloudflare.com/privacypolicy/
				</p>
				<p class="py-3">
					To ensure the technical stability and security of our
					platform, we utilize Axiom, a cloud-based logging and
					analytics service. Axiom is used to collect and store system
					logs and performance metrics, which may include technical
					identifiers such as IP addresses, browser types, and request
					timestamps. This data is processed solely for the purposes
					of debugging, monitoring service health, and preventing
					unauthorized access. This information is not used for
					marketing or profiling purposes. If a request to our server
					fails or returns data the app cannot read, your browser
					reports this to our server, which adds it to these logs: the
					kind of error, the API address with ids removed, the HTTP
					status, timings, the app version, and random request and
					session ids that link the report to the matching server log
					entries. Nothing you entered is included.
				</p>
				<p id="analytics" class="py-3">
					PRUNplanner uses PostHog, a EU-hosted analytics tool, to
					better understand how users interact with our Service.
					PostHog is only loaded after you have given your consent
					(Art. 6 (1) a GDPR, § 25 (1) TDDDG). Visitors without an
					account are asked in a small notice on their first visit;
					logged-in users are asked once after logging in, unless they
					already chose in this browser. With your consent we collect
					usage events (pages visited, clicks, navigation flows and
					actions in the tool), error reports and performance metrics,
					session recordings of a sample of visits (everything you
					type is masked) and your answers to optional in-app surveys.
					Before you log in, this data is not linked to any person;
					only after logging in is it linked to your account id. It is
					used to improve usability, fix bugs and analyze feature
					adoption. Consent is voluntary. You can withdraw it at any
					time, in your Profile under Usage analytics or, while logged
					out, with the Analytics link in the page footer. Either
					stops the collection and removes the PostHog data stored in
					your browser. If your browser sends a Do-Not-Track or Global
					Privacy Control signal, PostHog is never loaded and you are
					not asked. With your consent, the session id PostHog assigns
					is also sent with requests to our server and appears in its
					logs, so an error can be matched to its session recording.
				</p>
				<p class="py-3">
					If you choose to add your email address for extra account
					security, PRUNplanner sends its emails (verification codes,
					password reset codes and a notice when your email address
					changes) through Resend (Resend, Inc., USA). For this,
					Resend receives your email address and the content of the
					email. Resend's privacy policy applies:
					https://resend.com/legal/privacy-policy
				</p>
				<h3 class="text-lg py-3">Security & User Rights</h3>
				<p class="pb-3">
					PRUNplanner stores your account (your username and, if you
					add one, your email address), your password only as a
					one-way hash that cannot be turned back into the password,
					the plans, empires, exchange preferences, settings and API
					keys you create, and, if you add them, your Prosperous
					Universe username, your FIO API key and the game data FIO
					returns for it. Your browser's connection to PRUNplanner is
					encrypted (HTTPS). You have the right to ask which of your
					data we hold, to have it corrected or deleted, to restrict
					or object to its processing, to receive it in a portable
					format, and to complain to a data protection supervisory
					authority. To use these rights or to have your account
					deleted, reach out on Discord
					(https://discord.gg/2MDR5DYSfY) or by mail (see Imprint).
					Deleting your account also deletes your plans, empires and
					all other data stored with it in the PRUNplanner database.
					This document may change. Please check it periodically to
					stay up-to-date about changes.
				</p>
			</div>
		</div>
	</div>
</template>
