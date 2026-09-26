const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Helper to sign JWT tokens
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role
    },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Helper middleware to verify token inline for Day 9 test
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'fail',
      message: 'Access denied. No authentication token provided.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid or expired token. Please log in again.'
    });
  }
};

// POST /api/auth/register - Register a new patient account
router.post('/register', async (req, res) => {
  const { fullName, phone, email, password } = req.body;

  if (!fullName || !phone || !password) {
    return res.status(400).json({
      status: 'fail',
      message: 'Full name, phone number, and password are required.'
    });
  }

  const cleanPhone = phone.toString().trim();
  if (!/^\d{10}$/.test(cleanPhone)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide a valid 10-digit mobile number.'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      status: 'fail',
      message: 'Password must be at least 6 characters long.'
    });
  }

  try {
    const existingCheck = await db.query(
      'SELECT id, phone, email FROM users WHERE phone = $1 OR (email IS NOT NULL AND email = $2)',
      [cleanPhone, email ? email.trim().toLowerCase() : null]
    );

    if (existingCheck.rows.length > 0) {
      const match = existingCheck.rows[0];
      const conflictField = match.phone === cleanPhone ? 'Phone number' : 'Email address';
      return res.status(409).json({
        status: 'fail',
        message: `${conflictField} is already registered. Please log in instead.`
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertQuery = `
      INSERT INTO users (full_name, phone, email, password_hash, role)
      VALUES ($1, $2, $3, $4, 'PATIENT')
      RETURNING id, full_name, phone, email, role, created_at;
    `;

    const newUserRes = await db.query(insertQuery, [
      fullName.trim(),
      cleanPhone,
      email ? email.trim().toLowerCase() : null,
      passwordHash
    ]);

    const createdUser = newUserRes.rows[0];
    const token = generateToken(createdUser);

    res.status(201).json({
      status: 'success',
      message: 'Registration successful',
      token,
      data: {
        user: createdUser
      }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to register account. Please try again later.'
    });
  }
});

// POST /api/auth/login - Authenticate with phone or email and password
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide your mobile number or email, and password.'
    });
  }

  const cleanIdentifier = identifier.toString().trim().toLowerCase();

  try {
    // 1. Search user by either phone or email
    const userQuery = `
      SELECT id, full_name, phone, email, password_hash, role, created_at
      FROM users
      WHERE phone = $1 OR email = $1;
    `;
    const userRes = await db.query(userQuery, [cleanIdentifier]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid credentials. User not found.'
      });
    }

    const user = userRes.rows[0];

    // 2. Validate password hash with bcrypt
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordMatch) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    // 3. Issue JWT Token
    const token = generateToken(user);

    // 4. Return user profile without leaking password hash
    delete user.password_hash;

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to authenticate user. Please try again later.'
    });
  }
});

// GET /api/auth/me - Verify current active session and return profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userQuery = `
      SELECT id, full_name, phone, email, role, created_at
      FROM users
      WHERE id = $1;
    `;
    const userRes = await db.query(userQuery, [req.user.id]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'User profile not found.'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: userRes.rows[0]
      }
    });
  } catch (error) {
    console.error('Me endpoint error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile.'
    });
  }
});

module.exports = router;