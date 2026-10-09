# Analytics

Product analytics go to PostHog, only with the user's consent
(`useAnalyticsConsent`, see `src/lib/analytics/`). Code never talks to
`posthog-js` directly, it uses the typed wrapper in
`src/lib/analytics/useAnalytics.ts`:

| Function | Use |
| --- | --- |
| `trackEvent(name, props)` | one event of the tracking plan below |
| `trackPlanEdit(props)` | `plan:edit`, debounced (see below) |
| `trackPageview(routeName)` | `$pageview`, called by the router only |
| `trackUser(props)` | person properties |
| `identifyUser(profile)` / `resetUser()` | login and logout |
| `trackException` / `trackVueError` | error tracking |

The event names and their properties are the keys of
`IAnalyticsEventProperties` in `useAnalytics.types.ts`. That interface and
the tables here list the same events; a test
(`src/tests/lib/analytics/trackingPlan.test.ts`) fails when they differ.

## Conventions

- **Events** are `category:object_action`: lowercase snake_case, present
  tense verbs (`plan:save`, not `plan:saved`). Names are static, variation
  goes into properties (`tool:use` with `tool_name`, not one event per tool).
- **Properties** are snake_case, `object_adjective` (`planet_natural_id`,
  `result_count`). Booleans start with `is_` or `has_`, timestamps end in
  `_at`.
- **No personal data** in event properties: no username, email or free
  text. The person is identified already.
- **Every new user-facing feature** adds its events to the types and to this
  doc in the same PR.
- A new event fires when the thing happened (after the API call succeeded,
  when the result is on screen), not when the user asked for it. Some
  older events still fire on the click, before their API call:
  `account:password_*`, `account:profile_update`, `account:fio_update`,
  `empire:create`, `manage:*`, `exchange:update`, `planet:popr_load`.

## Events

### Account

| Event | Properties | When |
| --- | --- | --- |
| `account:signup_complete` | | the registration call succeeded |
| `account:signup_fail` | `fields` (field names of the API error, no values) | the registration call failed |
| `account:login` | | login succeeded |
| `account:logout` | | |
| `account:email_verify` | `is_success` | the verification code was checked |
| `account:email_verify_request` | | a new verification email was requested |
| `account:password_reset_request` | | |
| `account:password_reset` | | |
| `account:password_change` | | |
| `account:profile_update` | | the profile form was submitted |
| `account:fio_update` | `is_active` | the profile form was submitted |
| `account:fio_link` | | FIO became active for a profile that had none |
| `account:fio_link_failed` | `reason` | saving FIO credentials was refused: `fio_required`, `fio_invalid_key` or `fio_username_mismatch` |
| `account:api_key_create` | | |

### Plan

| Event | Properties | When |
| --- | --- | --- |
| `plan:view` | `planet_natural_id` (not for a shared plan), `is_shared` | a plan page opened |
| `plan:create` | `planet_natural_id`, `is_first_plan` | a new plan was saved. `is_first_plan` is read from the local plan store |
| `plan:save` | `planet_natural_id`, `trigger` (`button`, `shortcut`) | an existing plan was saved |
| `plan:save_as` | `planet_natural_id` | |
| `plan:reload` | `planet_natural_id` | |
| `plan:leave_unsaved` | `planet_natural_id` | the plan page was left with unsaved changes |
| `plan:shared_clone` | `planet_natural_id`, `shared_uuid`, `modified` | a shared plan's working copy was saved to the viewer's plans (`modified`: changed from the shared version) |
| `plan:shared_reset` | `planet_natural_id` | the working copy was reset to the shared version |
| `plan:shared_copy_changes` | `planet_natural_id`, `change_count` | the working copy's change summary was copied for Discord |
| `plan:share_create` | | |
| `plan:share_delete` | | |
| `plan:tool_toggle` | `tool_name` | a plan tool panel was opened |
| `plan:cogm_open` | `planet_natural_id`, `recipe_id` | |
| `plan:insights_open` | `planet_natural_id` | the planet insights box was opened |
| `plan:starter_show` | `planet_natural_id`, `candidate_count` | the "Start from a typical setup" card was shown on an empty plan, once per plan view |
| `plan:starter_apply` | `planet_natural_id`, `building_count`, `expert_count`, `is_selection_changed` | the typical setup was added to the plan (`is_selection_changed`: the user changed the preselected buildings) |
| `plan:starter_dismiss` | `planet_natural_id` | "Start empty" on the card |
| `plan:hab_optimize` | `goal` (`area`, `cost`) | the optimize buttons; the automatic run (`auto`) is not sent |
| `plan:hab_auto_toggle` | `is_active` | |
| `plan:edit` | `planet_natural_id`, `field`, and the relevant of `building_ticker`, `recipe_id`, `amount`, `infrastructure_type`, `expert_type`, `workforce_type`, `lux_type`, `value`, `is_from_popular`, `is_most_planned`, `is_shared` | see below |
| `plan:undo` | `trigger` (`button`, `shortcut`) | |
| `plan:redo` | `trigger` (`button`, `shortcut`) | |
| `plan:save_conflict` | `planet_natural_id`, `is_deleted`, `choice` (`save_as_new`, `overwrite`, `reload`, `close`) | the save conflict dialog was answered: the plan was saved (`is_deleted`: deleted) in another tab or device since it was loaded |

