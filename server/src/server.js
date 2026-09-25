const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const doctorRoutes = require('./routes/doctors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/doctors', doctorRoutes);

// Health Check & Database Ping Route
app.get('/api/health', async (req, res) => {
  try {
    const dbTest = await db.query('SELECT NOW() as current_db_time, version() as pg_version');
    
    res.status(200).json({
      status: 'success',
      message: 'Sanjay Medical Hall API and PostgreSQL DB are running smoothly',
      database: {
        connected: true,
        db_time: dbTest.rows[0].current_db_time,
        version: dbTest.rows[0].pg_version
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connection error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to the database',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});