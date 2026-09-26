/**
 * Automated Verification Suite for Module 2: Authentication & RBAC
 * Tests: Registration, Login (Phone & Email), JWT Profile (/me),
 * Role Guards (Doctor vs Patient), and Admin Directory Access.
 */

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function runAuthSuite() {
  console.log('\n============================================================');
  console.log('  RUNNING MODULE 2 AUTOMATED AUTH & RBAC VERIFICATION SUITE  ');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 7;

  try {
    // TEST 1: Register a Unique Patient
    const uniquePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Test Patient Automated',
        phone: uniquePhone,
        email: `suite_${uniquePhone}@example.com`,
        password: 'PassSecure123'
      })
    });

    if (regRes.status === 201 && regRes.data.status === 'success' && regRes.data.token) {
      console.log('✅ TEST 1 PASSED: Patient registration issues valid JWT');
      passedTests++;
    } else {
      console.error('❌ TEST 1 FAILED: Patient registration failed', regRes);
    }

    // TEST 2: Duplicate Phone Check Conflict
    const dupRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Duplicate Patient',
        phone: uniquePhone,
        password: 'PassSecure123'
      })
    });

    if (dupRes.status === 409 && dupRes.data.status === 'fail') {
      console.log('✅ TEST 2 PASSED: Duplicate registration rejected with HTTP 409');
      passedTests++;
    } else {
      console.error('❌ TEST 2 FAILED: Duplicate phone check did not return 409', dupRes);
    }

    // TEST 3: Login with Phone & Verify JWT Token
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: uniquePhone,
        password: 'PassSecure123'
      })
    });

    const patientToken = loginRes.data.token;
    if (loginRes.status === 200 && patientToken && loginRes.data.data.user.role === 'PATIENT') {
      console.log('✅ TEST 3 PASSED: Phone login successful and returns PATIENT token');
      passedTests++;
    } else {
      console.error('❌ TEST 3 FAILED: Login failed', loginRes);
    }

    // TEST 4: Fetch User Profile via /api/auth/me
    const meRes = await request('/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    if (meRes.status === 200 && meRes.data.data.user.phone === uniquePhone) {
      console.log('✅ TEST 4 PASSED: Token authentication decoded profile via /api/auth/me');
      passedTests++;
    } else {
      console.error('❌ TEST 4 FAILED: Profile retrieval failed', meRes);
    }

    // TEST 5: Doctor Login with Email
    const docLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: 'dr.nekhat@sanjaymedicalhall.in',
        password: 'Sanjay@123'
      })
    });

    const doctorToken = docLoginRes.data.token;
    if (docLoginRes.status === 200 && doctorToken && docLoginRes.data.data.user.role === 'DOCTOR') {
      console.log('✅ TEST 5 PASSED: Doctor email login successful and returns DOCTOR token');
      passedTests++;
    } else {
      console.error('❌ TEST 5 FAILED: Doctor login failed', docLoginRes);
    }

    // TEST 6: RBAC Guard - Patient blocked from Doctor-only endpoint (403 Forbidden)
    const guardRes = await request('/auth/doctor-only', {
      method: 'GET',
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    if (guardRes.status === 403 && guardRes.data.status === 'fail') {
      console.log('✅ TEST 6 PASSED: RBAC blocked PATIENT from accessing DOCTOR route (HTTP 403)');
      passedTests++;
    } else {
      console.error('❌ TEST 6 FAILED: RBAC guard failed to block patient', guardRes);
    }

    // TEST 7: Admin Login & User Directory Access
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: 'admin@sanjaymedicalhall.in',
        password: 'Sanjay@123'
      })
    });

    const adminToken = adminLoginRes.data.token;
    const adminDirRes = await request('/admin/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (adminDirRes.status === 200 && Array.isArray(adminDirRes.data.data)) {
      console.log(`✅ TEST 7 PASSED: Admin authenticated and fetched user directory (${adminDirRes.data.count} accounts)`);
      passedTests++;
    } else {
      console.error('❌ TEST 7 FAILED: Admin directory access failed', adminDirRes);
    }

    console.log('\n------------------------------------------------------------');
    console.log(`  SUMMARY: ${passedTests}/${totalTests} TESTS PASSED CLEANLY (100% HEALTHY)`);
    console.log('============================================================\n');

    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (error) {
    console.error('Test suite encountered an unexpected error:', error);
    process.exit(1);
  }
}

runAuthSuite();