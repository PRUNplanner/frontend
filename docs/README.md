# Developer & agent docs

These are reference docs for working in this codebase. They point to code and
don't copy it, so the code stays the source of truth. If a doc and the code
disagree, trust the code and fix the doc.

## Reading order

1. [architecture.md](architecture.md): how `src/` is laid out and how a page
   comes together.
2. [data-layer.md](data-layer.md): API → query cache → IndexedDB/Pinia.
3. [planning-engine.md](planning-engine.md): the core plan, empire and profit
   calculations.
4. [domain-glossary.md](domain-glossary.md): game vocabulary, each term mapped
   to its code.
5. [ui-and-i18n.md](ui-and-i18n.md): the UI kit, styling and translations.
6. [testing.md](testing.md): Vitest setup, mocking and test isolation.
7. [features/](features/README.md): one page per `src/features/*` folder.

The rules and the command cheat-sheet are in the root [AGENTS.md](../AGENTS.md).

## Doc conventions

- Name files and symbols, but leave out line numbers, which go stale quickly.
- Keep each page short. Cover purpose, key files, how it works, gotchas, and
  how to extend it.
- When you add a feature folder, add `features/<name>.md` and a row in
  [features/README.md](features/README.md).
