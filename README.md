# Books API demo

A tiny CRUD service plus everything needed to demo [Voiden](https://voiden.md) against it:

| Path | What it is |
|---|---|
| `server.js` | The Books API. Zero dependencies, in-memory data. |
| `postman/Books API.postman_collection.json` | Postman v2.1 collection: full CRUD with pre-request and test scripts. |
| `api-tests/` | A Voiden project: the same flow as one multi-section `.void` file. |
| `.github/workflows/api-tests.yml`, `.gitlab-ci.yml` | Pipelines that run the `.void` tests with `voiden-runner` on every change. |
| `scripts/break-api.sh` | Makes a breaking change to the API so you can watch the pipeline fail. |

## Run it

```bash
node server.js            # http://localhost:3000
```

Writes need the header `x-api-key: demo-key` (override with the `API_KEY` env var).

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness probe |
| GET | `/books` | `?author=` filters |
| POST | `/books` | `{ title, author, price?, inStock? }` → 201 |
| GET | `/books/:id` | 404 if missing |
| PUT | `/books/:id` | Full replace |
| PATCH | `/books/:id` | Partial update |
| DELETE | `/books/:id` | 204 |
| POST | `/reset` | Restores the three seeded books |

## Test it

```bash
npm install -g @voiden/runner
npm run test:api          # needs the server running on :3000
```

## Deploy it

Any Node or container host works. The service listens on `$PORT` (default 3000), keeps its
data in memory, and needs no database, so run a single instance.

```bash
docker build -t books-api-demo .
docker run -p 3000:3000 -e API_KEY=demo-key books-api-demo
```

Health check path: `/health`. `render.yaml` is also included as a one-click Render blueprint.
