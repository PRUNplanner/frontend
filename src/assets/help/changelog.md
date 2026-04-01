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
