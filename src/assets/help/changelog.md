# 2026-10-02 - v. 0.31.1

- **Plan suggestions**: the building and recipe pickers show what is most often planned on the planet, and a new plan can start from the planet's typical setup (one Undo takes it back). Turn it off with the "Plan suggestions" setting [[PR-545]](https://github.com/PRUNplanner/frontend/pull/545), [[PR-546]](https://github.com/PRUNplanner/frontend/pull/546)
- **Construction cart**: enter how many buildings already stand on the planet, with or without FIO, and the cart shows only what is left to build [[PR-541]](https://github.com/PRUNplanner/frontend/pull/541)
- **FIO**: wrong keys or usernames are explained when you save them, and the navigation shows your FIO status [[PR-542]](https://github.com/PRUNplanner/frontend/pull/542)
- **Plan editor**: construction cost covers all buildings of a row, and the supply cart accepts decimal days [[PR-540]](https://github.com/PRUNplanner/frontend/pull/540), [[PR-539]](https://github.com/PRUNplanner/frontend/pull/539)
- **Fixes and under the hood**: faster loading, more reliable syncing and caching, text fixes and new community translations [[PR-543]](https://github.com/PRUNplanner/frontend/pull/543), [[PR-552]](https://github.com/PRUNplanner/frontend/pull/552), [[PR-553]](https://github.com/PRUNplanner/frontend/pull/553), [[PR-555]](https://github.com/PRUNplanner/frontend/pull/555), [[PR-558]](https://github.com/PRUNplanner/frontend/pull/558)

# 2026-10-01 - v. 0.31.0

The headline of this release is the completely rebuilt **Planet Search**, together with a broad pass over the whole UI to make PRUNplanner clearer, faster and easier to use. A big thank you to [lumivient](https://github.com/lumivient) for their pull request in this release!

- **New Planet Search**: one live page where results update as you filter, with no Search button. Filter by name or ID, by any number of materials (match any or all, with a minimum per day), planet type, fertility, extra building materials, active COGC, infrastructure, and jumps to exchanges or to your own plans. Switch between a List and a Matrix view, pick columns and sort by several keys, compare planets side by side, save your searches, and share a search as a link. "+" starts a new plan on a planet in a new tab [[PR-523]](https://github.com/PRUNplanner/frontend/pull/523), [[PR-525]](https://github.com/PRUNplanner/frontend/pull/525)
- **Plan editor**: Save is now the one main action and always shows the plan's state (saved, unsaved, saving, failed with retry). Ctrl/Cmd+S saves, and every edit can be undone and redone (Ctrl/Cmd+Z), with an Undo toast after deleting a building or recipe. Less-used actions moved into a More menu, the tools into tabs, and edits made while saving are no longer lost [[PR-517]](https://github.com/PRUNplanner/frontend/pull/517), [[PR-535]](https://github.com/PRUNplanner/frontend/pull/535)
- **Shared plans** are now a proper read-only view with a banner, and a Clone or Sign up action. Expired sessions and dead share links no longer break the page, and logging in keeps you on the plan [[PR-530]](https://github.com/PRUNplanner/frontend/pull/530)
- **Empire**: onboarding for new players, empty states, readable analysis charts (sorted bars instead of pie charts), a compact material I/O with a per-planet breakdown, and improved cost overview stats [[PR-510]](https://github.com/PRUNplanner/frontend/pull/510), [[PR-516]](https://github.com/PRUNplanner/frontend/pull/516), [[PR-519]](https://github.com/PRUNplanner/frontend/pull/519), [[PR-479]](https://github.com/PRUNplanner/frontend/pull/479)
- **Management**: one save bar for all CX and plan assignment changes with a warning before leaving unsaved, and a much faster plan ↔ empire matrix without pagination [[PR-518]](https://github.com/PRUNplanner/frontend/pull/518)
- **Look and feel**: better contrast, consistent number tables, a colour-blind friendly option, accessibility fixes, layouts that work on small screens, loading screens only when loading actually takes time, and a new landing page [[PR-509]](https://github.com/PRUNplanner/frontend/pull/509), [[PR-512]](https://github.com/PRUNplanner/frontend/pull/512), [[PR-513]](https://github.com/PRUNplanner/frontend/pull/513), [[PR-514]](https://github.com/PRUNplanner/frontend/pull/514), [[PR-515]](https://github.com/PRUNplanner/frontend/pull/515), [[PR-536]](https://github.com/PRUNplanner/frontend/pull/536)
- **Fixes**: the profit curve per building (wear is charged once), the recipe selector staying inside the screen, data of a previous login showing after switching accounts, failed requests cached as empty data, and asking twice before leaving with unsaved changes [[PR-522]](https://github.com/PRUNplanner/frontend/pull/522), [[PR-521]](https://github.com/PRUNplanner/frontend/pull/521), [[PR-500]](https://github.com/PRUNplanner/frontend/pull/500), [[PR-499]](https://github.com/PRUNplanner/frontend/pull/499), [[PR-526]](https://github.com/PRUNplanner/frontend/pull/526)
- **Under the hood**: faster loading through browser caching and batched requests, an analytics consent dialog with privacy fixes, error tracking, and many new community translations

# 2026-09-27 - v. 0.30.0

A big thank you to our community contributors [lumivient](https://github.com/lumivient), [lilbit-prun](https://github.com/lilbit-prun) and [theit8514](https://github.com/theit8514) for their pull requests in this release!

- Adds 7D/30D market share to the CX overview for plans, empires, the ROI Overview and the material overview [[PR-475]](https://github.com/PRUNplanner/frontend/pull/475)
- Improves CX tooltip positioning, and the whole material tile now opens the CX overview [[PR-475]](https://github.com/PRUNplanner/frontend/pull/475)
- The construction cart's material table footer and XIT button now use the Need column [[PR-471]](https://github.com/PRUNplanner/frontend/pull/471)
- Remembers the supply cart days [[PR-474]](https://github.com/PRUNplanner/frontend/pull/474)
- Shared plans are no longer auto-optimized [[PR-466]](https://github.com/PRUNplanner/frontend/pull/466)
- Fixes the storage filling calculation in visitation frequency [[PR-465]](https://github.com/PRUNplanner/frontend/pull/465)
- Fixes the +/- buttons on empty number inputs producing NaN [[PR-471]](https://github.com/PRUNplanner/frontend/pull/471)
- Fixes the save button staying marked as modified after reloading a plan [[PR-470]](https://github.com/PRUNplanner/frontend/pull/470)
- Plan calculations now run on a faster, synchronous engine, which speeds up the Empire, Manage and ROI views [[PR-488]](https://github.com/PRUNplanner/frontend/pull/488), [[PR-487]](https://github.com/PRUNplanner/frontend/pull/487)
- Fixes several spinners and error states that got stuck when a request failed, such as saving a CX, deleting a plan, empire or CX, sharing, and burn and upkeep calculations [[PR-485]](https://github.com/PRUNplanner/frontend/pull/485), [[PR-489]](https://github.com/PRUNplanner/frontend/pull/489), [[PR-491]](https://github.com/PRUNplanner/frontend/pull/491), [[PR-492]](https://github.com/PRUNplanner/frontend/pull/492)
- Fixes FIO errors in the construction cart when ship or site fields are missing, and only preselects planet storage that exists [[PR-480]](https://github.com/PRUNplanner/frontend/pull/480), [[PR-486]](https://github.com/PRUNplanner/frontend/pull/486)
- Rejects CSV imports that aren't a valid CX preference export [[PR-489]](https://github.com/PRUNplanner/frontend/pull/489)
- Translates the POPR modal, share modal and help error texts, and adds new community translations [[PR-491]](https://github.com/PRUNplanner/frontend/pull/491), [[PR-469]](https://github.com/PRUNplanner/frontend/pull/469), [[PR-493]](https://github.com/PRUNplanner/frontend/pull/493)
- Stability and testing: a large test suite covering components, backend contracts and calculation snapshots, plus dependency upgrades and security fixes [[PR-464]](https://github.com/PRUNplanner/frontend/pull/464), [[PR-473]](https://github.com/PRUNplanner/frontend/pull/473), [[PR-480]](https://github.com/PRUNplanner/frontend/pull/480), [[PR-481]](https://github.com/PRUNplanner/frontend/pull/481), [[PR-482]](https://github.com/PRUNplanner/frontend/pull/482), [[PR-486]](https://github.com/PRUNplanner/frontend/pull/486), [[PR-489]](https://github.com/PRUNplanner/frontend/pull/489), [[PR-491]](https://github.com/PRUNplanner/frontend/pull/491)

# 2026-05-18 - v. 0.29.0

This release is fully dedicated to bringing localization and community translation support to PRUNplanner. Both the user interface and help pages have been refactored to seamlessly integrate with [Crowdin](https://crowdin.com/project/prunplanner), and the community has already stepped up to deliver complete UI translations for German, Russian, and Chinese. A massive thank you to everyone who contributed to making this milestone possible! If you want to see PRUNplanner in your native language or help refine our existing strings, head over to the [Translations Project](https://crowdin.com/project/prunplanner) and join the effort.

Additional changes:

- The Exchange popup on the recipe selector was deactivated [[PR-462]](https://github.com/PRUNplanner/frontend/pull/462)
- Recipe selector ROI column sorting was fixed [[PR-430]](https://github.com/PRUNplanner/frontend/pull/430)

# 2026-04-29 - v. 0.28.0

- Implements the "API Keys" view to manage PRUNplanner API keys from the UI [[PR-408]](https://github.com/PRUNplanner/frontend/pull/408)
- Changes the plans production building layout to be more condensed [[PR-409]](https://github.com/PRUNplanner/frontend/pull/409), [[PR-414]](https://github.com/PRUNplanner/frontend/pull/414)
- Calculate CX distances in Resource ROI view [[PR-410]](https://github.com/PRUNplanner/frontend/pull/411)
- Adds Day, Week, Month options to Market Exploration OHLC chart [[PR-415]](https://github.com/PRUNplanner/frontend/pull/415)
- Fixes the issue where construction cart would show false-positive FIO warnings [[PR-413]](https://github.com/PRUNplanner/frontend/pull/413)
- Removes output profit and profit / area from Resource ROI [[PR-416]](https://github.com/PRUNplanner/frontend/pull/416)

# 2026-04-19 - v. 0.27.0

- Show Production Opportunities on Empire View for materials with positive Delta [[PR-400]](https://github.com/PRUNplanner/frontend/pull/400), [[PR-402]](https://github.com/PRUNplanner/frontend/pull/402)
- New "Planning Insights" showing players how planets are usually settled [[PR-401]](https://github.com/PRUNplanner/frontend/pull/401)
- Notify user on empire permit used / plan total permit mismatch [[PR-403]](https://github.com/PRUNplanner/frontend/pull/403)
- Fix Market Live labels for Lowest Sell and Lowest Buy Price [[PR-399]](https://github.com/PRUNplanner/frontend/pull/399)
- XIT Actions in Construction Cart always use total needed materials, not including stock [[PR-406]](https://github.com/PRUNplanner/frontend/pull/406)
- Various UI improvements: Removed unused classes, fixed plan outside paddings, auto-fetch on material change in market exploration, ROI view multi-select filtering, fixed recipe selector title capitalization, added additional text in plans to better indicate buttons/inputs, added tooltip if COGM calculation is not available [[PR-404]](https://github.com/PRUNplanner/frontend/pull/404)

# 2026-04-12 - v. 0.26.0

- Added habitation deficit highlight [[PR-390]](https://github.com/PRUNplanner/frontend/pull/390)
- Show warning when base has unplanned buildings [[PR-391]](https://github.com/PRUNplanner/frontend/pull/391)
- Fix missing chart controller on profit curve [[PR-393]](https://github.com/PRUNplanner/frontend/pull/393)
- Implemented "Market Live" view, implements SSE CX data stream from FIO API webhook and alert logic [[PR-395]](https://github.com/PRUNplanner/frontend/pull/395)

# 2026-04-01 - v. 0.25.1

- Improve Market Exploration chart to display no-trade gaps [[PR-385]](https://github.com/PRUNplanner/frontend/pull/385)
- Fixes a Verification Code issue were the url did not populate the input but failed rendering the view [[PR-387]](https://github.com/PRUNplanner/frontend/pull/387)

# 2026-03-27 - v. 0.25.0

- Plan Workforce now show luxury material tickers [[PR-373]](https://github.com/PRUNplanner/frontend/pull/373)
- Market Exploration now shows more information, standard insights for all materials and has better exploration capabilities [[PR-382]](https://github.com/PRUNplanner/frontend/pull/382)
- Shows profitable plans in Empire Analysis as treemap per COGC [[PR-378]](https://github.com/PRUNplanner/frontend/pull/378)
- Replaces Dollar currency sign with generic currency [[PR-376]](https://github.com/PRUNplanner/frontend/pull/376)
- Switch from `Highcharts` to `Chart.js` [[PR-372]](https://github.com/PRUNplanner/frontend/pull/372)
- Enhances CX Preference and tooltip UI components [[PR-381]](https://github.com/PRUNplanner/frontend/pull/381)
- Prevent app crashes due to preference update promises on XIT actions [[PR-377]](https://github.com/PRUNplanner/frontend/pull/377)
- Reintegrate the "active recipe" indicator on buildings recipe selection [[PR-375]](https://github.com/PRUNplanner/frontend/pull/375)
- Fixes an error where planet exchange preferences were not correctly updated [[PR-379]](https://github.com/PRUNplanner/frontend/pull/379)
- Package upgrades [[PR-383]](https://github.com/PRUNplanner/frontend/pull/383), [[PR-380]](https://github.com/PRUNplanner/frontend/pull/380)
- Update Terms of Service, remove unused services [[PR-374]](https://github.com/PRUNplanner/frontend/pull/374)

# 2026-03-14 - v. 0.24.6

- Fixes a following issue where users were not always able to select another empire on FIO Burn and have their material I/O recalculated [[PR-368]](https://github.com/PRUNplanner/frontend/pull/368)

# 2026-03-14 - v. 0.24.5

- Fixes an issue where no reload was triggered after switching the empire [[PR-367]](https://github.com/PRUNplanner/frontend/pull/367)

# 2026-03-12 - v. 0.24.4

- Improves material exchange overlay with additional information [[PR-363]](https://github.com/PRUNplanner/frontend/pull/363)
- Fixes an issue where logged-in users were not able to clone a shared plan [[PR-362]](https://github.com/PRUNplanner/frontend/pull/362)
- Fixes UI issues with Tags and Multi-Select filters [[PR-361]](https://github.com/PRUNplanner/frontend/pull/361)
- Empire Material I/O and their plans individual Material I/O are patched to the backend incl. metadata [[PR-364]](https://github.com/PRUNplanner/frontend/pull/365)
- Various package and security updates [[PR-365]](https://github.com/PRUNplanner/frontend/pull/365)

# 2026-03-09 - v. 0.24.3

- Fixes a bug that lead to continuous calls to fetch preferences when it is not needed [[PR-358]](https://github.com/PRUNplanner/frontend/pull/358)
- Improves Select and Multiselect input elements [[PR-355]](https://github.com/PRUNplanner/frontend/pull/355)
- Allow decimal inputs on input fields [[PR-349]](https://github.com/PRUNplanner/frontend/pull/349)

# 2026-03-08 - v. 0.24.2

- Brings back ASK/BID selections as CX preferences, also enhances material tiles overlay to display more information [[PR-356]](https://github.com/PRUNplanner/frontend/pull/356)

# 2026-03-07 - v. 0.24.1

- Version 0.24 introduces a complete backend overhaul, integrating updated endpoints and open-sourcing the codebase on [GitHub](https://github.com/PRUNplanner/backend) for the first time. While core logic remains consistent, all material price calculations now utilize a Volume-Weighted Average Price (VWAP) to provide a more stable "fair market value" for long-term planning.
- Legacy API keys have been removed in favor of a streamlined single-key system (currently in testing), which will eventually provide full PRUNplanner functionality through a simplified authentication process.
- Fixes a bug where scientists consumption of WS was wrongly doubled [[PR-352]](https://github.com/PRUNplanner/frontend/pull/352)
- Sorts empire and management tables by name as default [[PR-353]](https://github.com/PRUNplanner/frontend/pull/353)

# 2026-03-01 - v. 0.23.0

- Adds new storage buildings (STA, STE, STV, STW) to planning [[PR-346]](https://github.com/PRUNplanner/frontend/pull/346)
- Adds Government Upkeep Price Calculator Tool [[PR-339]](https://github.com/PRUNplanner/frontend/pull/339)
- Fixes planet search to sort ∞ distance planets last in ascending order [[PR-345]](https://github.com/PRUNplanner/frontend/pull/345)

# 2026-01-29 - v. 0.22.1

- Adds horizontal scroll in construction carts [[PR-333]](https://github.com/PRUNplanner/frontend/pull/333)
- Replaces recipe selection static with sortable table [[PR-335]](https://github.com/PRUNplanner/frontend/pull/335)

# 2026-01-22 - v. 0.22.0

- Pathfinding and distance calculations on Planet Search are now done in the frontend instead of backend [[PR-322]](https://github.com/PRUNplanner/frontend/pull/322)
- FIO and how to use it with PRUNplanner now has a proper explanation on the Profile view [[PR-323]](https://github.com/PRUNplanner/frontend/pull/323)
- Negative differences for buildings in construction cart are now highlighted [[PR-324]](https://github.com/PRUNplanner/frontend/pull/324)
- XIT Action now shows price estimates [[PR-327]](https://github.com/PRUNplanner/frontend/pull/327)
- Volume/Weight display in PRUNplanner switched to mirror ingame order [[PR-328]](https://github.com/PRUNplanner/frontend/pull/328)
- Natural Resources can now be origins in Production Chains [[PR-329]](https://github.com/PRUNplanner/frontend/pull/329)
- Plans now have a "Save As" feature [[PR-330]](https://github.com/PRUNplanner/frontend/pull/330)
- Planet Search now has a "Resource Richness" option to easily filter results [[PR-331]](https://github.com/PRUNplanner/frontend/pull/331)

# 2026-01-09 - v. 0.21.1

- Fixes an issue with the construction cart when FIO is not enabled [[PR-320]](https://github.com/PRUNplanner/frontend/pull/320)

# 2026-01-09 - v. 0.21.0

- Already constructed buildings from FIO are shown in Construction Cart [[PR-309]](https://github.com/PRUNplanner/frontend/pull/309)
- Import/Export CX preferences functionality with CSV files [[PR-310]](https://github.com/PRUNplanner/frontend/pull/310)
- PRUNplanner now redirects you back to the latest page on login after logout [[#313]](https://github.com/PRUNplanner/frontend/issues/313)
- "Help" button on Plans is now displayed up top [[#291]](https://github.com/PRUNplanner/frontend/issues/291)
- Planet Resource Tiles in plans are now clickable and add building and recipe for extraction [[#238]](https://github.com/PRUNplanner/frontend/issues/238)

# 2025-11-13 - v. 0.20.6

- Default automatic habitation optimization turned off for existing plans [[PR-305]](https://github.com/PRUNplanner/frontend/pull/305)
- Added "Select Production Building(s)" placeholder to Plans [[PR-306]](https://github.com/PRUNplanner/frontend/pull/306)
- Fix: Core Module Area (+25) is now used in profit per area calculations [[PR-307]](https://github.com/PRUNplanner/frontend/pull/307)
- Material Tiles load Traded volumes and display 1d and 7d data [[PR-308]](https://github.com/PRUNplanner/frontend/pull/308)

# 2025-10-26 - v. 0.20.5

- Allow automatic hab-optimization to be turned off before the plan is saved [[PR-298]](https://github.com/PRUNplanner/frontend/pull/298)
- Fix: Password Reset Endpoint URL, injects reset code from email to frontend properly [[#301]](https://github.com/PRUNplanner/frontend/issues/301)
- Removes sending of tracking events to analytics if habs are auto-optimized [[#297]](https://github.com/PRUNplanner/frontend/issues/297)

# 2025-10-22 - v. 0.20.4

- Add Profit/Area calculation for all recipes in selector dropdown based on an optimal setup, also adds metric to plans overview [[PR-290]](https://github.com/PRUNplanner/frontend/pull/290)
- Updated materials and system lists to latest ingame version [[PR-292]](https://github.com/PRUNplanner/frontend/pull/292)
- Improvements to Plan layout, configuration section, save-button and building area [[PR-295]](https://github.com/PRUNplanner/frontend/pull/295)
- Small UI / responsiveness improvements

# 2025-09-25 - v. 0.20.3

- Fix a Bug where Infrastructures or Experts could not be set to 0 [[#277]](https://github.com/PRUNplanner/frontend/pull/277)
- Remove Output Profit from ROI Overview Table [[PR-280]](https://github.com/PRUNplanner/frontend/pull/280)
- Replace more Naive UI with own componenents: Table [[#273]](https://github.com/PRUNplanner/frontend/pull/273), Icons [[#275]](https://github.com/PRUNplanner/frontend/pull/275)
- Add appreciations for PostHog and Highcharts to Homepage [[#274]](https://github.com/PRUNplanner/frontend/pull/274)


# 2025-09-22 - v. 0.20.2

- Separate app and database versioning to improve behavior during new releases [[#263]](https://github.com/PRUNplanner/frontend/issues/263)
- Enhanced construction cart: materials are now listed separately and FIO storage is displayed [[#252]](https://github.com/PRUNplanner/frontend/issues/252)
- Prevent invalid COGC from populating plan data on creation [[#261]](https://github.com/PRUNplanner/frontend/issues/261)
- Repair Analysis now also shows plan materials for the selected day [[#269]](https://github.com/PRUNplanner/frontend/issues/269)
- Added a notice to the Supply Cart when FIO is enabled [[PR-#271]](https://github.com/PRUNplanner/frontend/pull/271)
- Improved data sanitization in Market Exploration Charts [[#193]](https://github.com/PRUNplanner/frontend/issues/193)
- Resource / Recipe ROI: added Profit per Area metric and increased parallelism to 64 [[#207]](https://github.com/PRUNplanner/frontend/issues/207)


# 2025-09-15 - v. 0.20.1

- UI Tweaks on Buttons, Checkbox and XIT Transfer Action
- Skip unknown recipes gracefully
- Skip amount precision on Material Tiles
- Add 500/500 starter ship to XIT Burn Cargo Matching
- Reduce PostHog API Call tracking
- Sort Plan Recipe options alphabetically by output tickers
