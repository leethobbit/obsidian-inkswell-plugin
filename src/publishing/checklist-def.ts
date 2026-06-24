/**
 * The Self-Publisher's Workbook master checklist as pure data (no Obsidian
 * imports). Phase + task IDs are STABLE constants — stored state keys off them,
 * so labels can be reworded without migrating frontmatter. `deepLink` points a
 * task at an existing Inkswell surface instead of duplicating it.
 */

export interface ChecklistTaskDef {
  id: string;
  label: string;
  /** Workbook ✦ — optional/skippable. */
  optional?: boolean;
  /** A surface to jump to (handled by the panel), e.g. "compile". */
  deepLink?: "compile";
}

export interface ChecklistPhaseDef {
  id: string;
  label: string;
  tasks: ChecklistTaskDef[];
}

export const PUBLISHING_CHECKLIST: ChecklistPhaseDef[] = [
  {
    id: "writing",
    label: "Writing",
    tasks: [{ id: "draft", label: "Write the first draft" }],
  },
  {
    id: "editing",
    label: "Editing",
    tasks: [
      { id: "selfEdit", label: "Complete self-edits" },
      { id: "critique", label: "Work with a critique partner", optional: true },
      { id: "beta", label: "Work with beta readers", optional: true },
      { id: "preflight", label: "Run the pre-export check", deepLink: "compile" },
      { id: "hireEditor", label: "Hire an editor" },
      { id: "incorporate", label: "Incorporate editorial feedback" },
    ],
  },
  {
    id: "foundational",
    label: "Foundational decisions",
    tasks: [
      { id: "genre", label: "Determine genre & subgenres" },
      { id: "targetReader", label: "Define target reader profile" },
      { id: "authorName", label: "Choose author name (legal or pen name)" },
      { id: "business", label: "Set up an author business", optional: true },
      { id: "budget", label: "Build a budget for this book" },
    ],
  },
  {
    id: "building",
    label: "Building the book",
    tasks: [
      { id: "metadata", label: "Fill out the book metadata worksheet" },
      { id: "formats", label: "Select formats (eBook / paperback / hardcover)" },
      { id: "frontMatter", label: "Create front matter" },
      { id: "backMatter", label: "Create back matter" },
    ],
  },
  {
    id: "cover",
    label: "Cover design",
    tasks: [
      { id: "comps", label: "Research comparison covers" },
      { id: "designer", label: "Research & hire a cover designer" },
      { id: "finalize", label: "Finalize covers for each format" },
    ],
  },
  {
    id: "formatting",
    label: "Formatting",
    tasks: [
      { id: "method", label: "Choose a formatting method" },
      { id: "interior", label: "Finalize interior styles", deepLink: "compile" },
      { id: "referenceDoc", label: "Generate the reference doc (Word styling)", deepLink: "compile" },
      { id: "finalFiles", label: "Produce final files per format" },
    ],
  },
  {
    id: "prepare",
    label: "Prepare for publication",
    tasks: [
      { id: "platforms", label: "Select publishing platforms" },
      { id: "releaseDate", label: "Choose a release date" },
      { id: "preorder", label: "Decide on a pre-order" },
      { id: "pricing", label: "Finalize pricing per format" },
      { id: "isbns", label: "Obtain ISBNs" },
      { id: "keywords", label: "Determine keywords" },
      { id: "categories", label: "Determine categories (BISAC)" },
    ],
  },
  {
    id: "publishing",
    label: "Publishing",
    tasks: [
      { id: "accounts", label: "Set up platform account(s)" },
      { id: "upload", label: "Upload metadata, content, cover & files" },
      { id: "proof", label: "Review proof(s)" },
      { id: "approve", label: "Approve proof(s)" },
      { id: "submit", label: "Submit for approval / release" },
    ],
  },
  {
    id: "marketingFoundations",
    label: "Marketing foundations",
    tasks: [
      { id: "website", label: "Set up an author website" },
      { id: "newsletter", label: "Create an author newsletter" },
      { id: "social", label: "Set up social media" },
      { id: "goodreads", label: "Build a Goodreads author page" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    tasks: [
      { id: "arcs", label: "Distribute ARCs" },
      { id: "preorderCampaign", label: "Run a pre-order campaign" },
      { id: "giveaway", label: "Run a giveaway", optional: true },
      { id: "coverReveal", label: "Cover reveal", optional: true },
      { id: "launchParty", label: "Launch party / event", optional: true },
      { id: "pricePromo", label: "Price promotion", optional: true },
      { id: "bookbub", label: "BookBub / deal-site promotion", optional: true },
      { id: "ads", label: "Paid advertising", optional: true },
      { id: "swaps", label: "Newsletter swaps", optional: true },
    ],
  },
];
