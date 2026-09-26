const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAuth, requireRole } = require('../middleware/auth');

// All admin endpoints require authentication and ADMIN role strictly
router.use(verifyAuth, requireRole(['ADMIN']));

// 1. GET /api/admin/users - List all registered users with optional role & search filters
router.get('/users', async (req, res) => {
  const { role, search } = req.query;

  try {
    let query = `
      SELECT id, full_name, phone, email, role, created_at, updated_at
      FROM users
    `;
    const conditions = [];
    const values = [];

    if (role) {
      values.push(role.toUpperCase());
      conditions.push(`role = $${values.length}`);
    }

    if (search) {
      values.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(full_name) LIKE $${values.length} OR phone LIKE $${values.length} OR LOWER(email) LIKE $${values.length})`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC;`;

    const result = await db.query(query, values);

    res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Admin users query error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve user accounts.'
    });
  }
});

// 2. PUT /api/admin/doctors/:doctorId/status - Activate or deactivate a doctor's clinic availability
router.put('/doctors/:doctorId/status', async (req, res) => {
  const { doctorId } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined || typeof isActive !== 'boolean') {
    return res.status(400).json({
      status: 'fail',
      message: 'A boolean "isActive" field is required (true or false).'
    });
  }

  try {
    const updateQuery = `
      UPDATE doctors
      SET is_active = $1
      WHERE id = $2
      RETURNING id, user_id, full_name, specialty, is_active;
    `;
    const result = await db.query(updateQuery, [isActive, doctorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Doctor not found.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Doctor status updated to ${isActive ? 'Active' : 'Inactive'}.`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Admin doctor status error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update doctor activation status.'
    });
  }
});

// 3. PUT /api/admin/users/:userId/role - Modify a user's system role
router.put('/users/:userId/role', async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const validRoles = ['PATIENT', 'DOCTOR', 'ADMIN'];
  if (!role || !validRoles.includes(role.toUpperCase())) {
    return res.status(400).json({
      status: 'fail',
      message: `Invalid role specified. Allowed roles: ${validRoles.join(', ')}`
    });
  }

  try {
    const updateQuery = `
      UPDATE users
      SET role = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, full_name, phone, email, role, updated_at;
    `;
    const result = await db.query(updateQuery, [role.toUpperCase(), userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: `User role successfully updated to ${role.toUpperCase()}.`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Admin update role error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user role.'
    });
  }
});

module.exports = router;