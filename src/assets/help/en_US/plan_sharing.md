A share link lets anyone look at one of your [[plan|plans]], with or without a PRUNplanner account. They can try changes on their own copy and save it as a plan of their own, but your plan never changes. Use it to show a base in a Discord thread, ask for feedback or hand a setup to a corp mate.

## Sharing a plan {#share-link}

Open your plan and click **Share link** in the header. The button is there on your own plans once they are saved. In [Management](/manage), the ⋯ menu of a plan's row has the same dialog under **Share…**.

The dialog **Share Plan** works in two steps:

1. Before the plan is shared, it explains what the link does. **Create Sharing Link** creates it.
2. Once it is shared, the dialog shows how often the link was viewed and the link itself, `https://prunplanner.org/shared/…`. **Copy URL** copies it, **Stop Sharing** ends it.

Each plan has one link. Opening the dialog again shows the same link and its view count. Every time someone opens the link counts as a view, reloads included. In Management a small eye with the count marks every shared plan.

### What viewers see {#what-viewers-see}

The link always shows your plan as it is saved: its active version, without the unsaved changes you have open. Save the plan, or make another version active ([Versions](/help/plan_saving#versions)), and the next viewer sees that.

> [!tip]
> Share the plan you actually want to discuss. If you keep working on it while people look, save a copy (**Save as copy…** in the save menu) and share that one, so the link doesn't change under them.

### Stopping a link {#stop-sharing}

**Stop Sharing** ends the link at once, without asking. Anyone who opens it then sees "**This shared plan is no longer available**". Deleting the plan ends its link too. If you share the plan again later, it gets a new link; the old one stays dead.

## Opening a shared plan {#shared-view}

A shared link opens the plan page with a banner on top: "**Shared plan**", "Try changes on your own copy. The shared plan never changes."

### Your working copy {#working-copy}

What you see is a working copy. You can change anything you could change in your own plan: buildings, recipes, experts, habitations, the [[empire]] it is calculated with. Undo and Redo work as usual.

- The copy lives only in this browser tab. Leaving the page drops it without asking.
- Habitations stay as the owner set them. Auto-optimising is off until you turn on **Auto** under Infrastructure.
- The tools work on your copy. Built counts in [Construction](/help/plan_tools#construction) and excluded materials in [Visits](/help/plan_tools#visits) last only for the visit, and Repair hides its FIO part. Any [[fio|FIO]] stock the tools use is your own.
- Logged out, you see the plan in the Standard layout and without the POPR tab. Logged in, you see it in your own layout.
- When you open a link to your own plan, PRUNplanner opens the plan itself instead.

### Prices {#shared-prices}

Under the banner's title, a note says which prices the numbers use: "Prices: …" followed by "The person who shared it may see different numbers."

- **Logged in**, the copy is calculated with your default empire (or your first one), so prices follow that empire's [[exchange-preference|exchange preference]] ("your exchange settings: {name}"). An empire without one uses the [[universe]] 30-day average.
- **Logged out**, prices are the universe 30-day average.

> [!tip]
> Comparing notes with the owner? Tell them which exchange preference you use, or both of you check the numbers against the same preference. Profit and payback can differ a lot between exchanges.

### Comparing with the shared version {#vs-shared}

As soon as your copy differs from the shared plan, the banner says "**Changed from the shared version**" and a line under the header lists what moved, after "**vs. shared:**":

| Figure | Shown as |
|---|---|
| Profit | the change in ȼ / day, green when it rose, red when it fell |
| [[ROI]] | the payback before → after, green when it got shorter |
| Area, Workforce, Buildings | the change in area used, workers needed and building count |

Only figures that changed are listed. In Production, changed buildings are tagged **new**, **amount changed** or **recipe changed**, recipes the shared building didn't have are tagged **new**, and removed buildings stay listed, struck through, as **removed**.

### Reset, copy, save {#shared-actions}

- **Reset to shared version** throws your changes away and goes back to the shared plan.
- **Copy changes** puts a summary on your clipboard, ready to paste into Discord: the plan's name and planet, one line per change, profit and payback before → after, the prices you used and the link. It is cut to 2,000 characters, with "…and {n} more" for the rest. A message confirms: "**Changes copied, paste them into Discord**".
- **Save to my plans** (or Ctrl+S, ⌘+S on a Mac) saves your copy, with your changes, as a new plan of your own. The dialog asks for a **Name** (it suggests the plan's name with "(Copy)") and, when you have empires, an **Empire**. **Create** saves it and opens your new plan. The owner's plan and its link stay as they are.
- Not logged in, **Sign up to save this** and **Log in** take their place.

> [!tip]
> Suggesting an improvement to someone's base? Make the change in the copy, check the "vs. shared:" line, then **Copy changes** and paste the summary in the thread. They see exactly what you changed and what it does to profit and payback, with the link to open it themselves.

## Link previews {#link-previews}

Paste a share link into Discord, or another chat app that shows link previews, and it unfolds into a card for the plan. The card is in English.

- **Title**: the planet, then the plan's name, for example "Montem (OT-580b) · Iron base".
- **Text**: who shared it, the profit per day, the payback when the plan pays back ("pays back in 42 days"), the planet's COGC program, the outputs it makes, the price basis of the top output (for example "CI1 30-day average", or "own prices" for a [[fixed-price|fixed price]]) and the date of those prices. It ends with "Open it to see the whole base and try changes, no account needed."
- **Image**: the planet and plan name, who shared it, the profit per day in large figures, the payback, the area used of the area available, and up to four outputs with their amounts per day.

The numbers are the ones PRUNplanner stored with the plan's last save. Creating a link also stores the current numbers when the plan has no unsaved changes. Each save gives the link a fresh card.

When no numbers are stored, for example for a plan last saved before previews existed, or right after you made an older version active, the card shows the planet, the COGC, the building count and what the plan makes, without profit or payback. Save the plan once to add them.

> [!tip]
> Save the plan before you post its link: the card shows the numbers of the last save, so a link posted with unsaved changes shows the old figures.
