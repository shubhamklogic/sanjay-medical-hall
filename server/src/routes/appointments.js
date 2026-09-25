const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/appointments - Fetch upcoming appointments (with Doctor & Patient details joined)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id,
        a.appointment_date,
        a.time_slot,
        a.consultation_type,
        a.token_number,
        a.status,
        a.meeting_link,
        d.full_name AS doctor_name,
        d.specialty AS doctor_specialty,
        u.full_name AS patient_name,
        u.phone AS patient_phone
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON a.patient_id = u.id
      ORDER BY a.appointment_date ASC, a.time_slot ASC;
    `;

    const result = await db.query(query);

    res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching appointments:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve appointments'
    });
  }
});

module.exports = router;