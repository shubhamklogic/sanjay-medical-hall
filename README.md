# Sanjay Medical Hall – Clinical Management & Healthcare Platform

[![Live Platform](https://img.shields.io/badge/Live_Site-sanjaymedicalhall.in-blue?style=flat-square)](https://sanjaymedicalhall.in)
[![Stack](https://img.shields.io/badge/Architecture-Full--Stack_Web-green)](https://github.com/shubhamklogic/sanjay-medical-hall/tree/dev)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_Neon-blue?logo=postgresql)](https://neon.tech)
[![Milestone](https://img.shields.io/badge/Release-v0.2--auth--rbac-orange)](https://github.com/shubhamklogic/sanjay-medical-hall/tree/dev)

A centralized clinical appointment management and digital healthcare portal for **Sanjay Medical Hall**.

- **Production Domain (Static Edge):** [https://sanjaymedicalhall.in](https://sanjaymedicalhall.in)
- **Active Full-Stack Development Branch:** Inspect the [`dev`](https://github.com/shubhamklogic/sanjay-medical-hall/tree/dev) branch for the complete Node.js/Express REST backend, PostgreSQL schemas, and automated test suite.

---

## Key Platform Features

- **Specialist Roster & Doctor Directory:** Dynamic profiles showcasing visiting specialists across Gynecology, Cardiology, Dermatology, Dental, Pediatrics, and Neurosurgery.
- **Appointment Scheduling Engine:** Slot booking framework designed to eliminate overlapping double-bookings across in-person (OPD) and tele-consultation visits.
- **Role-Based Access Control (RBAC):** Multi-role authentication (Patient, Doctor, Admin) secured with JSON Web Tokens (JWT) and bcrypt password hashing.
- **Asymmetric Document Records:** Storage architecture for patient-uploaded historical diagnostics (pathology/ultrasound) alongside doctor-uploaded handwritten tele-consultation prescriptions.
- **Automated Verification Suite:** Integrated test runner executing end-to-end assertions against registration, authentication, token verification, and route security.

---

## System Architecture

```text
Frontend (Client)
├── Responsive HTML5/CSS3 Interface (Deployed on custom domain via GitHub Pages)
├── Client-side Form Validation & Appointment Flow
└── Dynamic Specialist Roster Rendering

Backend Services (Node.js / Express — Active on 'dev' branch)
├── RESTful API Endpoints (/api/auth, /api/doctors, /api/schedules, /api/appointments, /api/records)
├── Role-Based Access Control (RBAC) via JWT & bcryptjs
├── Automated Test Suite (scripts/testAuthSuite.js)
└── Database Connection Pooling (pg Pool)

Data Layer (Cloud PostgreSQL via Neon)
├── Normalized Relational Schemas (users, doctors, doctor_schedules, appointments, medical_records, patient_profiles)
├── Partial Unique Constraints (slot conflict prevention)
└── Indexed Lookups on foreign keys and roles
```

---

## Database Design & Integrity Rules

The appointment scheduling pipeline relies on relational integrity constraints to guarantee zero overlapping double-bookings:

```sql
-- Schema Highlight: Conflict-Free Appointment Constraints
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    appointment_date DATE NOT NULL,
    time_slot TIME NOT NULL,
    consultation_type VARCHAR(20) NOT NULL,   -- CHECK: in-person / tele-consultation
    token_number INT,
    meeting_link VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'BOOKED',  -- CHECK: BOOKED, ..., CANCELLED
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Guarantees no two active bookings share the same doctor, date, and time slot
CREATE UNIQUE INDEX idx_unique_active_slot
ON appointments(doctor_id, appointment_date, time_slot)
WHERE status != 'CANCELLED';
```

Cancelled appointments release their slot, so it can be rebooked, while any two active bookings for the same doctor, date, and time are rejected by the database itself.

---

## Technology Stack

- **Client:** HTML5, CSS3, JavaScript (Vanilla ES6+), Responsive Layouts
- **Backend & APIs:** Node.js, Express.js, RESTful Architecture
- **Authentication:** JSON Web Tokens (JWT), bcryptjs password hashing
- **Database:** PostgreSQL (Neon serverless cloud), Relational Schema Design
- **Testing:** Automated Node.js integration verification suite
- **Infrastructure & Hosting:** GitHub Pages (Static Edge / CNAME DNS routing), Custom Domain SSL

---

## Local Setup (`dev` branch)

```bash
git clone https://github.com/shubhamklogic/sanjay-medical-hall.git
cd sanjay-medical-hall
git checkout dev
cd server
npm install
```

Create `server/.env` (never commit this file):

```env
DATABASE_URL=your_neon_postgres_connection_string
JWT_SECRET=your_long_random_secret
PORT=5000
```

Initialize the database and start the server:

```bash
psql "$DATABASE_URL" -f initDb.sql
npm start
```

Run the automated verification suite:

```bash
node scripts/testAuthSuite.js
```

---

## Release History

| Tag | Description |
|-----|-------------|
| `v0.2-auth-rbac` | JWT authentication, bcrypt hashing, role-based access control, PostgreSQL schema, automated auth test suite |

---

## Author

- **Shubham Kumar** ([@shubhamklogic](https://github.com/shubhamklogic))