// Fails the build when any request or assertion in a voiden-runner JSON report failed.
// voiden-runner's own exit code only reflects request-level failures, so CI
// reads the report to catch failed assertions as well.
const path = require("node:path");

const reportPath = process.argv[2] || "result.json";
const report = require(path.resolve(reportPath));

const failures = [];
let assertionCount = 0;

for (const req of report.requests) {
  const where = `${req.method} ${req.url} (${path.basename(req.file)})`;
  if (req.success === false) {
    failures.push(`${where}: request failed with ${req.status ?? "no response"} ${req.error ?? req.statusText ?? ""}`.trim());
  }
  for (const entry of req.reportEntries ?? []) {
    if (entry.type !== "assertion") continue;
    assertionCount++;
    if (entry.passed === false) {
      const expected = entry.expected === undefined ? "" : ` ${JSON.stringify(entry.expected)}`;
      const got = entry.actual === undefined ? "nothing" : JSON.stringify(entry.actual);
      failures.push(`${where}: "${entry.message}" expected ${entry.operator}${expected}, got ${got}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`\n✗ API contract broken: ${failures.length} failure(s)\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error("");
  process.exit(1);
}

console.log(`✓ ${report.requests.length} requests and ${assertionCount} assertions passed.`);
