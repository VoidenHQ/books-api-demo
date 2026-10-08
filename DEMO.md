# Demo runbook

Four acts, about ten minutes. Replace `<DEPLOYED_URL>` with the hosted API URL.

## Before you start

- [ ] Hit `<DEPLOYED_URL>/health` a minute before the demo. Free hosting tiers sleep and the first request can take up to a minute.
- [ ] `curl -X POST <DEPLOYED_URL>/reset -H 'x-api-key: demo-key'` to restore the seeded books.
- [ ] Postman: import `postman/Books API.postman_collection.json`, set the collection variable `base_url` to `<DEPLOYED_URL>`.
- [ ] Voiden: have an empty project folder ready for the import (not this repo's `api-tests/`).
- [ ] Claude Code / Codex: Voiden skill switched on in Voiden → Settings.
- [ ] GitHub: this repo open on the Actions tab, last run on `main` green.

## Act 1: the service and the Postman collection

1. Show `<DEPLOYED_URL>/books` in a browser: a real, hosted API.
2. In Postman, open **Books → Create Book**.
   - **Pre-request** tab: generates an `X-Request-Id` header.
   - **Tests** tab: checks the status and body, then saves `book_id`.
3. Run the collection (Run collection → Run). 7 requests, all green. Point out that Get, Update, Patch, and Delete all reuse the `book_id` captured by Create.

## Act 2: import with the Postman plugin

1. In Voiden, open the empty project and drop `Books API.postman_collection.json` into it.
2. Open the file and click **Import into Voiden**.
3. Result: a `Books API/` folder, one `.void` file per request, folders mirrored. The collection variables (`base_url`, `api_key`, `book_id`) land in the environment.
4. Open **Create Book**: the Postman scripts are now live `voiden.*` scripts, not commented out. Run it.

> Known gap, so it does not surprise you live: the plugin keeps `{{book_id}}` as written.
> In Voiden a value saved by a script is read as `{{process.book_id}}`, so the imported
> Get/Update/Patch/Delete resolve `book_id` from the environment (`1`, a seeded book)
> rather than the book you just created. They still run and pass their status checks,
> but the title assertions on Get fail. Either stop Act 2 after Create and List, or use
> it as the bridge to Act 3: "the plugin is a 1:1 mechanical import; the skill understands the flow."

## Act 3: import with the Voiden skill (Claude / Codex / Copilot)

In an empty folder containing only the collection JSON, give the agent this prompt:

```
Convert "Books API.postman_collection.json" into Voiden requests using the voiden skill.
Use {{base_url}} and {{api_key}} from the environment, and create .voiden/env-public.yaml
with base_url=<DEPLOYED_URL> and api_key=demo-key. Then run it and confirm every section passes.
```

What to point out in the result:

- One `books-api.void` file with seven sections, instead of seven files.
- Chaining is wired correctly: `{{process.book_id}}`.
- Pre and post scripts are translated to `voiden.*`.
- With the `voiden-mcp` skill on, the agent runs the requests itself and reports real results.

Open the file in Voiden and press **Run All** (`⌘⇧↵`).

`api-tests/books-api.void` in this repo is the expected output, if you want a fallback.

Agent support: the Voiden app installs the skill for Claude Code and Codex. It has no
Copilot installer today. For Copilot, copy `~/.claude/skills/voiden/` into the project
as `.github/skills/voiden/` (untested; try it before the demo).

## Act 4: break the API, watch the pipeline fail

The pipeline starts the API from the commit under test and runs `api-tests/` against it,
so an API change and its test result are in the same run.

```bash
git checkout -b rename-title
./scripts/break-api.sh              # renames `title` to `name` in every response
git commit -am "Rename title to name"
git push -u origin rename-title
gh pr create --fill
```

1. Show the one-line diff in `server.js`. It looks harmless.
2. Open the PR's checks. **API tests (Voiden)** goes red at **Check assertions**:

   ```
   ✗ API contract broken: 7 failure(s)
     - POST http://localhost:3000/books (books-api.void): "Title is returned" expected equals "Voiden in Action", got nothing
     ...
   ```
3. Optional: download the `voiden-run-report` artifact for the full request/response record.

Reset afterwards: close the PR and delete the branch.

Same thing locally, if the network misbehaves:

```bash
node server.js &            # then, in another terminal
npm run test:api            # green
./scripts/break-api.sh      # restart the server, run again: red
git checkout server.js
```

## Things that can bite

| Risk | Mitigation |
|---|---|
| Hosted API is asleep | Warm it up before you start |
| Someone deleted the seeded books | `POST /reset` |
| `voiden-runner` exits 0 when only assertions fail | Already handled by `scripts/check-assertions.js` in both pipelines |
| A deliberate 4xx request counts as a failed request in the runner | The collection has none, keep it that way |
