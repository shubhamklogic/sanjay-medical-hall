const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/schedules - Fetch all schedules or filter by ?doctorId=...
router.get('/', async (req, res) => {
  const { doctorId } = req.query;

  try {
    let query = `
      SELECT 
        s.id,
        s.doctor_id,
        d.full_name AS doctor_name,
        d.specialty,
        s.day_of_week,
        s.start_time,
        s.end_time,
        s.slot_duration_minutes,
        s.is_available
      FROM doctor_schedules s
      JOIN doctors d ON s.doctor_id = d.id
    `;
    const queryParams = [];

    if (doctorId) {
      query += ` WHERE s.doctor_id = $1`;
      queryParams.push(doctorId);
    }

    query += ` ORDER BY s.day_of_week ASC, s.start_time ASC;`;

    const result = await db.query(query, queryParams);

    res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching schedules:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve schedules'
    });
  }
});

module.exports = router;