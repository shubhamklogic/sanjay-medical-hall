const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAuth, requireRole } = require('../middleware/auth');

// 1. GET /api/doctors - Fetch all active doctors (Public)
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

// 2. GET /api/doctors/me/profile - Doctor retrieves their own profile & full schedule
router.get('/me/profile', verifyAuth, requireRole(['DOCTOR']), async (req, res) => {
  const doctorUserId = req.user.id;

  try {
    const docQuery = `
      SELECT id, user_id, full_name, specialty, qualification, experience_years, phone_contact, profile_image_url, is_active
      FROM doctors
      WHERE user_id = $1;
    `;
    const docRes = await db.query(docQuery, [doctorUserId]);

    if (docRes.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Doctor profile not found for this account.'
      });
    }

    const doctorProfile = docRes.rows[0];

    const scheduleQuery = `
      SELECT id, day_of_week, start_time, end_time, slot_duration_minutes, is_available
      FROM doctor_schedules
      WHERE doctor_id = $1
      ORDER BY day_of_week ASC;
    `;
    const scheduleRes = await db.query(scheduleQuery, [doctorProfile.id]);
    doctorProfile.schedules = scheduleRes.rows;

    res.status(200).json({
      status: 'success',
      data: doctorProfile
    });
  } catch (error) {
    console.error('Error fetching doctor self profile:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve profile and schedules.'
    });
  }
});

// 3. PUT /api/doctors/me/profile - Doctor updates qualification, contact, experience
router.put('/me/profile', verifyAuth, requireRole(['DOCTOR']), async (req, res) => {
  const doctorUserId = req.user.id;
  const { qualification, experienceYears, phoneContact } = req.body;

  try {
    const updateQuery = `
      UPDATE doctors
      SET 
        qualification = COALESCE($1, qualification),
        experience_years = COALESCE($2, experience_years),
        phone_contact = COALESCE($3, phone_contact)
      WHERE user_id = $4
      RETURNING id, full_name, specialty, qualification, experience_years, phone_contact, profile_image_url;
    `;

    const result = await db.query(updateQuery, [
      qualification || null,
      experienceYears !== undefined ? experienceYears : null,
      phoneContact || null,
      doctorUserId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Doctor profile not found.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Doctor profile updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating doctor profile:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile.'
    });
  }
});

// 4. PUT /api/doctors/me/schedules - Doctor updates or toggles a specific day's schedule
router.put('/me/schedules', verifyAuth, requireRole(['DOCTOR']), async (req, res) => {
  const doctorUserId = req.user.id;
  const { dayOfWeek, startTime, endTime, slotDurationMinutes, isAvailable } = req.body;

  if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({
      status: 'fail',
      message: 'A valid dayOfWeek between 0 (Sunday) and 6 (Saturday) is required.'
    });
  }

  try {
    // Lookup doctor id
    const docRes = await db.query('SELECT id FROM doctors WHERE user_id = $1', [doctorUserId]);
    if (docRes.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Doctor profile not found.'
      });
    }
    const doctorId = docRes.rows[0].id;

    // Upsert schedule record for this day
    const scheduleQuery = `
      INSERT INTO doctor_schedules (
        doctor_id,
        day_of_week,
        start_time,
        end_time,
        slot_duration_minutes,
        is_available
      )
      VALUES ($1, $2, $3, $4, COALESCE($5, 15), COALESCE($6, TRUE))
      ON CONFLICT (doctor_id, day_of_week)
      DO UPDATE SET
        start_time = COALESCE(EXCLUDED.start_time, doctor_schedules.start_time),
        end_time = COALESCE(EXCLUDED.end_time, doctor_schedules.end_time),
        slot_duration_minutes = COALESCE(EXCLUDED.slot_duration_minutes, doctor_schedules.slot_duration_minutes),
        is_available = COALESCE(EXCLUDED.is_available, doctor_schedules.is_available)
      RETURNING *;
    `;

    const result = await db.query(scheduleQuery, [
      doctorId,
      dayOfWeek,
      startTime || '10:00:00',
      endTime || '14:00:00',
      slotDurationMinutes || null,
      isAvailable !== undefined ? isAvailable : null
    ]);

    res.status(200).json({
      status: 'success',
      message: `Schedule for day ${dayOfWeek} updated successfully.`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating doctor schedule:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update schedule.'
    });
  }
});

// 5. GET /api/doctors/:id - Fetch single doctor by UUID (Public)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
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