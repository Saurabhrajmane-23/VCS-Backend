import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";

const app = express();
const upload = multer();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// for parsing application/json
app.use(express.json({ limit: "16kb" }));
// for parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// routes import
import userRouter from "./routes/user.route.js";
import repoRouter from "./routes/repo.route.js";

//routes decleration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/repos", repoRouter);

export default app;
