/** A captured story idea, stored in plugin data (data.json), not in the vault. */
export interface Idea {
  id: string;
  text: string;
  /** ISO timestamp. */
  created: string;
  pinned: boolean;
}

export function newIdeaId(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}
