const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAuth, requireRole } = require('../middleware/auth');

// All patient endpoints require authentication and 'PATIENT' role
router.use(verifyAuth, requireRole(['PATIENT']));

// GET /api/patient/profile - Fetch demographic & health profile of the logged-in patient
router.get('/profile', async (req, res) => {
  const patientUserId = req.user.id;

  try {
    const query = `
      SELECT 
        u.id AS user_id,
        u.full_name,
        u.phone,
        u.email,
        u.role,
        p.date_of_birth,
        p.gender,
        p.blood_group,
        p.address,
        p.emergency_contact_name,
        p.emergency_contact_phone,
        p.allergies,
        p.updated_at
      FROM users u
      LEFT JOIN patient_profiles p ON u.id = p.user_id
      WHERE u.id = $1;
    `;

    const result = await db.query(query, [patientUserId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Patient profile not found.'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        profile: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching patient profile:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve patient profile.'
    });
  }
});

// PUT /api/patient/profile - Create or update demographics, address, emergency contact
router.put('/profile', async (req, res) => {
  const patientUserId = req.user.id;
  const {
    dateOfBirth,
    gender,
    bloodGroup,
    address,
    emergencyContactName,
    emergencyContactPhone,
    allergies
  } = req.body;

  // Basic validation for blood group if supplied
  const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (bloodGroup && !validBloodGroups.includes(bloodGroup.toUpperCase())) {
    return res.status(400).json({
      status: 'fail',
      message: `Invalid blood group. Allowed values: ${validBloodGroups.join(', ')}`
    });
  }

  // Basic validation for gender if supplied
  const validGenders = ['MALE', 'FEMALE', 'OTHER'];
  if (gender && !validGenders.includes(gender.toUpperCase())) {
    return res.status(400).json({
      status: 'fail',
      message: `Invalid gender. Allowed values: ${validGenders.join(', ')}`
    });
  }

  try {
    const upsertQuery = `
      INSERT INTO patient_profiles (
        user_id,
        date_of_birth,
        gender,
        blood_group,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        allergies,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        date_of_birth = COALESCE(EXCLUDED.date_of_birth, patient_profiles.date_of_birth),
        gender = COALESCE(EXCLUDED.gender, patient_profiles.gender),
        blood_group = COALESCE(EXCLUDED.blood_group, patient_profiles.blood_group),
        address = COALESCE(EXCLUDED.address, patient_profiles.address),
        emergency_contact_name = COALESCE(EXCLUDED.emergency_contact_name, patient_profiles.emergency_contact_name),
        emergency_contact_phone = COALESCE(EXCLUDED.emergency_contact_phone, patient_profiles.emergency_contact_phone),
        allergies = COALESCE(EXCLUDED.allergies, patient_profiles.allergies),
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      patientUserId,
      dateOfBirth || null,
      gender ? gender.toUpperCase() : null,
      bloodGroup ? bloodGroup.toUpperCase() : null,
      address || null,
      emergencyContactName || null,
      emergencyContactPhone || null,
      allergies || null
    ];

    const result = await db.query(upsertQuery, values);

    res.status(200).json({
      status: 'success',
      message: 'Patient profile updated successfully.',
      data: {
        profile: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Error updating patient profile:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update patient profile.'
    });
  }
});

module.exports = router;