// Reusable request body DTOs for auth endpoints

export type RegisterRequestBody = {
    username: string;
    password: string;
    email: string;
    site: string;
};

export type LoginRequestBody = {
    username: string;
    password: string;
    site: string;
};
