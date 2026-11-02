# Developer & agent docs

Reference docs for this codebase. They name files and symbols instead of
copying code; when a doc and the code disagree, the code wins and the doc
gets fixed. Rules, commands and the doc map are in the root
[AGENTS.md](../AGENTS.md).

Start with [architecture.md](architecture.md), then the doc for the area you
touch. [features/](features/README.md) has one page per `src/features/*`
folder.

## Writing docs

- Name files and symbols; no line numbers.
- Keep pages short: purpose, key files, how it works, gotchas, how to
  extend. No history or changelog; that is what git is for.
- A new feature folder gets `features/<name>.md` and a row in
  [features/README.md](features/README.md).
