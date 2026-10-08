// Books API — a deliberately small CRUD service for Voiden demos.
// Zero dependencies: `node server.js` is all it takes, locally or in CI.
const http = require("node:http");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "demo-key";

const SEED = [
  { id: "1", title: "The Pragmatic Programmer", author: "Andrew Hunt", price: 39.99, inStock: true },
  { id: "2", title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", price: 49.5, inStock: true },
  { id: "3", title: "Refactoring", author: "Martin Fowler", price: 44.0, inStock: false },
];

let books;
let nextId;

function reset() {
  const createdAt = new Date().toISOString();
  books = new Map(SEED.map((b) => [b.id, { ...b, createdAt, updatedAt: createdAt }]));
  nextId = 100;
}
reset();

// The public shape of a book. This is the API contract the .void tests assert on.
function toResponse(book) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    price: book.price,
    inStock: book.inStock,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}

function send(res, status, body) {
  if (body === undefined) {
    res.writeHead(status);
    return res.end();
  }
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) reject(new Error("Body too large"));
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Body must be valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function validate(input, { partial }) {
  const errors = [];
  const has = (key) => input[key] !== undefined;
  if (!partial || has("title")) {
    if (typeof input.title !== "string" || !input.title.trim()) errors.push("title is required");
  }
  if (!partial || has("author")) {
    if (typeof input.author !== "string" || !input.author.trim()) errors.push("author is required");
  }
  if (has("price") && (typeof input.price !== "number" || input.price < 0)) {
    errors.push("price must be a non-negative number");
  }
  if (has("inStock") && typeof input.inStock !== "boolean") errors.push("inStock must be a boolean");
  return errors;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, X-Request-Id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "X-Request-Id");
  // Echo the caller's request id so pre-request scripts have something to assert on.
  if (req.headers["x-request-id"]) res.setHeader("X-Request-Id", req.headers["x-request-id"]);
  if (method === "OPTIONS") return send(res, 204);

  try {
    if (path === "/" && method === "GET") {
      return send(res, 200, {
        name: "Books API",
        docs: "https://github.com/VoidenHQ/voiden",
        endpoints: ["GET /health", "GET /books", "POST /books", "GET /books/:id", "PUT /books/:id", "PATCH /books/:id", "DELETE /books/:id", "POST /reset"],
      });
    }
    if (path === "/health" && method === "GET") {
      return send(res, 200, { status: "ok", books: books.size });
    }

    const isWrite = method !== "GET";
    if (isWrite && req.headers["x-api-key"] !== API_KEY) {
      return send(res, 401, { error: "Missing or invalid x-api-key header" });
    }

    if (path === "/reset" && method === "POST") {
      reset();
      return send(res, 200, { status: "reset", books: books.size });
    }

    if (path === "/books" && method === "GET") {
      const author = url.searchParams.get("author");
      let items = [...books.values()];
      if (author) items = items.filter((b) => b.author.toLowerCase().includes(author.toLowerCase()));
      return send(res, 200, { items: items.map(toResponse), total: items.length });
    }

    if (path === "/books" && method === "POST") {
      const input = await readJson(req);
      const errors = validate(input, { partial: false });
      if (errors.length) return send(res, 400, { error: "Validation failed", details: errors });
      const now = new Date().toISOString();
      const book = {
        id: String(nextId++),
        title: input.title.trim(),
        author: input.author.trim(),
        price: input.price ?? 0,
        inStock: input.inStock ?? true,
        createdAt: now,
        updatedAt: now,
      };
      books.set(book.id, book);
      res.setHeader("Location", `/books/${book.id}`);
      return send(res, 201, toResponse(book));
    }

    const match = path.match(/^\/books\/([^/]+)$/);
    if (match) {
      const book = books.get(decodeURIComponent(match[1]));
      if (!book) return send(res, 404, { error: "Book not found" });

      if (method === "GET") return send(res, 200, toResponse(book));

      if (method === "PUT" || method === "PATCH") {
        const input = await readJson(req);
        const errors = validate(input, { partial: method === "PATCH" });
        if (errors.length) return send(res, 400, { error: "Validation failed", details: errors });
        const next =
          method === "PUT"
            ? { title: input.title.trim(), author: input.author.trim(), price: input.price ?? 0, inStock: input.inStock ?? true }
            : Object.fromEntries(["title", "author", "price", "inStock"].filter((k) => input[k] !== undefined).map((k) => [k, input[k]]));
        Object.assign(book, next, { updatedAt: new Date().toISOString() });
        return send(res, 200, toResponse(book));
      }

      if (method === "DELETE") {
        books.delete(book.id);
        return send(res, 204);
      }
    }

    return send(res, 404, { error: `No route for ${method} ${path}` });
  } catch (err) {
    return send(res, 400, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`Books API listening on http://localhost:${PORT}`));
