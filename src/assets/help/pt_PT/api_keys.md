With an API key, a spreadsheet, dashboard or script can read your PRUNplanner data without your password. On the [API Keys](/apikey) page (**API** in the account menu) you create and revoke keys, and it builds ready-to-paste URLs, Google Sheets formulas, curl and Python snippets for you.

## What Keys Are For {#what-keys-are-for}

The PRUNplanner REST API serves your planning data (plans, empires, exchange preferences, your empires' [[material-io|Material I/O]]), your [[FIO]] storage, game data (materials, recipes, buildings, planets) and market numbers such as [[vwap|VWAP]]. Typical uses:

- pull your empire's Material I/O into a Google Sheet that recalculates on its own,
- feed exchange prices or your FIO storage into your own dashboard,
- run your own analysis over all your plans.

Public game data and exchange prices need no key. Everything that belongs to you does.

Each key has an **Access**: **Read-only** or **Read & write**. See [Access](#access) for what each one allows.

You'll find the full reference at [api.prunplanner.org/docs](https://api.prunplanner.org/docs). Its Authorize button takes a key, so you can try calls in the browser.

## Access {#access}

Every key reads your data. Whether it can also change it depends on the access you picked when you created it:

| Access           | Reads your plans, empires and other data | Creates, changes and deletes them |
| ---------------- | ---------------------------------------- | --------------------------------- |
| **Read-only**    | yes                                      | no                                |
| **Read & write** | yes                                      | yes, with the key in the header   |

New keys are **Read-only** unless you pick **Read & write**. A sheet, a dashboard or anything you build with the URL builder only reads, so a read-only key is all it needs. Give a key **Read & write** only when a script of yours changes your data. Keys you created before keys had an access are **Read & write**, so the scripts using them keep working.

You can't change a key's access later. To change it, create a new key with the access you want, switch your sheet or script over, and revoke the old one.

Some things no key can do, whatever its access. They need you logged in to PRUNplanner:

- list, create or revoke keys,
- change your email, your password, your PrUn username or your FIO API key,
- request or confirm the email verification.

A key can read your profile, but your FIO API key comes back empty: it's your key for FIO, and a script has no need for it.

When a key tries something it may not do, the answer is _403 Forbidden_ with a `code` that says why:

- `api_key_read_only`: a **Read-only** key tried to change data.
- `api_key_in_url`: a key sent as `?api_key=` tried to change data. Send it in the `Authorization` header.
- `api_key_not_allowed`: a key tried one of the account actions above. Log in to do it.

Nothing is changed when this happens.

## Creating a Key {#create}

1. Press **Create New Key**.
2. Enter a **Key Name** that tells you later where you use it, for example the sheet's name. Keep it to 50 characters at most. A longer name fails with a general error.
3. Pick the **Access**: **Read-only** (already selected) or **Read & write**. The line below it says what the key will be able to do.
4. Press **Create**. The key appears once, under **Your Secret Key (Save this Now!)**, together with its access.
5. **Copy key** and store it somewhere safe, for example a password manager. **Use in URL builder** fills it into the URL builder below, for this visit only.
6. Press **I've saved my key**.

> [!warning]
> PRUNplanner can't show the key again, because it keeps only a hashed form of it, which can check a key but can't turn back into one. If you lose it, revoke it and create a new one.

## Using a Key {#using-keys}

Send the key with each request, in one of two ways:

| Way             | Example                                     | Use it for                                             |
| --------------- | ------------------------------------------- | ------------------------------------------------------ |
| Header          | `Authorization: Api-Key <YOUR_KEY>`         | Scripts, curl, dashboards                              |
| Query parameter | `?api_key=<YOUR_KEY>` at the end of the URL | Google Sheets `IMPORTDATA`, tools that only take a URL |

Anyone who can see a URL can see the key in it, for example everyone who can open your sheet. That's why a key in a URL can only read, even a **Read & write** one. Use a separate read-only key per sheet or script, so you can revoke one without breaking the others.

Both ways work for every request a key may make, except that changes need the header. If a request carries both, PRUNplanner uses the header.

## URL Builder {#url-builder}

The **URL builder** writes the request for you. Pick the **Data** and the **Format** (CSV or JSON, where both exist), then fill in the inputs the endpoint needs. Those can be **Empire**, **Plan** or **CX preference** (from your account), **Planet** (a natural ID such as OT-580b), **Material**, **Exchange** (AI1, CI1, IC1, NC1 or UNIVERSE) or **Days** (last day, 7, 14 or 31).

| Group                           | Data                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Sheets-ready (CSV and JSON)     | **Empire material I/O**, **Plan material I/O (empire)**, **Empire plan list**, **FIO storage**, **Exchange prices** (no key)                    |
| Your planning data (JSON)       | **All plans**, **One plan**, **All empires**, **One empire**, **CX preferences**, **One CX preference**                                         |
| Public game data (JSON, no key) | **Materials**, **Recipes**, **Buildings**, **One planet**, **Planet population report**, **Market history**, **Market history, every material** |

Then copy what you need:

- **Google Sheets**: an `=IMPORTDATA("…")` formula, for CSV only. Paste it into a cell.
- **URL**: the address with the key as `?api_key=`.
- **curl** and **Python**: with the key in the header. The Python snippet reads the CSV version when there is one.

Until you fill in your key, the snippets show `<YOUR_KEY>` in its place.

> [!tip]
> **Empire material I/O** and **Plan material I/O (empire)** return the numbers from the last time PRUNplanner calculated that empire, which happens when you open it on the [Empire](/empire) page. The `updated_at` column shows when. Open the empire after you change its plans, and your sheet follows.

## Rate Limits {#rate-limits}

If you go over these limits, the request gets the answer _429 Too Many Requests_. Wait a minute and try again.

These limits sit well above normal use: the 240 per minute is about four times, and the FIO storage limit about twice, the busiest minute of normal use.

| Requests                                             | Limit          | Counted per |
| ---------------------------------------------------- | -------------- | ----------- |
| Everything you request with a key or while logged in | 240 per minute | account     |
| **FIO storage**                                      | 30 per minute  | account     |
| **Market history** (one material)                    | 120 per minute | IP address  |
| **Market history, every material**                   | 30 per minute  | IP address  |

A sheet that refreshes many `IMPORTDATA` cells at once can hit a limit. One request for many rows, such as **Market history, every material**, is better than one request per material.

For example, if 40 **FIO storage** requests arrive within one minute, the first 30 go through and the other 10 get 429.

## Managing Keys {#manage-keys}

**PRUNplanner API Keys** lists your keys with their **Name**, **Prefix**, **Access**, **Created** and **Last Used**. The prefix is the first, non-secret part of the key, the part before the dot, so you can tell them apart. Last Used shows **Never** until the key is used. After that, it updates at most once every 5 minutes, so a request you sent a moment ago may not show yet.

**Revoke** deletes a key after you confirm. Scripts and sheets using it stop working at once.

## Validity {#validity}

Keys have no expiry date. A key stops working when:

- you revoke it,
- you change or reset your password (every key created before then stops at once, so create new ones and update your sheets and scripts),
- your account is deactivated.

So if someone else learnt your password and made a key with it, changing your password locks that key out too.

A request with a key that no longer works gets _401_ with "Invalid API Key". Keys stopped by a password change still appear in the list, and you can revoke them to tidy up.

> [!warning]
> Treat a key like your password. Don't put it in public repositories or share it with services you don't trust. If a key may have leaked, revoke it and create a new one.
