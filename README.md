# TaskFlow - Task Management Platform

Production-ready task management system with role-based access control, real-time updates, and modern UI.

## 🚀 Tech Stack

### Backend
- **Node.js** + Express
- **MongoDB** + Mongoose
- **JWT** Authentication + refresh tokens
- **Socket.io** for real-time updates
- **Helmet** + Rate limiting for security

### Frontend
- **React** + Vite
- **Zustand** for state management
- **Axios** for API calls
- **TailwindCSS** for styling
- **@dnd-kit** for drag & drop
- **Socket.io-client** for real-time

## 📦 Quick Start

### 1. Install Dependencies

```bash
chmod +x install.sh
./install.sh
```

Or manually:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install axios zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities socket.io-client react-router-dom react-hot-toast lucide-react
```

### 2. Environment Setup

**Backend** (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/taskflow
JWT_SECRET=your-super-secret-key
JWT_EXPIRE=15m
REFRESH_TOKEN_DAYS=30
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Access: http://localhost:5173

## 📋 Features Implemented

### ✅ Authentication
- User registration (role defaults to user)
- JWT-based login/logout with refresh tokens
- Protected routes + session bootstrap
- HttpOnly refresh cookies

### ✅ Task Management
- Create, Read, Update, Delete tasks
- Drag & drop Kanban board
- Filter by status, priority
- Search functionality
- Pagination
- Soft delete implementation

### ✅ Role-Based Access Control
- **Admin**: Full access to all tasks
- **Manager**: Access to team tasks
- **User**: Access to own/assigned tasks

### ✅ Role-Based UI
- Admin/Manager can manage roles
- Users see only assigned/created tasks

### ✅ Real-time Updates
- Socket.io integration
- Live task updates across clients
- Instant notifications

### ✅ Security
- Password hashing (bcrypt)
- JWT tokens
- Helmet.js security headers
- Rate limiting (100 req/15min)
- CORS protection
- Input validation

### ✅ Database
- MongoDB with Mongoose
- Indexed queries for performance
- Soft delete pattern
- Population for relationships

## 🔌 API Endpoints

### Auth
```
POST   /api/auth/register  - Register new user
POST   /api/auth/login     - Login user
POST   /api/auth/refresh   - Refresh access token
POST   /api/auth/logout    - Logout user
GET    /api/auth/me        - Get current user (Protected)
GET    /api/auth/users     - List users (Admin/Manager)
GET    /api/auth/users/:id - Get user (Admin/Manager)
PATCH  /api/auth/users/:id - Update user (Admin/Manager)
PATCH  /api/auth/users/:id/role - Update role (Admin/Manager)
DELETE /api/auth/users/:id - Soft delete user (Admin)
```

### Tasks
```
GET    /api/tasks          - Get all tasks (Protected, Filtered)
GET    /api/tasks/:id      - Get single task (Protected)
POST   /api/tasks          - Create task (Protected)
PATCH  /api/tasks/:id      - Update task (Protected)
DELETE /api/tasks/:id      - Soft delete task (Protected)
GET    /api/tasks/stats    - Get task statistics (Protected)
```

### Query Parameters for GET /api/tasks:
- `status`: todo | in-progress | done
- `priority`: low | medium | high
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: Sort field (default: -createdAt)
- `search`: Search in title/description

## 📁 Project Structure

```
koders-auth/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   └── taskController.js
│   ├── models/
│   │   ├── User.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── tasks.js
│   ├── services/
│   │   └── authService.js
│   ├── tests/
│   │   ├── auth.test.js
│   │   └── tasks.test.js
│   ├── db.js
│   ├── app.js
│   ├── index.js
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── stores/
    │   │   ├── authStore.js (Zustand)
    │   │   └── taskStore.js (Zustand)
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   └── Dashboard.jsx
    │   ├── lib/
    │   │   ├── api.js (Axios)
    │   │   └── socket.js (Socket.io client)
    │   └── App.jsx
    └── .env
```

## 🧪 Testing

Run backend tests:

```bash
cd backend
npm test
```

## 🚢 Deployment

### Backend (Railway/Render)
1. Push code to GitHub
2. Connect repository
3. Add environment variables
4. Deploy

### Frontend (Vercel)
1. Push code to GitHub
2. Import project to Vercel
3. Set environment variable: `VITE_API_URL`
4. Deploy

### MongoDB
Use MongoDB Atlas (free tier): https://cloud.mongodb.com

## 🐛 Troubleshooting

**MongoDB Connection Error:**
- Check connection string format
- Verify network access (0.0.0.0/0) in MongoDB Atlas
- Ensure username/password are correct

**CORS Error:**
- Verify FRONTEND_URL in backend .env
- Check API_URL in frontend .env

**JWT Error:**
- Generate new JWT_SECRET
- Clear localStorage in browser

## 📄 License

MIT

---

**Built for KODERS Assessment** 🚀