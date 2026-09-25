const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/doctors - Fetch all active doctors
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, full_name, specialty, qualification, experience_years, phone_contact, profile_image_url FROM doctors WHERE is_active = TRUE ORDER BY created_at ASC'
    );
    res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching doctors:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve doctors list'
    });
  }
});

module.exports = router;