`plan:edit` replaces one event per click. `field` is one of `building_add`,
`building_amount`, `recipe_add`, `recipe_mix_add`, `recipe_change`,
`recipe_delete`, `recipe_amount`, `workforce`, `infrastructure`, `expert`,
`cogc`, `corphq`, `permits`. `recipe_mix_add` is the "Add" of the typical
mix hint on a building without recipes (`amount`: recipes added). While
plan suggestions are on, `building_add` has `is_from_popular` (picked from
the "Popular on" group) and `recipe_add` / `recipe_change` have
`is_most_planned` (the recipe is the planet's most planned one for that
building). `is_shared` is true for edits on a shared plan's working copy
(`/shared/…`). It is sent through `trackPlanEdit`, which waits one second per
edited control (field, building, and infrastructure, expert or workforce
type): ten quick clicks on a building's + are one event with the final
amount. Pending edits are sent before a save and when the plan page closes.

The typical setup is not also sent as `plan:edit` events; undoing it is a
`plan:undo`. Funnel (built in PostHog): `plan:starter_show` →
`plan:starter_apply` → `plan:create` in the same session.

### Planet, empire, management, exchanges

| Event | Properties | When |
| --- | --- | --- |
| `planet:popr_load` | `planet_natural_id` | |
| `empire:create` | | |
| `empire:update` | `is_success` | the empire configuration was saved |
| `empire:reload` | | |
| `empire:material_io_expand` | | a Material I/O row was opened |
| `empire:save_conflict` | `choice` (`overwrite`, `reload`, `close`) | the save conflict dialog of the empire configuration was answered |
| `manage:cx_create` | | |
| `manage:cx_delete` | `cx_uuid` | |
| `manage:empire_create` | | |
| `manage:empire_delete` | `empire_uuid` | |
| `manage:empire_cx_assign` | | |
| `manage:plan_empire_assign` | | |
| `manage:plan_assign_all` | `is_assigned` | |
| `manage:plan_clone` | `plan_uuid` | |
| `manage:plan_delete` | `plan_uuid` | |
| `exchange:update` | `location`, `cx_uuid` | |
| `exchange:reload` | `location` | |
| `exchange:save_conflict` | `location` (`exchanges_view`, `cogm`), `choice` (`overwrite`, `reload`, `close`) | the save conflict dialog of a CX was answered |
| `material:market_drawer_open` | `material_ticker` | |

### Tools

| Event | Properties | When |
| --- | --- | --- |
| `tool:use` | `tool_name`, plus the tool's own | the tool produced a result |

`tool:use` means a result, not an opened page (pageviews carry
`route_name` for that). Tools with an input count only a result for an
input the user chose. Tools that calculate on their own (recipe ROI, upkeep
price, market live, FIO repair and burn) count the finished calculation,
so for them `tool:use` is close to a pageview that got a result:

