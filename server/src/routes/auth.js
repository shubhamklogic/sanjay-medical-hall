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

// POST /api/auth/register - Register a new patient account
router.post('/register', async (req, res) => {
  const { fullName, phone, email, password } = req.body;

  // 1. Basic field validation
  if (!fullName || !phone || !password) {
    return res.status(400).json({
      status: 'fail',
      message: 'Full name, phone number, and password are required.'
    });
  }

  // Basic phone format validation (Indian 10-digit standard)
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
    // 2. Check if phone or email already registered
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

    // 3. Hash the password with bcrypt (10 rounds)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Insert new user with default 'PATIENT' role
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

    // 5. Generate authentication token
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

module.exports = router;