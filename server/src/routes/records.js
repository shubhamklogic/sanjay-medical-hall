const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/records/patient/:patientId - Retrieve all medical records for a patient
router.get('/patient/:patientId', async (req, res) => {
  const { patientId } = req.params;

  try {
    const query = `
      SELECT 
        r.id,
        r.record_type,
        r.title,
        r.file_url,
        r.notes,
        r.uploaded_by_role,
        r.created_at,
        u.full_name AS uploaded_by_name
      FROM medical_records r
      JOIN users u ON r.uploaded_by_user_id = u.id
      WHERE r.patient_id = $1
      ORDER BY r.created_at DESC;
    `;

    const result = await db.query(query, [patientId]);

    res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error retrieving medical records:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve patient medical records'
    });
  }
});

// GET /api/records - General overview endpoint
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, patient_id, title, record_type, uploaded_by_role, file_url, created_at FROM medical_records ORDER BY created_at DESC LIMIT 20'
    );
    res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching records:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve records'
    });
  }
});

module.exports = router;