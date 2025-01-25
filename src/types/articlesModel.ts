export interface Article {
    id: number;
    title: string;
    summary: string;
    content: string;
    categories: string[];
    created_at: Date;
    updated_at: Date;
}
