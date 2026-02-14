import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";

export const createApp = (options = {}) => {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  app.set("io", io);

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again later",
  });
  app.use("/api/", limiter);

  app.use("/api/auth", authRoutes);
  app.use("/api/tasks", taskRoutes);

  app.get("/health", (req, res) => {
    res.json({
      success: true,
      message: "Server is running",
      timestamp: new Date().toISOString(),
    });
  });

  // app.get('/', (req, res) => {
  //   res.json({
  //     success: true,
  //     message: 'TaskFlow API',
  //     version: '1.0.0',
  //   });
  // });

  // Serve frontend in production
  if (ENV.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
    });
  }

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
    });
  });

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Server Error",
    });
  });

  io.on("connection", (socket) => {
    console.log("✅ Client connected:", socket.id);

    socket.on("task:update", (task) => {
      socket.broadcast.emit("task:updated", task);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  return { app, httpServer, io };
};
