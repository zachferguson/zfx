type User = {
    id: number;
    username: string;
    password_hash?: string;
    email: string;
    role: string;
    site: string;
};

type UserWithoutPassword = Omit<User, "password_hash">;

export { User, UserWithoutPassword };
