import pgPromise from "pg-promise";
import dotenv from "dotenv";

dotenv.config();

const pgp = pgPromise({}); // initialize

// connection configuration
const {
    DATABASE_HOST,
    DATABASE_PORT,
    DATABASE_NAME,
    DATABASE_USER,
    DATABASE_PASSWORD,
} = process.env;

if (!DATABASE_HOST || !DATABASE_NAME || !DATABASE_USER || !DATABASE_PASSWORD) {
    throw new Error("Missing required database environment variables.");
}

const db = pgp({
    host: DATABASE_HOST,
    port: parseInt(DATABASE_PORT || "5432", 10),
    database: DATABASE_NAME,
    user: DATABASE_USER,
    password: DATABASE_PASSWORD,
});

export default db;
