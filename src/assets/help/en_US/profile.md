Your [Profile](/profile) holds your account, the link to your game data through FIO, and the preferences that set how PRUNplanner's tools start. This page also covers logging in, signing up and resetting a password.

## Your Account {#account}

### Logging in and signing up {#login-and-sign-up}

- **Log in** with your username and password. After logging in you land on your [Empire](/empire), unless you came from a link that brings you back to where you were.
- **Create account** asks for a **Username** (at least 3 characters, no spaces), a **Password** (at least 8 characters, not only numbers, not a common password) and an optional email. To prove you play the game, you type the name of a planet whose ID you are shown; open it in a Prosperous Universe buffer to read its name.
- A new account starts with an empire, "My Empire", and an [[exchange-preference|exchange preference]], "My Exchange Preference" (Universe · VWAP 30D), assigned to it. See [Your first base](/help/guide_first_base).

### Email and account recovery {#email}

An email is optional and only used to reset your password. Without one, a forgotten password can't be reset.

1. Enter it under **Email Address**, with your **Current password**, and press **Save**. Adding, changing and removing the address all need your current password.
2. PRUNplanner sends an 8-character code, valid for 24 hours. Press **Enter code** and type it, or click the link in the email on any device. **Send new code** sends another.

**Account recovery** shows the state: **Not set up** (no email), **Waiting for confirmation**, or **Ready** (resets go to this address). A new address gets resets once you confirm it.

While you have plans but no confirmed email, the Empire page shows a reminder. "Not now" hides it for 30 days, "Don't remind me" for good.

### Forgotten password {#password-reset}

On the login form, **Forgot your password?** asks for your confirmed email address and sends a code there. Enter the code with a new password to set it.

### Changing your password {#change-password}

Open **Change Password**, enter your **Current Password** and a **New Password** (at least 8 characters).

> [!warning]
> Changing or resetting your password logs you out everywhere, this browser included, and stops every [API key](/help/api_keys#validity) you created before. Create new keys afterwards and update your sheets and scripts.

## FIO Connection {#fio-connection}

[[FIO]] is a free community browser extension that reads your game data. With it, PRUNplanner can show your real stock in [FIO Burn](/help/fio_burn), your buildings' condition in [FIO Repair](/help/fio_repair) and your stores in the API.

1. Install the FIO browser extension and register your FIO account from the game's extensions button.
2. On the FIO website, open your settings and create an API key for PRUNplanner.
3. Enter the **FIO API Key** and your **PrUn Username** under **FIO connection** and press **Save**.

PRUNplanner checks the key: it says so when FIO doesn't accept the key or the key belongs to another username. **FIO Status** then shows the state: not connected, loading your data, connected with the time of the last update, connected but no data yet (open the game with the FIO extension running), key rejected, or updates failing.

How fresh the data is: while you use PRUNplanner, your FIO data is at most about 30–45 minutes old. After a week away, it refreshes when you log in. FIO itself only knows what the extension saw while you played.

Your FIO data (storage and sites) is not stored in your browser: PRUNplanner loads it each time you open the app and again every 5 minutes.

## Preferences {#preferences}

Preferences are saved to your account as soon as you change them, so they follow you to every device. Only **Usage analytics** is stored in this browser alone.

| Preference | Default | What it does |
| --- | --- | --- |
| **Language** | English | The app's language. Translations come from the community on Crowdin. |
| **Color palette** | **Default (green / red)** | **Color-blind (blue / orange)** changes good/bad colours across the app. |
| **Market card** | **On hover** | **On click only**: hovering a material shows nothing; click it for prices. See [Material market card](/help/exchanges#market-card). |
| **Default Empire** | your first empire | The empire the Empire page and FIO Burn open on. Switching empire there changes it too. |
| **Default CX** | none | The exchange preference tools start with: ROI tools, Base ROI, HQ Calculator, Upkeep Prices, Production Chains and FIO Repair. Picking a preference in one of them changes it too. Without one, they use Universe · VWAP 30D. |
| **Red Threshold** | 5 | FIO Burn: red when a base has this many days of supply left or fewer. |
| **Yellow Threshold** | 10 | FIO Burn: yellow at this many days of supply or fewer. |
| **Resupply Days** | 20 | FIO Burn: the days an XIT resupply covers. |
| **XIT Origin** | **Configure on Execution** | Where XIT resupply and repair loads start: a station warehouse, or chosen when the XIT runs. |
| **XIT Buy from CX** | on | Buy the load at the origin's exchange (only with a warehouse origin). Shared by FIO Burn and FIO Repair. |
| **Repair every (no plan)** | 60 | FIO Repair: repair interval in days for bases without a matched plan (1–180). |
| **Due soon** | 7 | FIO Repair: days before the target that count as due soon (0–60). |
| **Arrival days** | 2 | FIO Repair: days until a repair ship unloads (0–30). |
| **Plan suggestions** | on | Popular buildings and recipes on the planet, planet insights and a typical setup for empty plans. |
| **Usage analytics** | asked once, in a banner | Lets PRUNplanner collect usage events, error reports and session recordings. Stored in this browser only; stays off when your browser sends Do-Not-Track or Global Privacy Control. |

The burn thresholds are *days of supply left*, not stock amounts. You can also set them on the [FIO Burn](/help/fio_burn#thresholds) page and the repair settings on [FIO Repair](/help/fio_repair); it's the same setting.

**Plan-Specific Settings** lists plans with settings of their own (for example visitation exclusions, built buildings in the construction cart, or auto-optimize turned off). Change them inside each plan.

## Browser Storage {#browser-storage}

To load fast and spare the server, PRUNplanner keeps a copy of game data and your planning data in your browser and refreshes it after set times. The **Browser Storage** table shows how much it holds.

### Storage Categories {#storage-categories}

| Category | What | Refreshed |
| --- | --- | --- |
| Game data | Materials, buildings, recipes and planets (from FIO) | less often than exchanges |
| Exchanges | Prices and market numbers: Ask and Bid from FIO, VWAPs calculated by PRUNplanner | about every 30 minutes |
| Planning data | Your plans, empires, exchange preferences and shared plans | a copy of what is saved in your account |

FIO data is not kept in browser storage, even though the table lists its rows (see [FIO Connection](#fio-connection)).
