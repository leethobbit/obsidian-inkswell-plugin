/**
 * Renderer registry: catalog id → section. Adding a section = one file here, one
 * line below, one entry in `../catalog.ts`. The panel throws at construction if a
 * catalog id has no renderer (this file imports Obsidian, so the catalog test
 * can't check it).
 */

import type { CustomizeSection } from "../section";
import { beatTemplatesSection } from "./beat-templates";
import { codexTypesSection } from "./codex-types";
import { featuresSection } from "./features";
import { publishingChecklistSection } from "./publishing-checklist";
import { revisionChecklistsSection } from "./revision-checklists";
import { sceneStatusesSection } from "./scene-statuses";
import { sceneTemplateSection } from "./scene-template";
import { writingPromptsSection } from "./writing-prompts";

export const SECTIONS: Record<string, CustomizeSection> = {
  [codexTypesSection.id]: codexTypesSection,
  [beatTemplatesSection.id]: beatTemplatesSection,
  [sceneTemplateSection.id]: sceneTemplateSection,
  [sceneStatusesSection.id]: sceneStatusesSection,
  [writingPromptsSection.id]: writingPromptsSection,
  [revisionChecklistsSection.id]: revisionChecklistsSection,
  [publishingChecklistSection.id]: publishingChecklistSection,
  [featuresSection.id]: featuresSection,
};
