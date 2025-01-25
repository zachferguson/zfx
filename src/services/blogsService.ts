import db from "../db/connection";
import { Blog } from "../types/blogsModel";

export const getAllBlogs = async (): Promise<Blog[]> => {
    const query = "SELECT * FROM zachtothegym.blogs ORDER BY created_at DESC";
    return db.any(query);
};

export const getBlogById = async (id: number): Promise<Blog | null> => {
    const query = "SELECT * FROM zachtothegym.blogs WHERE id = $1";
    return db.oneOrNone(query, [id]);
};

export const createBlog = async (
    title: string,
    content: string,
    categories: string[]
): Promise<Blog> => {
    const query = `
    INSERT INTO zachtothegym.blogs(title, content, categories)
    VALUES($1, $2, $3) RETURNING *
    `;
    return db.one(query, [title, content, categories]);
};
