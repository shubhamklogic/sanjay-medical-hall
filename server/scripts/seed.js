const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function seedData() {
  try {
    console.log('Starting seed process for Sanjay Medical Hall platform...');

    // 1. Clear existing seed records cleanly in reverse dependency order
    await db.query('DELETE FROM medical_records');
    await db.query('DELETE FROM appointments');
    await db.query('DELETE FROM doctor_schedules');
    await db.query('DELETE FROM doctors');
    await db.query('DELETE FROM users');

    const defaultPasswordHash = await bcrypt.hash('Sanjay@123', 10);

    // 2. Insert Admin Account
    await db.query(
      `INSERT INTO users (full_name, phone, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)`,
      ['Sanjay Medical Hall Admin', '9905387494', 'admin@sanjaymedicalhall.in', defaultPasswordHash, 'ADMIN']
    );

    // 3. Insert Test Patient Account
    const patientRes = await db.query(
      `INSERT INTO users (full_name, phone, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['Test Patient', '9876543210', 'patient.test@gmail.com', defaultPasswordHash, 'PATIENT']
    );
    const patientId = patientRes.rows[0].id;

    // 4. Exact Doctors from Live Website (index.html)
    const doctorsList = [
      {
        name: 'Dr. Nekhat Tabassum',
        phone: '7033267447',
        email: 'dr.nekhat@sanjaymedicalhall.in',
        specialty: 'Gynecologist & Infertility Specialist',
        qualification: 'MBBS, MS (Obst. & Gynae)',
        experience: 12,
        image: '/doctor1.jpg',
        days: [1, 2, 3, 4, 5, 6], // Mon - Sat
        startTime: '10:00:00',
        endTime: '14:00:00'
      },
      {
        name: 'Dr. Sanaul Mustafa',
        phone: '8294888510',
        email: 'dr.sanaul@sanjaymedicalhall.in',
        specialty: 'General Physician, Heart & Diabetes Specialist',
        qualification: 'MBBS, MD (Medicine)',
        experience: 15,
        image: '/doctor2.jpg',
        days: [1, 2, 3, 4, 5], // Mon - Fri
        startTime: '16:00:00',
        endTime: '20:00:00'
      },
      {
        name: 'Dr. Ranjit Kumar',
        phone: '9934388377',
        email: 'dr.ranjit@sanjaymedicalhall.in',
        specialty: 'Dermatologist & Aesthetic Specialist',
        qualification: 'MBBS, MD (Skin & VD)',
        experience: 14,
        image: '/doctor3.jpg',
        days: [1, 3, 5, 6],
        startTime: '11:00:00',
        endTime: '15:00:00'
      },
      {
        name: 'Dr. Ujjwal Kr. Tiwari',
        phone: '9771149059',
        email: 'dr.ujjwal@sanjaymedicalhall.in',
        specialty: 'Dental & Oral Disease Specialist',
        qualification: 'BDS, MDS (Dental Surgeon)',
        experience: 10,
        image: '/doctor4.jpg',
        days: [1, 2, 3, 4, 5, 6],
        startTime: '09:30:00',
        endTime: '13:30:00'
      },
      {
        name: 'Dr. Omkar Pandey',
        phone: '8002908365',
        email: 'dr.omkar@sanjaymedicalhall.in',
        specialty: 'Child Specialist / Pediatrician',
        qualification: 'MBBS, MD (Pediatrics)',
        experience: 11,
        image: '/doctor5.jpg',
        days: [1, 2, 4, 5],
        startTime: '14:00:00',
        endTime: '18:00:00'
      },
      {
        name: 'Dr. Kunal Kishore',
        phone: '8863045724',
        email: 'dr.kunal@sanjaymedicalhall.in',
        specialty: 'Brain and Spine Specialist',
        qualification: 'MBBS, MS, MCh (Neurosurgery)',
        experience: 13,
        image: '/doctor6.jpg',
        days: [2, 4, 6],
        startTime: '10:00:00',
        endTime: '14:00:00'
      }
    ];

    let firstDoctorId = null;

    for (const doc of doctorsList) {
      // Create user account for doctor
      const userRes = await db.query(
        `INSERT INTO users (full_name, phone, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'DOCTOR')
         RETURNING id`,
        [doc.name, doc.phone, doc.email, defaultPasswordHash]
      );
      const docUserId = userRes.rows[0].id;

      // Create doctor profile linked to user
      const docRes = await db.query(
        `INSERT INTO doctors (user_id, full_name, specialty, qualification, experience_years, phone_contact, profile_image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [docUserId, doc.name, doc.specialty, doc.qualification, doc.experience, doc.phone, doc.image]
      );
      const doctorId = docRes.rows[0].id;

      if (!firstDoctorId) {
        firstDoctorId = doctorId;
      }

      // Create weekly schedule slots
      for (const day of doc.days) {
        await db.query(
          `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
           VALUES ($1, $2, $3, $4, 15)`,
          [doctorId, day, doc.startTime, doc.endTime]
        );
      }
    }

    // 5. Create Sample Appointments (1 In-Person OPD Token, 1 Online Consultation)
    await db.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, time_slot, consultation_type, token_number, status, notes)
       VALUES ($1, $2, CURRENT_DATE + INTERVAL '1 day', '10:15:00', 'IN_PERSON', 1, 'BOOKED', 'Initial consultation')`,
      [patientId, firstDoctorId]
    );

    await db.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, time_slot, consultation_type, meeting_link, status, notes)
       VALUES ($1, $2, CURRENT_DATE + INTERVAL '2 day', '11:00:00', 'ONLINE', 'https://meet.jit.si/sanjay-med-consult-sample', 'BOOKED', 'Follow-up consultation')`,
      [patientId, firstDoctorId]
    );

    console.log('Seeding completed successfully! Real doctors, schedules, and test appointments populated.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedData();