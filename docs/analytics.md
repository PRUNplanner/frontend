# Analytics

Product analytics go to PostHog, only with consent (`useAnalyticsConsent` in
`src/lib/analytics/`). Logged-in users are asked in `AnalyticsConsentDialog`,
visitors in `AnalyticsConsentBanner`, reopened by `AnalyticsFooterLink`
(all in `src/features/analytics/components/`). One stored choice per
browser; DNT/GPC means no. `posthog-js` loads only after a grant.

Code never imports `posthog-js`; it uses `src/lib/analytics/useAnalytics.ts`:

| Function | Use |
| --- | --- |
| `trackEvent(name, props)` | one event of the tracking plan below |
| `trackPlanEdit(props)` / `flushPlanEdits()` | `plan:edit`, debounced; flush before a save and on leaving the plan |
| `trackPageview(routeName)` | `$pageview`, called by the router only |
| `trackContext(props)` | super properties sent with every later event |
| `trackUser(props)` | person properties |
| `identifyUser(profile)` / `resetUser()` | login and logout |
| `reportError(err, context?)` | caught errors: once per page load, skips API errors (`apiService` reports those) |
| `trackException` / `trackVueError` | error tracking |

Events and their properties are the keys of `IAnalyticsEventProperties`
(`useAnalytics.types.ts`). `src/tests/lib/analytics/trackingPlan.test.ts`
fails when the event rows below (`` | `name` | `` at the line start) and
that interface differ. Property keys in `SENSITIVE_KEYS` (`usePostHog.ts`:
`email`, `password`, `code`, …) are redacted before sending.

## Conventions

- **Events** are `category:object_action`, lowercase snake_case, present
  tense (`plan:save`, not `plan:saved`). Names are static; variation goes
  into properties (`tool:use` with `tool_name`).
- **Properties** are snake_case `object_adjective` (`result_count`).
  Booleans start with `is_` / `has_`, timestamps end in `_at`.
- **No personal data or uuids**: no username, email, free text or ids.
  Send a count or a `has_*` instead.
- **Fire on the outcome** (API call succeeded, result on screen), not on
  the click. Older exceptions that fire before their API call:
  `account:password_*`, `account:email_verify_request`, `empire:create`,
  `manage:*`, `exchange:update`, `planet:popr_load`.
- **A new user-facing feature** adds its events to the types and this doc in
  the same PR.
- Events only arrive from consenting browsers, so signup and landing events
  undercount; backend logs are the source for signup counts.

## Events

### Account

