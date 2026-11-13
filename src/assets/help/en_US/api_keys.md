An API key lets a spreadsheet, dashboard or script read your PRUNplanner data without your password. The [API Keys](/apikey) page (**API** in the account menu) creates and revokes keys and builds ready-to-paste URLs, Google Sheets formulas, curl and Python snippets.

## What Keys Are For {#what-keys-are-for}

The PRUNplanner REST API serves your planning data (plans, empires, exchange preferences, your empires' [[material-io|Material I/O]]), your [[FIO]] storage, game data (materials, recipes, buildings, planets) and market numbers such as [[vwap|VWAP]]. Typical uses:

- pull your empire's Material I/O into a Google Sheet that recalculates on its own,
- feed exchange prices or your FIO storage into your own dashboard,
- run your own analysis over all your plans.

Public game data and exchange prices need no key. Everything that belongs to you does.

A key acts as you: it can do everything your login can do through the API, not only read. There are no read-only keys.

The full reference is at [api.prunplanner.org/docs](https://api.prunplanner.org/docs). Its Authorize button takes a key, so you can try calls in the browser.

## Creating a Key {#create}

1. Press **Create New Key**.
2. Enter a **Key Name** that tells you later where you use it (for example the sheet's name). Use 50 characters at most; a longer name fails with a general error.
3. Press **Create**. The key appears once, under **Your Secret Key (Save this Now!)**.
4. **Copy key** and store it somewhere safe, for example a password manager. **Use in URL builder** fills it into the URL builder below, for this visit only.
5. Press **I've saved my key**.

> [!warning]
> PRUNplanner can't show the key again. If you lose it, revoke it and create a new one.

## Using a Key {#using-keys}

Send the key with each request, in one of two ways:

| Way | Example | Use it for |
| --- | --- | --- |
| Header | `Authorization: Api-Key <YOUR_KEY>` | Scripts, curl, dashboards |
| Query parameter | `?api_key=<YOUR_KEY>` at the end of the URL | Google Sheets `IMPORTDATA`, tools that only take a URL |

A key in a URL is visible to everyone who can see that URL, for example everyone who can open your sheet. Use a separate key per sheet or script, so you can revoke one without breaking the others.

## URL Builder {#url-builder}

The **URL builder** writes the request for you. Pick the **Data**, the **Format** (CSV or JSON, where both exist) and fill in the inputs the endpoint needs: **Empire**, **Plan** or **CX preference** (from your account), **Planet** (a natural ID such as OT-580b), **Material**, **Exchange** (AI1, CI1, IC1, NC1 or UNIVERSE) or **Days** (last day, 7, 14 or 31).

| Group | Data |
| --- | --- |
| Sheets-ready (CSV and JSON) | **Empire material I/O**, **Plan material I/O (empire)**, **Empire plan list**, **FIO storage**, **Exchange prices** (no key) |
| Your planning data (JSON) | **All plans**, **One plan**, **All empires**, **One empire**, **CX preferences**, **One CX preference** |
| Public game data (JSON, no key) | **Materials**, **Recipes**, **Buildings**, **One planet**, **Planet population report**, **Market history**, **Market history, every material** |

Then copy what you need:

- **Google Sheets**: an `=IMPORTDATA("…")` formula, for CSV only. Paste it into a cell.
- **URL**: the address with the key as `?api_key=`.
- **curl** and **Python**: with the key in the header. The Python snippet reads the CSV version when there is one.

Until you fill in your key, the snippets show `<YOUR_KEY>` in its place.

> [!tip]
> **Empire material I/O** and **Plan material I/O (empire)** return the numbers from the last time PRUNplanner calculated that empire, which happens when you open it on the [Empire](/empire) page. The `updated_at` column shows when. Open the empire after you change its plans, and your sheet follows.

## Rate Limits {#rate-limits}

Requests above these limits get the answer *429 Too Many Requests*. Wait a minute and try again.

| Requests | Limit | Counted per |
| --- | --- | --- |
| Everything you request with a key or while logged in | 240 per minute | account |
| **FIO storage** | 30 per minute | account |
| **Market history** (one material) | 120 per minute | IP address |
| **Market history, every material** | 30 per minute | IP address |

A sheet that refreshes many `IMPORTDATA` cells at once can hit a limit. Prefer one request for many rows, such as **Market history, every material**, over one request per material.

## Managing Keys {#manage-keys}

**PRUNplanner API Keys** lists your keys with their **Name**, **Prefix** (the first, non-secret part of the key, to tell them apart), **Created** and **Last Used**. Last Used shows **Never** until the key is used; after that, requests update it within a few minutes.

**Revoke** deletes a key after you confirm. Scripts and sheets using it stop working at once.

## Validity {#validity}

Keys have no expiry date. A key stops working when:

- you revoke it,
- you change or reset your password: every key created before stops at once. Create new ones and update your sheets and scripts,
- your account is deactivated.

A request with a key that no longer works gets *401* with "Invalid API Key". Keys stopped by a password change still appear in the list; revoke them to tidy up.

> [!warning]
> Treat a key like your password. Don't put it in public repositories or share it with services you don't trust. If a key may have leaked, revoke it and create a new one.
