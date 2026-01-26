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
