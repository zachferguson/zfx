import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import zachtothegymRoutes from "./routes/zachtothegymRoutes";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
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
