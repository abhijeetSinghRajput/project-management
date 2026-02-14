import dotenv from 'dotenv';
import connectDB from './db.js';
import { createApp } from './app.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const { httpServer } = createApp();

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
});