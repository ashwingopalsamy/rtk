/**
 * Unit tests for changelog/scripts/validate.ts
 * Run with: pnpm test:changelog
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { validateFragment } from "./validate.js";

function writeTmp(filename: string, content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rtk-validate-"));
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, content, "utf8");
  return filepath;
}

describe("validateFragment", () => {
  it("valid fragment passes with no errors", () => {
    const fp = writeTmp(
      "123-add-feature.yml",
      `pr: 123\ntype: feat\nscope: "hook"\ntitle: "Add support for hook filtering"\nbreaking: false\nmigration: false\nscripts: []\n`
    );
    const errors = validateFragment(fp);
    assert.deepEqual(errors, []);
  });

  it("missing pr field returns error", () => {
    const fp = writeTmp(
      "456-fix-bug.yml",
      `type: fix\nscope: "git"\ntitle: "Fix log filter"\n`
    );
    const errors = validateFragment(fp);
    assert.ok(
      errors.some((e) => e.includes("pr")),
      `Expected error about 'pr', got: ${JSON.stringify(errors)}`
    );
  });

  it("missing type field returns error", () => {
    const fp = writeTmp(
      "789-fix-bug.yml",
      `pr: 789\nscope: "git"\ntitle: "Fix log filter"\n`
    );
    const errors = validateFragment(fp);
    assert.ok(
      errors.some((e) => e.includes("type")),
      `Expected error about 'type', got: ${JSON.stringify(errors)}`
    );
  });

  it("missing scope field returns error", () => {
    const fp = writeTmp(
      "101-feat.yml",
      `pr: 101\ntype: feat\ntitle: "Some feature"\n`
    );
    const errors = validateFragment(fp);
    assert.ok(
      errors.some((e) => e.includes("scope")),
      `Expected error about 'scope', got: ${JSON.stringify(errors)}`
    );
  });

  it("missing title field returns error", () => {
    const fp = writeTmp(
      "202-feat.yml",
      `pr: 202\ntype: feat\nscope: "core"\n`
    );
    const errors = validateFragment(fp);
    assert.ok(
      errors.some((e) => e.includes("title")),
      `Expected error about 'title', got: ${JSON.stringify(errors)}`
    );
  });

  it("type not in enum returns error", () => {
    const fp = writeTmp(
      "303-stuff.yml",
      `pr: 303\ntype: stuff\nscope: "core"\ntitle: "Something"\n`
    );
    const errors = validateFragment(fp);
    assert.ok(
      errors.some((e) => e.includes("type")),
      `Expected error about 'type' enum, got: ${JSON.stringify(errors)}`
    );
  });

  it("title longer than 80 chars returns error", () => {
    const longTitle = "A".repeat(81);
    const fp = writeTmp(
      "404-feat.yml",
      `pr: 404\ntype: feat\nscope: "core"\ntitle: "${longTitle}"\n`
    );
    const errors = validateFragment(fp);
    assert.ok(
      errors.some((e) => e.includes("title") && e.includes("80")),
      `Expected error about title length, got: ${JSON.stringify(errors)}`
    );
  });

  it("PR number in filename doesn't match pr field returns error", () => {
    const fp = writeTmp(
      "500-feat.yml",
      `pr: 999\ntype: feat\nscope: "core"\ntitle: "Something"\n`
    );
    const errors = validateFragment(fp);
    assert.ok(
      errors.some((e) => e.toLowerCase().includes("mismatch") || e.includes("500") || e.includes("999")),
      `Expected PR mismatch error, got: ${JSON.stringify(errors)}`
    );
  });

  it("scripts field with non-string items returns error", () => {
    const fp = writeTmp(
      "600-feat.yml",
      `pr: 600\ntype: feat\nscope: "db"\ntitle: "Migrate schema"\nscripts:\n  - 42\n  - true\n`
    );
    const errors = validateFragment(fp);
    assert.ok(
      errors.some((e) => e.includes("scripts")),
      `Expected error about scripts, got: ${JSON.stringify(errors)}`
    );
  });

  it("valid fragment with all optional fields passes", () => {
    const fp = writeTmp(
      "700-migration.yml",
      [
        "pr: 700",
        'type: fix',
        'scope: "db"',
        'title: "Run schema migration"',
        "description: |",
        "  Adds a new index to the users table.",
        "breaking: false",
        "migration: true",
        "scripts:",
        "  - psql -d mydb -c 'CREATE INDEX ...'",
      ].join("\n") + "\n"
    );
    const errors = validateFragment(fp);
    assert.deepEqual(errors, []);
  });
});
