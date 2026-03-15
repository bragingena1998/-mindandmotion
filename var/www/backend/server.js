const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Инициализация БД (подключение + создание таблиц)
require('./initDB');

const app = express();

app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Логирование всех запросов
app.use((req, res, next) => {
  console.log(`📡 ЗАПРОС ПРИШЕЛ: ${req.method} ${req.url}`);
  console.log('Тело:', req.body);
  next();
});

// ===== Роуты =====
const authRoutes     = require('./routes/auth');
const userRoutes     = require('./routes/users');
const taskRoutes     = require('./routes/tasks');
const habitRoutes    = require('./routes/habits');
const folderRoutes   = require('./routes/folders');
const subtaskRoutes  = require('./routes/subtasks');
const subtaskActions = require('./routes/subtaskActions');
const birthdayRoutes = require('./routes/birthdays');

app.use('/api', authRoutes);                          // /api/login, /api/register, /api/verify-code...
app.use('/api/user', userRoutes);                     // /api/user/profile, /api/user/password
app.use('/api/tasks', taskRoutes);                    // /api/tasks
app.use('/api/tasks/:taskId/subtasks', subtaskRoutes);// /api/tasks/:id/subtasks
app.use('/api/subtasks', subtaskActions);             // /api/subtasks/:id/toggle, delete
app.use('/api/habits', habitRoutes);                  // /api/habits
app.use('/api/folders', folderRoutes);                // /api/folders
app.use('/api/birthdays', birthdayRoutes);            // /api/birthdays

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
