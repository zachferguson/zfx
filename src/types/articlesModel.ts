/**
 * Represents an article entity in the zachtothegym.articles table.
 *
 * Used by: articlesService, articlesService.unit.test.ts, pgmem.ts (test utils)
 */
export interface Article {
    /** Primary key. */
    id: number;
    /** Article title. */
    title: string;
    /** Short summary used for previews. */
    summary: string;
    /** Full article content (HTML or Markdown). */
    content: string;
    /** Category labels associated with the article. */
    categories: string[];
    /** Creation timestamp. */
    created_at: Date;
    /** Last update timestamp. */
    updated_at: Date;
}
