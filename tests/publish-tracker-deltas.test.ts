/**
 * Regression suite for the Publish tracker grids and metadata worksheet — the
 * stale-snapshot data-loss class, publishing flavor. Tracker cells report by-id
 * ops (patchRow/addRow/removeRow) applied against CURRENT rows inside the
 * persistPublishing mutator; metadata categories/formats merge against CURRENT
 * metadata. Filling several cells from one rendered grid must keep them all.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { persistPublishing } from "../src/projects/index-writer";
import {
  ArcReader,
  BudgetItem,
  PublishingData,
  addRow,
  patchRow,
  removeRow,
} from "../src/publishing/publishing-data";
import { FakeApp } from "./fakes/fake-app";

const INDEX_PATH = "Books/My Novel/My Novel.md";
const INDEX = `---
longform:
  format: scenes
  title: My Novel
  sceneFolder: Scenes
  scenes: []
  ignoredFiles: []
---
Body stays untouched.
`;

function publishingOf(app: FakeApp): PublishingData {
  const cache = app.metadataCache.getFileCache(
    app.vault.getAbstractFileByPath(INDEX_PATH) as never
  );
  const ink = (cache?.frontmatter?.["inkswell"] as Record<string, unknown>) ?? {};
  return (ink["publishing"] as PublishingData) ?? {};
}

/** Mirror of LaunchPanel.trackerOps for the budget grid, against the fake app. */
function budgetOp(app: FakeApp, op: (rows: BudgetItem[]) => BudgetItem[]): Promise<void> {
  return persistPublishing(app.asApp(), app.file(INDEX_PATH), (raw) => {
    const pub = raw as PublishingData;
    const rows = op(pub.budget?.items ?? []);
    if (rows.length === 0) delete pub.budget;
    else pub.budget = { items: rows };
  });
}

describe("publish tracker row ops", () => {
  let app: FakeApp;

  beforeEach(() => {
    app = new FakeApp({ [INDEX_PATH]: INDEX });
  });

  it("tabbing across three cells of one row keeps every cell", async () => {
    const row: BudgetItem = { id: "b1", label: "", category: "need" };
    await budgetOp(app, (rows) => addRow(rows, row));
    // Each commit patches ONE field by id — like tabbing Item → Estimate → Actual
    // while the panel never re-rendered (the old code replayed the stale row).
    await budgetOp(app, (rows) => patchRow(rows, "b1", "label", "Editor"));
    await budgetOp(app, (rows) => patchRow(rows, "b1", "estimate", 1200));
    await budgetOp(app, (rows) => patchRow(rows, "b1", "actual", 990));

    expect(publishingOf(app).budget?.items).toEqual([
      { id: "b1", label: "Editor", category: "need", estimate: 1200, actual: 990 },
    ]);
  });

  it("a concurrent add and a cell edit from the same pre-state both land", async () => {
    await budgetOp(app, (rows) => addRow(rows, { id: "b1", label: "Cover", category: "want" }));
    await Promise.all([
      budgetOp(app, (rows) => addRow(rows, { id: "b2", label: "Proofread", category: "need" })),
      budgetOp(app, (rows) => patchRow(rows, "b1", "estimate", 300)),
    ]);
    const items = publishingOf(app).budget?.items ?? [];
    expect(items.map((r) => r.id).sort()).toEqual(["b1", "b2"]);
    expect(items.find((r) => r.id === "b1")?.estimate).toBe(300);
  });

  it("editing a concurrently-removed row drops the edit instead of resurrecting the row", async () => {
    await budgetOp(app, (rows) => addRow(rows, { id: "b1", label: "Ads", category: "want" }));
    await budgetOp(app, (rows) => removeRow(rows, "b1"));
    await budgetOp(app, (rows) => patchRow(rows, "b1", "actual", 50));
    expect(publishingOf(app).budget).toBeUndefined();
  });

  it("addRow is idempotent by id (double-click safe)", async () => {
    const row: ArcReader = { id: "a1", name: "Sam" };
    const once = addRow(addRow([], row), row);
    expect(once).toHaveLength(1);
  });

  it("patchRow with undefined deletes the field", () => {
    const rows: BudgetItem[] = [{ id: "b1", label: "X", category: "need", estimate: 10 }];
    expect(patchRow(rows, "b1", "estimate", undefined)[0]).toEqual({
      id: "b1",
      label: "X",
      category: "need",
    });
  });
});

describe("publish metadata categories/formats merge against current", () => {
  let app: FakeApp;

  beforeEach(() => {
    app = new FakeApp({ [INDEX_PATH]: INDEX });
  });

  it("main and sub categories set from the same rendered form both survive", async () => {
    const save = (patch: Record<string, unknown>) =>
      persistPublishing(app.asApp(), app.file(INDEX_PATH), (raw) => {
        const pub = raw as PublishingData;
        const meta = pub.metadata ?? (pub.metadata = {});
        meta.categories = { ...meta.categories, ...patch };
      });
    await save({ main: "FIC009000" });
    await save({ sub: ["FIC009020", "FIC031010"] });
    expect(publishingOf(app).metadata?.categories).toEqual({
      main: "FIC009000",
      sub: ["FIC009020", "FIC031010"],
    });
  });

  it("editing one format never reverts a sibling format saved meanwhile", async () => {
    const saveFormat = (key: "ebook" | "paperback", info: Record<string, unknown>) =>
      persistPublishing(app.asApp(), app.file(INDEX_PATH), (raw) => {
        const pub = raw as PublishingData;
        const meta = pub.metadata ?? (pub.metadata = {});
        meta.formats = { ...meta.formats, [key]: info };
      });
    await saveFormat("ebook", { enabled: true, price: 4.99 });
    await saveFormat("paperback", { enabled: true, isbn: "978-1-0000-0000-0" });
    expect(publishingOf(app).metadata?.formats).toEqual({
      ebook: { enabled: true, price: 4.99 },
      paperback: { enabled: true, isbn: "978-1-0000-0000-0" },
    });
  });
});
