import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import zachtothegymRoutes from "./routes/zachtothegymRoutes";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = ["https://zachtothegym.com", "https://zfxapi.com"];

// middleware
app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"],
    })
);
app.use(express.json());

// routes
app.use("/zachtothegym", zachtothegymRoutes);
//app.use("/pawtomatics", require("./routes/pawtomaticsRoutes").default);
//app.use(
//    "/zachariahferguson",
//    require("./routes/zachariahfergusonRoutes").default
//);

// server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
