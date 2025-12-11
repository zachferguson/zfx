/**
 * Represents a blog entity in the zachtothegym.blogs table.
 *
 * Used by: blogsService, blogsService.unit.test.ts, pgmem.ts (test utils)
 */
export interface Blog {
    /** Primary key. */
    id: number;
    /** Blog post title. */
    title: string;
    /** Full blog content (HTML or Markdown). */
    content: string;
    /** Category labels associated with the blog. */
    categories: string[];
    /** Creation timestamp. */
    created_at: Date;
    /** Last update timestamp. */
    updated_at: Date;
}
