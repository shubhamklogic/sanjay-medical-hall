const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/doctors - Fetch all active doctors
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, full_name, specialty, qualification, experience_years, phone_contact, profile_image_url 
       FROM doctors 
       WHERE is_active = TRUE 
       ORDER BY created_at ASC`
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

// GET /api/doctors/:id - Fetch single doctor details including weekly schedule slots
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch Doctor Profile
    const doctorQuery = `
      SELECT id, full_name, specialty, qualification, experience_years, phone_contact, profile_image_url, is_active
      FROM doctors
      WHERE id = $1
    `;
    const doctorRes = await db.query(doctorQuery, [id]);

    if (doctorRes.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Doctor not found'
      });
    }

    // 2. Fetch Doctor's Active Schedules
    const scheduleQuery = `
      SELECT id, day_of_week, start_time, end_time, slot_duration_minutes, is_available
      FROM doctor_schedules
      WHERE doctor_id = $1 AND is_available = TRUE
      ORDER BY day_of_week ASC
    `;
    const scheduleRes = await db.query(scheduleQuery, [id]);

    const doctorProfile = doctorRes.rows[0];
    doctorProfile.schedules = scheduleRes.rows;

    res.status(200).json({
      status: 'success',
      data: doctorProfile
    });
  } catch (error) {
    console.error('Error fetching doctor details:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve doctor details'
    });
  }
});

module.exports = router;