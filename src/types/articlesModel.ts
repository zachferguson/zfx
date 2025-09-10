/**
 * Represents an article entity in the zachtothegym.articles table.
 *
 * Used by: articlesService, articlesService.unit.test.ts, pgmem.ts (test utils)
 */
export interface Article {
    id: number;
    title: string;
    summary: string;
    content: string;
    categories: string[];
    created_at: Date;
    updated_at: Date;
}