| Event | Properties | When |
| --- | --- | --- |
| `account:signup_complete` | | registration call succeeded |
| `account:signup_fail` | `fields` (API error field names, no values) | registration call failed |
| `account:login` | | |
| `account:logout` | | |
| `account:email_verify` | `is_success`, `source` (`banner`, `profile`, `link`), `reason` on failure (`invalid`, `expired`, `no_code`, `throttled`, `error`) | a verification code was checked |
| `account:email_nudge_shown` | `state` (`none`, `unconfirmed`) | Empire email banner shown, once per visit and state |
| `account:email_nudge_action` | `action` (`add`, `enter_code`, `resend`, `later`, `never`, `undo`), `state` | a banner button |
| `account:email_add` | `is_success`, `reason` on failure (`invalid_email`, `password_required`, `password_invalid`, `throttled`, `unknown`) | the email dialog saved an address |
| `account:email_verify_request` | | a new verification email requested |
| `account:password_reset_request` | | |
| `account:password_reset` | | |
| `account:password_change` | | |
| `account:fio_link` | | FIO became active on a profile without it |
| `account:fio_link_failed` | `reason` (the API's field error code, e.g. `fio_invalid_key`) | saving FIO credentials was refused |
| `account:api_key_create` | | |
| `account:api_key_revoke` | | after the confirm |

### Landing page

Funnel: `landing:auth_open` with `panel = registration` → `account:signup_complete`.

| Event | Properties | When |
| --- | --- | --- |
| `landing:auth_open` | `panel` (`login`, `registration`), `source` (`header`, `hero`, `closing`, `shared_plan`, `planet_search_plan`, `planet_search_distance`) | login / registration panel opened |
| `landing:example_open` | `source` (`hero`, `shared_plans`) | "Open an example plan" |
| `landing:tour_step` | `tour` (`plan`, `planet_search`, `empire`), `step` | a tour step clicked (auto-advance not sent) |
| `landing:market_click` | `target` (`header`, `cta`, `sector`, `mover`) | a link to `/market` |
| `landing:planet_search_click` | `target` (`header`, `tour`) | a link to Planet Search |

### API keys

| Event | Properties | When |
| --- | --- | --- |
| `apikey:key_copy` | | new key copied from the create dialog |
| `apikey:use_in_builder` | | "Use in URL builder" |
| `apikey:builder_change` | `endpoint` (entry id in `apiEndpoints.ts`), `format` (`csv`, `json`) | builder endpoint or format changed, debounced |
| `apikey:snippet_copy` | `endpoint`, `format`, `kind` (`url`, `sheets`, `curl`, `python`), `has_key` (real key, not the placeholder) | a snippet copied |

### Plan

| Event | Properties | When |
| --- | --- | --- |
| `plan:view` | `planet_natural_id` (not for shared), `is_shared` | plan page opened |
| `plan:create` | `planet_natural_id`, `is_first_plan` | a new plan saved |
| `plan:save` | `planet_natural_id`, `trigger` (`button`, `shortcut`), `named`, `restore` | an existing plan saved |
| `plan:save_as` | `planet_natural_id` | |
| `plan:history_open` | `trigger` (`button`) | versions list opened |
| `plan:version_preview` | `named`, `age_days` | older version opened read-only |
| `plan:version_compare` | | preview compared with the edits |
| `plan:version_restore` | `named`, `age_days` | preview loaded as unsaved edits |
| `plan:version_name` | `from` (`save`, `history`) | a version named |
| `plan:version_open_as_plan` | | new plan made from the preview |
| `plan:version_activate` | `named`, `age_days`, `from` (`list`, `preview`) | Make active |
| `plan:version_delete` | `named`, `kind` | |
| `plan:draft_restored` | `age_minutes` | autosave draft restored from its notice on plan open |
| `plan:reload` | `planet_natural_id` | header Reload: plan reloaded as saved, edits and draft dropped |
| `plan:discard_changes` | | edits discarded from the save menu |
| `plan:leave_unsaved` | `planet_natural_id` | left with unsaved changes |
| `plan:shared_clone` | `planet_natural_id`, `modified` | shared plan's working copy saved to own plans |
| `plan:shared_reset` | `planet_natural_id` | working copy reset to the shared version |
| `plan:shared_copy_changes` | `planet_natural_id`, `change_count` | change summary copied |
| `plan:share_create` | | |
| `plan:share_delete` | | |
| `plan:tool_toggle` | `panel` (panel key, e.g. `construction-cart`) | a tab of a plan grid item shown |
| `plan:profit_breakdown_mode` | `mode` (`cost_type`, `building`) | |
| `plan:plancheck_change` | `view` (`market`, `sensitivity`, `compare`), `pct` (on a price change only) | Plan check view or price change switched |
| `plan:plancheck_compare` | `same_planet` | Plan check compared with another plan |
| `plan:plancheck_target` | `has_target` | target price solver first used, once per open view |
| `plan:market_flag_open` | `where` (`plan`, `empire`), `level` (`red`, `amber`, `muted`) | a market flag's details opened |
| `plan:cogm_open` | `planet_natural_id`, `recipe_id` | |
| `plan:insights_open` | `planet_natural_id`, `source` (`planet`) | planet insights box opened from Base's planet link |
| `plan:recipe_picker_open` | `mode` (`change`, `add`) | the pick itself is a `plan:edit` |
| `plan:recipe_picker_undo` | | Undo after a picked recipe |
| `plan:recipe_picker_sort` | `sort` (`daily`, `popular`) | |
| `plan:panel_fold` | `panel` (the item's first element id, e.g. `planet`), `folded` | a plan grid item folded or unfolded |
| `plan:result_tile_open` | `tile` (`profit`, `payback`, `area`, `storage`, `workforce`) | a results tile clicked |
| `plan:workforce_unneeded_toggle` | `is_shown` | unneeded workforce tiers shown / hidden |
| `plan:layout_preset` | `preset` (`today`, `wide`, `stacked`, `custom`) | a layout picked in the Layout menu |
| `plan:layout_customise_open` | `from` (`preset`, `custom`) | customise mode opened |
| `plan:layout_save` | `items`, `tabs`, `kept_in_view`, `hidden`, `cols`, `gap`, `replaced`, `store` (`session`) | Custom Layout saved |
| `plan:layout_cancel` | `changes` | customise mode left without saving |
| `plan:layout_item_move` | `element`, `how` (`drag`, `menu`, `keys`), `to` (`page`, `band`, `tabs`, `hidden`) | an item moved, made a tab or hidden |
| `plan:layout_item_resize` | `element`, `how` (`drag`, `menu`, `keys`), `what` (`width`, `height`), `snapped` (`bottom`, `height`, `content`, null) | an item resized |
| `plan:layout_undo` | `how` (`toast`, `button`, `keys`) | a layout change undone while customising |
| `plan:io_view` | `source` (`all`, `production`, `workforce`), `filter` (`all`, `exports`, `imports`), `value` (`price`, `weight`, `volume`, `share`) | any of the three switched |
| `plan:cogc_match_toggle` | `is_active` | "Match COGC" on the building select |
| `plan:starter_show` | `planet_natural_id`, `candidate_count` | typical-setup card shown, once per plan view |
| `plan:starter_apply` | `planet_natural_id`, `building_count`, `expert_count`, `is_selection_changed` | typical setup added (not also sent as `plan:edit`) |
| `plan:starter_dismiss` | `planet_natural_id` | "Start empty" |
| `plan:hab_optimize` | `goal` (`area`, `cost`) | optimize buttons; `trackEvent` drops `goal: auto` |
| `plan:hab_auto_toggle` | `is_active` | |
| `plan:edit` | `planet_natural_id`, `field`, relevant of `building_ticker`, `recipe_id`, `amount`, `infrastructure_type`, `expert_type`, `workforce_type`, `lux_type`, `value`, `is_from_popular`, `is_most_planned`, `is_shared` | see below |
| `plan:undo` | `trigger` (`button`, `shortcut`) | |
| `plan:redo` | `trigger` (`button`, `shortcut`) | |
| `plan:save_conflict` | `planet_natural_id`, `is_deleted`, `choice` (`save_as_new`, `overwrite`, `reload`, `close`) | save conflict dialog answered |

`plan:edit`: `field` is a `PlanEditField`. `trackPlanEdit` debounces one
second per edited control (field + building / infrastructure / expert /
workforce / lux type), so ten clicks on + are one event with the final
amount, and sets `is_shared` on `/shared/…` URLs. `is_from_popular`
(`building_add`) and `is_most_planned` (`recipe_add`, `recipe_change`) are
only sent while plan suggestions are on. `recipe_mix_add` has `amount` =
recipes added.

### Planet, empire, management, exchanges, materials

| Event | Properties | When |
| --- | --- | --- |
| `planet:popr_load` | `planet_natural_id` | |
| `empire:create` | | |
| `empire:update` | `is_success` | empire configuration saved |
| `empire:reload` | | |
| `empire:material_io_expand` | | a Material I/O row opened |
| `empire:market_filter` | `level` (`red`, `amber`, `muted`, `null` when cleared) | market flag chip toggled |
| `empire:view_change` | `view` (`materialio`, `analysis`, `opportunities`) | |
| `empire:analysis_more_charts` | | "More charts" opened |
| `empire:save_conflict` | `choice` (`overwrite`, `reload`, `close`) | |
| `manage:cx_create` | | |
| `manage:cx_delete` | | |
| `manage:empire_create` | | |
| `manage:empire_delete` | | |
| `manage:empire_cx_assign` | | |
| `manage:plan_empire_assign` | | |
| `manage:plan_assign_all` | `is_assigned` | |
| `manage:plan_clone` | | |
| `manage:plan_delete` | | |
| `manage:plan_delete_bulk` | `count` | |
| `exchange:update` | `location` (`exchanges_view`, `cogm`) | |
| `exchange:discard` | `location` | unsaved rules discarded |
| `exchange:price_detail` | `location`, `material_ticker` | price cascade expanded |
| `exchange:preset` | `preset` (`average`, `trade_now`), `scope` (`all`, `planet`) | |
| `exchange:use_cogm` | `location`, `material_ticker` | a COGM used as fixed buy price |
| `exchange:leave_unsaved` | `location` | leave with unsaved rules asked to confirm |
| `exchange:save_conflict` | `location`, `choice` (`overwrite`, `reload`, `close`) | |
| `material:market_drawer_open` | `material_ticker`, `source` (`tile`, `card`) | Market details drawer opened |
| `material:market_card_pin` | `material_ticker` | a click pinned the market card (no hover events) |

### Tools

| Event | Properties | When |
| --- | --- | --- |
| `tool:use` | `tool_name`, plus the tool's own (below) | the tool produced a result |
| `repair_analysis:interval_set` | `source` (`input`, `slider`, `preset`, `reset`), `ticker` (`all` on reset), `in_range` | repair interval changed, debounced 1 s |
| `fio_repair:base_open` | `status` (`overdue`, `soon`, `later`, `unknown`), `confidence` (`match`, `likely`, `picked`, `nopick`, `none`) | a base opened (not the initial one) |
| `fio_repair:plan_link_set` | `to` (`plan`, `none`, `auto`) | |
| `fio_repair:setting_change` | `setting` (`interval`, `due_soon`, `arrival`, `exchange`, `use_plans`) | debounced 1 s per setting |
| `planet_search:view_change` | `view` (`list`, `matrix`, `chart`) | |
| `planet_search:action` | `action` (`pin`, `save`, `load`, `link_copy`, `reset`, `plan_open`, `sort`, `column_toggle`); `sort` adds `sort` (first sort key) and `sort_count`; `column_toggle` adds `column`, `is_shown` | anything besides searching |
| `market_exploration:view_change` | `view` (`candles`, `exchanges`) | |
| `resource_roi:chart_open` | | |
| `production_chain:action` | `action` (a `ProductionChainAction`, or `plans_create` with `plan_count`, `empire` (`new`, `existing`, `none`) and `faction` for a new empire) | an action on the Production Chains page |
| `market:view_change` | `chart` (`index`, `workforce`, `movers`, `leaders`, `gaps`), `view` (that chart's view; `all` when a list expands, its own view again on collapse) | on `/market` |

`tool:use` means a result, not an opened page (pageviews cover that). Tools
with input count only results for input the user chose:

| `tool_name` | Extra properties | Fires when |
| --- | --- | --- |
| `planet_search` | `filter` (search query without `q`, `ref`), `has_text`, `reference_count`, `result_count` | a changed filter settled (1 s) |
| `market_exploration` | `exchange`, `material_ticker` | data for a chosen exchange, material or interval loaded |
| `production_chain` | `mode: chain`, `targets`, `target_count`, `material_count`, `efficiency`, `raw_source` (`buy`, `extract`), `byproducts` (`cover`, `sell`) | targets or settings settled (1 s); not for a chain opened from a link |
| `production_chain` | `mode: check`, `target_count`, `bases_checked`, `bases_optimal`, `finding_count` | check inputs settled (1 s), with a chain; not from a link |
| `resource_roi` | `material_ticker` | search finished |
| `recipe_roi`, `base_roi`, `upkeep_price`, `fio_burn` | | calculation finished |
| `hq_upgrade` | | levels or overrides settled (1 s) |
| `market_live` | | live data arrived, once per visit |
| `fio_repair` | | page showed at least one base |
| `construction_cart` | `built_edited` | the cart closed |

### XIT, app, debug, onboarding

| Event | Properties | When |
| --- | --- | --- |
| `xit:burn_open` | | |
| `xit:burn_copy` | | |
| `xit:burn_ship_fit` | `weight`, `volume` | |
| `xit:transfer_open` | `source` (an `XITTransferSource`: which tool button) | |
| `xit:transfer_copy` | `source` | |
| `app:nav_click` | `target` (route name or `logout`), `area` (`sidebar`, `rail`, `mobile_bar`, `mobile_sheet`), `section` (`empire`, `plans`, `planning`, `tools`, `footer`) | a navigation entry clicked |
| `app:version_reload` | `source` (`notice`, `chip`, `navigation`) | reload onto a newer build |
| `app:version_later` | | update notice put off |
| `app:whats_new_click` | | "What's new" on the release toast |
| `app:remote_change` | `object_type` (`plan`, `empire`, `cx`), `has_unsaved_edits`, `is_deleted` | another tab saved or deleted what an open editor shows |
| `app:session_change` | `reason` (`logout`, `login`, `other_user`) | another tab changed the session |
| `app:db_blocked` | | the game data IndexedDB waits on an older tab |
| `debug:calc_open` | `source` (`button`, `shortcut`) | calculation debug panel opened |
| `onboarding:step_click` | `step` (`empire_save`, `planet_search`, `exchanges`) | first-run card on the Empire page |

### Performance

| Event | Properties | When |
| --- | --- | --- |
| `perf:gamedata_load` | `IGameDataLoadProperties`: `store`, `source` (`cache`, `network`), `is_stale`, `age_min`, `ms_total`, `ms_idb_read`, `ms_fetch`, `ms_idb_write` | a game data list's first load per tab and store, sent after background phases end |
| `perf:content_ready` | `ms` (from navigation start), `nav` (`hard`, `spa`), `loader_shown` | first frame of main content (`useContentReady`), once per mount; not sent if the tab was hidden |

## Pageviews

PostHog's pageview autocapture is off (`$pageleave` stays on). The router's
`afterEach` calls `trackPageview`, which registers `route_name` as a super
property, so group pages by `route_name`, not URL. Failed or cancelled
navigations and query-only changes send no pageview. The pageview dropped
before a consent grant is sent once PostHog starts.

`before_send` in `usePostHog.ts`:

- `maskUrlCodes` replaces the one-time codes in `/password-reset/<code>`
  and `/verify-email/<code>` with `:code` in every property, nested too.
- `dropChunkLoadErrors` drops exceptions that are only chunk-load errors
  (`chunkReload` handles them).

## Person properties

| Property | Set from |
| --- | --- |
| `username`, `prun_username`, `is_fio_enabled`, `has_verified_email` | the profile (`identifyUser`) |
| `language`, `color_palette`, `navigation_style`, `market_card_trigger`, `is_plan_suggestions_enabled`, `has_default_empire`, `has_default_cx`, `is_buy_from_cx_default`, `burn_days_red`, `burn_days_yellow`, `burn_resupply_days`, `burn_origin`, `supply_cart_days`, `fio_repair_interval_days`, `fio_repair_due_soon_days`, `fio_repair_arrival_days`, `fio_repair_plan_link_count`, `plan_override_count`, `email_nudge_dismissal`, `email_nudge_dismissed_at` | preferences, on load and each sync (`trackPreferences` in `user.queries.ts`); ids only as `has_*`, maps as counts |
| `plan_count`, `empire_count`, `cx_count` | `usePlanningDataLoader` |

Properties set before identify are held and sent with it (person profiles
are identified-only); unchanged values are not resent.
