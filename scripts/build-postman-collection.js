// Regenerates postman/Books API.postman_collection.json.
// Scripts are kept as plain arrays here so they stay readable in review.
const fs = require("node:fs");
const path = require("node:path");

const script = (listen, lines) => ({ listen, script: { type: "text/javascript", exec: lines } });
const url = (...segments) => ({
  raw: ["{{base_url}}", ...segments].join("/"),
  host: ["{{base_url}}"],
  path: segments,
});
const jsonHeader = { key: "Content-Type", value: "application/json" };
const apiKeyHeader = { key: "x-api-key", value: "{{api_key}}", description: "Required for every write" };
const jsonBody = (obj) => ({
  mode: "raw",
  raw: JSON.stringify(obj, null, 2),
  options: { raw: { language: "json" } },
});

const requestIdPreScript = (action) =>
  script("prerequest", [
    'const requestId = "demo-" + Date.now();',
    'pm.request.headers.add({ key: "X-Request-Id", value: requestId });',
    `console.log("${action} with request id", requestId);`,
  ]);

const collection = {
  info: {
    name: "Books API",
    description: "CRUD collection for the Books API demo service. Run top to bottom: Create Book stores `book_id`, and every later request reuses it.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "base_url", value: "http://localhost:3000" },
    { key: "api_key", value: "demo-key" },
    { key: "book_id", value: "1" },
  ],
  item: [
    {
      name: "Health Check",
      request: { method: "GET", header: [], url: url("health"), description: "Liveness probe. No auth required." },
      event: [
        script("test", [
          "const body = pm.response.json();",
          'pm.test("Service is up", function () {',
          "    pm.response.to.have.status(200);",
          '    pm.expect(body.status).to.eql("ok");',
          "});",
        ]),
      ],
    },
    {
      name: "Books",
      description: "Create, read, update, and delete a book.",
      item: [
        {
          name: "Create Book",
          request: {
            method: "POST",
            header: [jsonHeader, apiKeyHeader],
            url: url("books"),
            body: jsonBody({ title: "Voiden in Action", author: "Ada Lovelace", price: 29.99, inStock: true }),
            description: "Creates a book and stores its id in `book_id` for the requests that follow.",
          },
          event: [
            requestIdPreScript("Creating book"),
            script("test", [
              "const body = pm.response.json();",
              'pm.test("Book is created", function () {',
              "    pm.response.to.have.status(201);",
              '    pm.expect(body.id).to.be.a("string");',
              '    pm.expect(body.title).to.eql("Voiden in Action");',
              '    pm.expect(body.author).to.eql("Ada Lovelace");',
              "});",
              'pm.test("Request id is echoed back", function () {',
              '    pm.expect(pm.response.headers.get("x-request-id")).to.match(/^demo-/);',
              "});",
              'pm.collectionVariables.set("book_id", body.id);',
              'console.log("Saved book_id", body.id);',
            ]),
          ],
        },
        {
          name: "List Books",
          request: { method: "GET", header: [], url: url("books"), description: "Returns every book. Supports `?author=` filtering." },
          event: [
            script("test", [
              "const body = pm.response.json();",
              'pm.test("List contains books", function () {',
              "    pm.response.to.have.status(200);",
              "    pm.expect(body.total).to.be.above(0);",
              "    pm.expect(body.items.length).to.eql(body.total);",
              "});",
              'pm.test("Responds quickly", function () {',
              "    pm.expect(pm.response.responseTime).to.be.below(5000);",
              "});",
            ]),
          ],
        },
        {
          name: "Get Book",
          request: { method: "GET", header: [], url: url("books", "{{book_id}}"), description: "Fetches the book created above." },
          event: [
            script("test", [
              "const body = pm.response.json();",
              'pm.test("Returns the created book", function () {',
              "    pm.response.to.have.status(200);",
              '    pm.expect(body.id).to.eql(pm.collectionVariables.get("book_id"));',
              '    pm.expect(body).to.have.property("title");',
              "});",
            ]),
          ],
        },
        {
          name: "Update Book",
          request: {
            method: "PUT",
            header: [jsonHeader, apiKeyHeader],
            url: url("books", "{{book_id}}"),
            body: jsonBody({ title: "Voiden in Action, 2nd Edition", author: "Ada Lovelace", price: 34.99, inStock: true }),
            description: "Replaces the whole book.",
          },
          event: [
            requestIdPreScript("Updating book"),
            script("test", [
              "const body = pm.response.json();",
              'pm.test("Book is replaced", function () {',
              "    pm.response.to.have.status(200);",
              '    pm.expect(body.title).to.eql("Voiden in Action, 2nd Edition");',
              "    pm.expect(body.price).to.eql(34.99);",
              "});",
            ]),
          ],
        },
        {
          name: "Patch Book Price",
          request: {
            method: "PATCH",
            header: [jsonHeader, apiKeyHeader],
            url: url("books", "{{book_id}}"),
            body: jsonBody({ price: 24.99, inStock: false }),
            description: "Partial update: only the fields sent are changed.",
          },
          event: [
            script("test", [
              "const body = pm.response.json();",
              'pm.test("Only price and stock change", function () {',
              "    pm.response.to.have.status(200);",
              "    pm.expect(body.price).to.eql(24.99);",
              "    pm.expect(body.inStock).to.be.false;",
              '    pm.expect(body.title).to.eql("Voiden in Action, 2nd Edition");',
              "});",
            ]),
          ],
        },
        {
          name: "Delete Book",
          request: { method: "DELETE", header: [apiKeyHeader], url: url("books", "{{book_id}}"), description: "Removes the book." },
          event: [
            script("test", [
              'pm.test("Book is deleted", function () {',
              "    pm.response.to.have.status(204);",
              "});",
            ]),
          ],
        },
      ],
    },
  ],
};

const out = path.join(__dirname, "..", "postman", "Books API.postman_collection.json");
fs.writeFileSync(out, JSON.stringify(collection, null, 2) + "\n");
console.log("Wrote", out);
