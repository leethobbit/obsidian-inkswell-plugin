import { App, Modal, Setting } from "obsidian";
import { CategoryDef } from "./types";

export class QuickCodexModal extends Modal {
  private name = "";
  private category: string;

  constructor(
    app: App,
    private readonly categories: CategoryDef[],
    private readonly onCreate: (
      name: string,
      category: string
    ) => Promise<void>,
    initialName = ""
  ) {
    super(app);
    this.name = initialName;
    this.category = categories[0]?.id ?? "";
  }

  onOpen(): void {
    const { contentEl } = this;

    contentEl.empty();
    contentEl.createEl("h2", { text: "Create Codex Entry" });

    new Setting(contentEl)
      .setName("Name")
      .addText((text) => {
        text
          .setPlaceholder("Sarah")
          .setValue(this.name)
          .onChange((value) => {
            this.name = value;
          });

        text.inputEl.focus();
      });

    new Setting(contentEl)
      .setName("Type")
      .addDropdown((dropdown) => {
        for (const category of this.categories) {
          dropdown.addOption(category.id, category.label);
        }

        dropdown.setValue(this.category);

        dropdown.onChange((value) => {
          this.category = value;
        });
      });

    new Setting(contentEl)
      .addButton((button) =>
        button
          .setButtonText("Create")
          .setCta()
          .onClick(async () => {
            const name = this.name.trim();

            if (!name) {
              return;
            }

            await this.onCreate(name, this.category);
            this.close();
          })
      );
  }
}