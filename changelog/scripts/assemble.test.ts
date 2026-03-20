/**
 * Unit tests for changelog/scripts/assemble.ts
 * Run with: pnpm test:changelog
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSection, Fragment } from "./assemble.js";

function entry(fragment: Fragment, file = `${fragment.pr}-fragment.yml`) {
  return { fragment, file };
}

const BASE_FEAT: Fragment = {
  pr: 1,
  type: "feat",
  scope: "hook",
  title: "Add hook filtering support",
};

const BASE_FIX: Fragment = {
  pr: 2,
  type: "fix",
  scope: "git",
  title: "Fix log filter",
};

describe("buildSection", () => {
  it("empty fragments list returns section header with no type groups", () => {
    const result = buildSection("1.0.0", "2026-01-01", []);
    assert.ok(result.includes("## [1.0.0] - 2026-01-01"), "Should contain version header");
    assert.ok(!result.includes("###"), "Should have no type sections for empty input");
  });

  it("single feat fragment appears under Nouvelles Fonctionnalités", () => {
    const result = buildSection("1.0.0", "2026-01-01", [entry(BASE_FEAT)]);
    assert.ok(result.includes("✨ Nouvelles Fonctionnalités"), "Should include feat section label");
    assert.ok(result.includes("Add hook filtering support"), "Should include fragment title");
    assert.ok(result.includes("(#1)"), "Should include PR number");
  });

  it("single fix fragment appears under Corrections de Bugs", () => {
    const result = buildSection("1.0.0", "2026-01-01", [entry(BASE_FIX)]);
    assert.ok(result.includes("🔧 Corrections de Bugs"), "Should include fix section label");
    assert.ok(result.includes("Fix log filter"), "Should include fragment title");
    assert.ok(result.includes("(#2)"), "Should include PR number");
  });

  it("breaking: true fragment appears under Breaking Changes", () => {
    const fragment: Fragment = { ...BASE_FEAT, breaking: true };
    const result = buildSection("2.0.0", "2026-02-01", [entry(fragment)]);
    assert.ok(result.includes("🔨 Breaking Changes"), "Should include breaking changes section");
    assert.ok(result.includes("Add hook filtering support"), "Should include fragment title");
  });

  it("migration: true fragment line includes migration warning", () => {
    const fragment: Fragment = { ...BASE_FIX, migration: true };
    const result = buildSection("1.1.0", "2026-01-15", [entry(fragment)]);
    assert.ok(result.includes("⚠️ Migration DB."), "Should include migration warning marker");
  });

  it("scripts non-empty causes fragment to appear under Scripts Post-Deploy", () => {
    const fragment: Fragment = {
      ...BASE_FIX,
      scripts: ["psql -d mydb -c 'ALTER TABLE ...'"],
    };
    const result = buildSection("1.1.0", "2026-01-15", [entry(fragment)]);
    assert.ok(result.includes("🔧 Scripts Post-Deploy"), "Should include scripts section");
    assert.ok(result.includes("psql -d mydb"), "Should include the script content");
  });

  it("type ordering: feat before fix before security in output", () => {
    const secFragment: Fragment = { pr: 3, type: "security", scope: "auth", title: "Patch XSS" };
    const entries = [entry(BASE_FIX), entry(secFragment), entry(BASE_FEAT)];
    const result = buildSection("1.2.0", "2026-03-01", entries);

    const featIdx = result.indexOf("✨ Nouvelles Fonctionnalités");
    const fixIdx = result.indexOf("🔧 Corrections de Bugs");
    const secIdx = result.indexOf("🔒 Sécurité");

    assert.ok(featIdx !== -1, "feat section should be present");
    assert.ok(fixIdx !== -1, "fix section should be present");
    assert.ok(secIdx !== -1, "security section should be present");
    assert.ok(featIdx < fixIdx, "feat should come before fix");
    assert.ok(fixIdx < secIdx, "fix should come before security");
  });

  it("multiple fragments of same type all appear in the same section", () => {
    const fix2: Fragment = { pr: 10, type: "fix", scope: "cargo", title: "Fix cargo output" };
    const result = buildSection("1.0.1", "2026-01-20", [entry(BASE_FIX), entry(fix2)]);

    assert.equal(
      (result.match(/🔧 Corrections de Bugs/g) ?? []).length,
      1,
      "Should have exactly one fix section heading"
    );
    assert.ok(result.includes("Fix log filter"), "Should include first fix fragment");
    assert.ok(result.includes("Fix cargo output"), "Should include second fix fragment");
  });

  it("PR number appears in output as (#123)", () => {
    const fragment: Fragment = { pr: 123, type: "feat", scope: "core", title: "Big feature" };
    const result = buildSection("1.5.0", "2026-04-01", [entry(fragment)]);
    assert.ok(result.includes("(#123)"), "Should format PR as (#123)");
  });
});
