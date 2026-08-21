const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models');

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const leadRoutes = require('./routes/leadRoutes');
const userRoutes = require('./routes/userRoutes');
const depositRoutes = require('./routes/depositRoutes');
const blogRoutes = require('./routes/blogRoutes');
const statsRoutes = require('./routes/statsRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/stats', statsRoutes);

app.get('/', (req, res) => {
  res.send('NextHome API is running...');
});

const PORT = process.env.PORT || 5001;

// Sync database and start server
// sequelize.sync({ alter: true }) // Sử dụng alter để cập nhật cấu trúc bảng mà không làm mất dữ liệu
//   .then(() => {
//     console.log('Database connected and synced');
//     app.listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`);
//     });
//   })
//   .catch((err) => {
//     console.error('Failed to sync database:', err);
//   });
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});