import db from "../db/connection";
import { Blog } from "../types/blogsModel";

/**
 * Retrieves all blogs from the database, ordered by creation date descending.
 * @returns {Promise<Blog[]>} A promise that resolves to an array of blog objects.
 */
export const getAllBlogs = async (): Promise<Blog[]> => {
    const query = `SELECT * FROM zachtothegym.blogs ORDER BY created_at DESC`;
    return db.any(query);
};

/**
 * Retrieves a single blog by its ID.
 * @param {number} id - The ID of the blog to retrieve.
 * @returns {Promise<Blog | null>} A promise that resolves to the blog object or null if not found.
 */
export const getBlogById = async (id: number): Promise<Blog | null> => {
    const query = `SELECT * FROM zachtothegym.blogs WHERE id = $1`;
    return db.oneOrNone(query, [id]);
};

/**
 * Creates a new blog entry in the database.
 * @param {string} title - The title of the blog.
 * @param {string} content - The content of the blog.
 * @param {string[]} categories - The categories for the blog.
 * @returns {Promise<Blog>} A promise that resolves to the created blog object.
 */
export const createBlog = async (
    title: string,
    content: string,
    categories: string[]
): Promise<Blog> => {
    const query = `
    INSERT INTO zachtothegym.blogs (title, content, categories)
    VALUES ($1, $2, $3) RETURNING *
    `;
    return db.one(query, [title, content, categories]);
};