| `tool_name` | Extra properties | Fires when |
| --- | --- | --- |
| `planet_search` | `filter`, `result_count` | a changed filter settled (1 s) |
| `market_exploration` | `exchange`, `material_ticker` | data for a chosen exchange, material or candle interval loaded, not the default on open |
| `production_chain` | `material_ticker`, `amount`, `recipes`, `terminals` | a chain was built for a changed input, not the default on open |
| `resource_roi` | `material_ticker` | the search finished |
| `recipe_roi` | | the ROI calculation finished |
| `hq_upgrade` | | levels or overrides changed and settled (1 s) |
| `upkeep_price` | | the price calculation finished |
| `market_live` | | live data arrived, once per visit |
| `fio_repair` | | the page opened with a repair table |
| `fio_burn` | | the burn calculation finished for at least one plan |
| `construction_cart` | `built_edited` (Built was changed in this visit) | the cart closed |

### XIT, app, onboarding

| Event | Properties | When |
| --- | --- | --- |
| `xit:burn_open` | | |
| `xit:burn_copy` | | |
| `xit:burn_ship_fit` | `weight`, `volume` | |
| `xit:transfer_open` | | |
| `xit:transfer_copy` | | |
| `app:navigation_toggle` | `navigation_style` | |
| `app:version_reload` | | |
| `app:remote_change` | `object_type` (`plan`, `empire`, `cx`), `has_unsaved_edits`, `is_deleted` | another tab saved or deleted what an open editor shows: it reloaded, or (with unsaved edits, or deleted) showed a notice. A deleted empire is sent by the empire page, always with `has_unsaved_edits: false` |
| `app:session_change` | `reason` (`logout`, `login`, `other_user`) | another tab logged out, logged in, or logged in as another user; sent before this tab resets or reloads |
| `app:db_blocked` | | the local game data database waits on an older PRUNplanner tab after a deploy |
| `onboarding:step_click` | `step` (`empire_save`, `planet_search`, `exchanges`) | a step of the first-run card on the Empire page |

## Pageviews

PostHog's own pageview capture is off (`capture_pageview: false`,
`capture_pageleave: true` keeps `$pageleave`). The router's `afterEach` calls
`trackPageview`, which registers `route_name` as a super property and sends
`$pageview`. URLs carry uuids and planet ids, so group pages by `route_name`
(all plan pages are `plan` or `shared-plan`). Every later event and
exception carries `route_name` too.

- A navigation that failed or was cancelled (e.g. the unsaved-changes
  confirm) and a query change on the same page (planet search writes its
  filters into the URL) send no pageview.
- The page a visitor grants consent on gets its pageview when PostHog
  starts; it was dropped before the grant.
- Saving a new plan moves to its uuid URL, which counts as a second `plan`
  pageview.
- The one-time codes in `/password-reset/<code>` and `/verify-email/<code>`
  never leave the browser: `before_send` (`maskUrlCodes`) replaces them with
  `:code` in every property of every event, nested ones included
  (`$current_url`, `$pathname`, `$referrer`, `$initial_*`, exceptions,
  session replay snapshots).
- Chunk-load errors are not sent: `before_send`
  (`dropChunkLoadErrors`) drops an exception whose entries are all
  chunk-load errors. `chunkReload` handles them, but a programmatic
  `router.push()` still rejects and posthog-js would report it as unhandled.

## Person properties

| Property | Set from |
| --- | --- |
| `username`, `prun_username`, `is_fio_enabled`, `has_verified_email` | the profile, on load and change (`identifyUser`) |
| `language`, `color_palette`, `navigation_style`, `is_plan_suggestions_enabled` | the preferences, on load and change |
| `plan_count`, `empire_count`, `cx_count` | the planning data loader, on every page that loads the lists |

Person properties set before the user is identified are kept and sent with
the identify call: PostHog only gets person profiles of logged-in users.
Unchanged values are not sent again.
