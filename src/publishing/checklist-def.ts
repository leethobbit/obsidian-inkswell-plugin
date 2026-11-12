/**
 * A self-publishing master checklist as pure data (no Obsidian
 * imports). Phase + task IDs are STABLE constants — stored state keys off them,
 * so labels can be reworded without migrating frontmatter. `deepLink` points a
 * task at an existing Inkswell surface instead of duplicating it.
 */

import { MessageKey, t } from "../i18n";
import { ListOverride, applyGroupedOverride } from "../lib/list-override";

export interface ChecklistTaskDef {
  id: string;
  label: string;
  /** Optional / skippable task. */
  optional?: boolean;
  /** A surface to jump to (handled by the panel), e.g. "compile". */
  deepLink?: "compile";
}

export interface ChecklistPhaseDef {
  id: string;
  label: string;
  tasks: ChecklistTaskDef[];
}

/** List-specific fields a custom task may carry (see settings/overridable-lists). */
export type PublishingExtra = { optional?: boolean; deepLink?: "compile" };

/**
 * The effective checklist: shipped phases/tasks minus hidden ones, renamed
 * where the writer renamed them, plus custom phases and tasks. Render from this,
 * never from PUBLISHING_CHECKLIST (AGENTS.md gotcha 17). Phases = groups.
 */
export function publishingChecklist(override?: ListOverride<PublishingExtra>): ChecklistPhaseDef[] {
  const shipped = PUBLISHING_CHECKLIST.map((p) => ({ id: p.id, label: p.label, items: p.tasks }));
  return applyGroupedOverride(shipped, override)
    .filter((g) => !g.hidden)
    .map((g) => ({
      id: g.id,
      label: g.label,
      tasks: g.items
        .filter((i) => !i.hidden)
        .map((i) => {
          const task: ChecklistTaskDef = { id: i.id, label: i.label };
          if (i.extra.optional) task.optional = true;
          if (i.extra.deepLink) task.deepLink = i.extra.deepLink;
          return task;
        }),
    }));
}

/**
 * A shipped task whose label is looked up through `t()` on every read, never at
 * import (the catalog is picked in onload). Ids stay the stored keys; consumers
 * (resolver, Customize, overridable-lists) keep reading `.label`.
 */
function task(id: string, key: MessageKey, extra: Omit<ChecklistTaskDef, "id" | "label"> = {}): ChecklistTaskDef {
  return {
    id,
    get label() {
      return t(key);
    },
    ...extra,
  };
}

export const PUBLISHING_CHECKLIST: ChecklistPhaseDef[] = [
  {
    id: "writing",
    get label() {
      return t("checklist.phase.writing");
    },
    tasks: [task("draft", "checklist.task.draft")],
  },
  {
    id: "editing",
    get label() {
      return t("checklist.phase.editing");
    },
    tasks: [
      task("selfEdit", "checklist.task.selfEdit"),
      task("critique", "checklist.task.critique", { optional: true }),
      task("beta", "checklist.task.beta", { optional: true }),
      task("preflight", "checklist.task.preflight", { deepLink: "compile" }),
      task("hireEditor", "checklist.task.hireEditor"),
      task("incorporate", "checklist.task.incorporate"),
    ],
  },
  {
    id: "foundational",
    get label() {
      return t("checklist.phase.foundational");
    },
    tasks: [
      task("genre", "checklist.task.genre"),
      task("targetReader", "checklist.task.targetReader"),
      task("authorName", "checklist.task.authorName"),
      task("business", "checklist.task.business", { optional: true }),
      task("budget", "checklist.task.budget"),
    ],
  },
  {
    id: "building",
    get label() {
      return t("checklist.phase.building");
    },
    tasks: [
      task("metadata", "checklist.task.metadata"),
      task("formats", "checklist.task.formats"),
      task("frontMatter", "checklist.task.frontMatter"),
      task("backMatter", "checklist.task.backMatter"),
    ],
  },
  {
    id: "cover",
    get label() {
      return t("checklist.phase.cover");
    },
    tasks: [
      task("comps", "checklist.task.comps"),
      task("designer", "checklist.task.designer"),
      task("finalize", "checklist.task.finalize"),
    ],
  },
  {
    id: "formatting",
    get label() {
      return t("checklist.phase.formatting");
    },
    tasks: [
      task("method", "checklist.task.method"),
      task("interior", "checklist.task.interior", { deepLink: "compile" }),
      task("referenceDoc", "checklist.task.referenceDoc", { deepLink: "compile" }),
      task("finalFiles", "checklist.task.finalFiles"),
    ],
  },
  {
    id: "prepare",
    get label() {
      return t("checklist.phase.prepare");
    },
    tasks: [
      task("platforms", "checklist.task.platforms"),
      task("releaseDate", "checklist.task.releaseDate"),
      task("preorder", "checklist.task.preorder"),
      task("pricing", "checklist.task.pricing"),
      task("isbns", "checklist.task.isbns"),
      task("keywords", "checklist.task.keywords"),
      task("categories", "checklist.task.categories"),
    ],
  },
  {
    id: "publishing",
    get label() {
      return t("checklist.phase.publishing");
    },
    tasks: [
      task("accounts", "checklist.task.accounts"),
      task("upload", "checklist.task.upload"),
      task("proof", "checklist.task.proof"),
      task("approve", "checklist.task.approve"),
      task("submit", "checklist.task.submit"),
    ],
  },
  {
    id: "marketingFoundations",
    get label() {
      return t("checklist.phase.marketingFoundations");
    },
    tasks: [
      task("website", "checklist.task.website"),
      task("newsletter", "checklist.task.newsletter"),
      task("social", "checklist.task.social"),
      task("goodreads", "checklist.task.goodreads"),
    ],
  },
  {
    id: "marketing",
    get label() {
      return t("checklist.phase.marketing");
    },
    tasks: [
      task("arcs", "checklist.task.arcs"),
      task("preorderCampaign", "checklist.task.preorderCampaign"),
      task("giveaway", "checklist.task.giveaway", { optional: true }),
      task("coverReveal", "checklist.task.coverReveal", { optional: true }),
      task("launchParty", "checklist.task.launchParty", { optional: true }),
      task("pricePromo", "checklist.task.pricePromo", { optional: true }),
      task("bookbub", "checklist.task.bookbub", { optional: true }),
      task("ads", "checklist.task.ads", { optional: true }),
      task("swaps", "checklist.task.swaps", { optional: true }),
    ],
  },
];
