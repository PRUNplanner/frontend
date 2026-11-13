How PRUNplanner keeps your work on a [[plan|plan]]: saving, drafts of unsaved changes, undo, copies, named versions you can go back to, and what happens when the same plan is changed in two places. To show a plan to someone else, see [Sharing a plan](/help/plan_sharing).

## Saving and Undo {#saving-and-undo}

Name your plan with the pencil next to its name (Enter or clicking away keeps the name, Esc cancels). Save it with **Save** (**Create** for a new plan) or Ctrl+S (Cmd+S on a Mac).

- **Save** shows only while there is something to save, and stays disabled until the plan has a name.
- A new plan gets its own address once it's created; your empires and links use that.
- Undo, Redo, the plan's state and Save sit together in one control. On a phone, Undo and Redo stay in the header and the state with Save sits above the bottom navigation.

The state tells you where the plan stands:

| State | Meaning |
| --- | --- |
| "Saved …" | Saved at that time; with the version's name after it when it has one. |
| **Unsaved changes** | You changed something since the last save. An amber dot marks it. |
| "Unsaved · draft kept …" | Unsaved, but kept in a [draft](#drafts). |
| **Saving…** | The save is on its way. |
| **Save failed** | The save didn't go through. Your changes are kept; click **Retry save**. |
| **Draft not saved** | Your unsaved changes aren't kept in a draft. Click it to try again. |
| "Name your plan to create it" | A new plan needs a name first. |

Click the state of a saved plan to open its [versions](#versions).

> [!tip]
> **Reload saved version**, the icon next to Save, goes back to the plan as last saved and drops the draft. It asks first when you have unsaved changes.

### Drafts {#drafts}

Once a plan is created, its unsaved changes are kept as a draft about 3 seconds after each change. A reload, a closed tab or a crash doesn't lose them.

- Opening the plan again always shows it as saved. A message ("You have unsaved changes from …") offers **Restore**. Your next change, or opening a version, closes it, and the draft is replaced by your new changes.
- The page warns before you leave only when the draft can't hold your changes: the plan isn't created yet, the last change is less than about 3 seconds old, or the draft failed.

### Undo and Redo {#undo}

Every change can be undone with **Undo** and **Redo**, or Ctrl+Z and Ctrl+Shift+Z (Cmd on a Mac). The keys don't act inside a text field.

- The history holds the last 50 changes.
- It starts fresh when the plan is opened, saved or reloaded, and when you discard changes.
- While you customise the layout, the keys undo layout changes instead, see [Layout](/help/plan_layout).

## Save as copy {#save-as-copy}

The arrow next to Save (**Save options**) has **Save as copy…** for a saved, named plan. It opens **Save As**:

- **Name** starts as the plan's name with " (Copy)".
- An empire select (when you have empires) starts with the empire the plan calculates with; the copy is added to it.
- **Create** saves the plan as it is now, unsaved changes included, as a new plan and opens it in a new tab. Your original keeps its state and its unsaved changes.

> [!tip]
> A copy is the way to try a different layout of the same base and keep both. Name the copies clearly; they're separate plans from then on.

## Versions {#versions}

Every save keeps a version of the plan. Click the state of a saved plan to open **Versions**.

- **Named only** is on by default: the list shows your named versions and the active one, with "… unnamed hidden" at the bottom. Untick it to see all.
- **Active** marks the version your plan is now. "not in empires yet" marks one your empires don't use yet.
- When you have unsaved changes, the top row shows them as **Unsaved changes**, with "Draft kept …" or "Not kept in a draft".
- **Before version history** is the plan as it was before versions existed; **Changed by support** marks a change made by PRUNplanner support.
- Named versions stay. The last 10 unnamed ones are kept, older ones go.

### Naming versions {#naming-versions}

- Open **Save options** (or press Ctrl+Alt+S, Cmd+Option+S on a Mac), type a name in **Version name (optional)** and press Enter or **Save named**. Names can have up to 80 characters. This works for a saved, named plan, also with nothing unsaved: it names the plan as it is now.
- To name a version later, or rename one, use **Name this version** in its ⋯ menu. An empty name removes the name.
- A plan holds at most 20 named versions. At the limit, remove the name of one or delete one before you name another.

### Preview, compare and restore {#preview}

The eye on a version shows it read-only. A banner says which version you're looking at, and the results tiles show its numbers. From there:

- **Compare with current** lists what differs from your plan now.
- **Restore** loads it as unsaved changes. Undo takes it back; saving makes it the active version.
- **Open as new plan** copies it into a new plan in a new tab, named after the plan with the version's name or date. The copy isn't in any empire.
- **Back to current** returns to your plan as it was.

### Make active and delete {#make-active}

- **Make active**, in a version's ⋯ menu or in the preview banner, switches the plan to that version in one step. Your empires and the plan's share link use it right away. It's added as a new version on top ("Restored from …"); the one you picked stays where it is. Unsaved changes are discarded after you confirm.
- **Delete** in the same menu removes a version for good, after you confirm. The active version can't be deleted.
- **Discard changes** in **Save options** drops your unsaved changes and goes back to the saved version, after you confirm.

## Save conflicts {#conflicts}

The same plan can be open in two tabs or on two devices. PRUNplanner never overwrites one with the other without asking.

- When another tab in this browser saves the plan and you have no unsaved changes here, this tab loads the new save. With unsaved changes, a message says "Saved in another tab. Your edits are kept." with **Reload**.
- When you save after the plan was saved elsewhere (another tab or another device), **Saved in another tab** opens. It lists what changed there and what you changed, and offers:

| Option | What it does |
| --- | --- |
| **Save as new plan** | Saves your edits as a copy ("… (copy)") in the plan's empire and opens it; the original keeps the other version. |
| **Overwrite** | Replaces the other version with yours. |
| **Reload** | Drops your edits and loads the saved version. |
| **Keep editing** | Closes the dialog; nothing is saved yet. |

- If the plan was deleted elsewhere, **Deleted in another tab** offers only **Save as new plan**.

Drafts have their own checks:

- **Draft saved elsewhere**: another tab or device kept a newer draft of this plan. Autosave pauses until you pick **Keep mine**, **Load the other draft** or **Decide later**.
- **Unsaved changes on an older version**: you left unsaved changes and the plan was saved again since. Pick **Keep my changes** (on top of the newer save), **Use the saved version** (deletes your unsaved changes) or **Decide later**.

> [!tip]
> Working on one plan from two devices? Save before you switch. Then the other device only has to reload, and you never need the conflict dialog.
