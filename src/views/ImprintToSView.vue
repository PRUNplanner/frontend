<script setup lang="ts"></script>

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
					personal ingame Prosperous Universe data. All account and
					login information is hashed and stored only in the
					PRUNplanner database. Administrators have no way of
					decrypting your passwords. PRUNplanner does not take
					responsibility for the correctness or completeness of data
					and information it provides.
				</p>
				<h3 class="text-lg py-3">Information Storage</h3>
				<p class="pb-3">
					PRUNplanner stores information in your browsers LocalStorage
					(gamedata, backend responses, your analytics choice) as well
					as SessionStorage (authentication information) and
					IndexedDB. PRUNplanner does not use any cookies. Only after
					you have consented to usage analytics, PostHog stores an
					identifier and session information in your browsers
					LocalStorage and SessionStorage; it sets no cookies either.
				</p>
				<h3 class="text-lg py-3">3rd-Party Interactions</h3>
				<p>
					PRUNplanner communicates with FIO to retrieve relevant game
					data and, if chosen, also fetches your Prosperous Universe
					storage data. The connection with FIO is done through the
					API Key you provide which itself is stored in the
					PRUNplanner database.
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
					marketing or profiling purposes.
					If a request to our server fails or returns data the app
					cannot read, your browser reports this to our server, which
					adds it to these logs: the kind of error, the API address
					with ids removed, the HTTP status, timings, the app version,
					and random request and session ids that link the report to
					the matching server log entries. Nothing you entered is
					included.
				</p>
				<p id="analytics" class="py-3">
					PRUNplanner uses PostHog, a EU-hosted analytics tool, to
					better understand how users interact with our Service.
					PostHog is only loaded after you have given your consent
					(Art. 6 (1) a GDPR, § 25 (1) TDDDG), which you are asked for
					once after logging in. With your
					consent we collect usage events (pages visited, clicks,
					navigation flows and actions in the tool), error reports
					and performance metrics, session recordings of a sample of
					visits (everything you type is masked) and your answers to
					optional in-app surveys. This data is linked to your
					account id and is used to improve usability, fix bugs and
					analyze feature adoption. Consent is voluntary. You can
					withdraw it at any time in your Profile under Usage
					analytics, which stops the collection and removes the
					PostHog data stored in your browser. If your browser sends
					a Do-Not-Track or Global Privacy Control signal, PostHog is
					never loaded and you are not asked.
					With your consent, the session id PostHog assigns is also
					sent with requests to our server and appears in its logs, so
					an error can be matched to its session recording.
				</p>
				<p class="py-3">
					In the event that you opt to provide your email address for
					heightened account security, it is imperative to acknowledge
					that PRUNplanner utilizes Mailjet for the facilitation of
					all email communications, whether for verification or
					password reset functionalities. The privacy policy outlined
					in https://www.mailjet.com/legal/privacy-policy/ is
					applicable, and your agreement to all stipulated terms is
					hereby expressly implied.
				</p>
				<h3 class="text-lg py-3">Security & User Rights</h3>
				<p class="pb-3">
					PRUNplanner only stores your login / account information
					containing your encrypted password. If you want to be
					deleted from PRUNplanner please reach out on Discord. This
					document may change. Please check it periodically to stay
					up-to-date about changes.
				</p>
			</div>
		</div>
	</div>
</template>
