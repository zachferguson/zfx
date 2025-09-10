/**
 * Represents a blog entity in the zachtothegym.blogs table.
 *
 * Used by: blogsService, blogsService.unit.test.ts, pgmem.ts (test utils)
 */
export interface Blog {
    id: number;
    title: string;
    content: string;
    categories: string[];
    created_at: Date;
    updated_at: Date;
}
