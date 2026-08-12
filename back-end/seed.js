/**
 * seed.js — Seeds doctors, front desk staff, and branch admins
 * for the two real branches (Electronic City + Jayanagar).
 *
 * Run: node seed.js
 * (Backend must be running on http://localhost:3000)
 */

const API = 'http://localhost:3000';

const BRANCH_EC = '0941e1c8-9ec5-4fb0-9909-11250f7d1739';  // Electronic City
const BRANCH_JN = '27505bde-683f-4b09-81b7-c66c2dc68fa4';  // Jayanagar

async function post(path, body, role = 'super_admin') {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', role },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(json.message) ? json.message.join(', ') : json.message;
    throw new Error(`${res.status} ${path}: ${msg}`);
  }
  return json;
}

async function run() {
  console.log('\n=== MEDBITS Seed Script ===\n');

  // ── Branch Admin for Electronic City ──────────────────────────
  console.log('Creating branch admin for Electronic City...');
  try {
    await post('/super-admin/branch-admins', {
      name: 'Kiran Bhat',
      email: 'kiran.bhat@medbits.com',
      phone: '9123456001',
      password: 'Admin@123',
      branchId: BRANCH_EC,
    }, 'super_admin');
    console.log('  ✓ kiran.bhat@medbits.com created');
  } catch (e) {
    console.log('  ⚠ ' + e.message);
  }

  // ── Branch Admin for Jayanagar ─────────────────────────────────
  console.log('Creating branch admin for Jayanagar...');
  try {
    await post('/super-admin/branch-admins', {
      name: 'Meera Rao',
      email: 'meera.rao@medbits.com',
      phone: '9123456002',
      password: 'Admin@123',
      branchId: BRANCH_JN,
    }, 'super_admin');
    console.log('  ✓ meera.rao@medbits.com created');
  } catch (e) {
    console.log('  ⚠ ' + e.message);
  }

  // ── Doctors for Electronic City ────────────────────────────────
  const ecDoctors = [
    {
      name: 'Dr. Asha Krishnan', email: 'asha.krishnan@medbits.com', password: 'doctor123',
      specialization: 'Gynecologist', branchId: BRANCH_EC, department: 'Gynaecology',
      qualification: 'MBBS, MD - Obs & Gynae', experience: 14, age: 40, gender: 'Female',
      phone: '9345610001', licenseNo: 'MCI-GYN-2010-EC1',
      bio: 'Expert in high-risk pregnancies, laparoscopic gynaecology and women wellness.',
      slots: ['09:00', '09:30', '10:00', '10:30', '11:00'],
    },
    {
      name: 'Dr. Suresh Babu', email: 'suresh.babu@medbits.com', password: 'doctor123',
      specialization: 'Orthopedic', branchId: BRANCH_EC, department: 'Orthopaedics',
      qualification: 'MBBS, MS - Orthopaedics', experience: 16, age: 45, gender: 'Male',
      phone: '9345610002', licenseNo: 'MCI-ORT-2008-EC2',
      bio: 'Sports injury specialist with expertise in arthroscopy and joint reconstruction.',
      slots: ['11:00', '11:30', '12:00', '14:00', '14:30'],
    },
    {
      name: 'Dr. Nisha Reddy', email: 'nisha.reddy@medbits.com', password: 'doctor123',
      specialization: 'Pediatrician', branchId: BRANCH_EC, department: 'Paediatrics',
      qualification: 'MBBS, MD - Paediatrics', experience: 9, age: 36, gender: 'Female',
      phone: '9345610003', licenseNo: 'MCI-PED-2015-EC3',
      bio: 'Dedicated to newborn care, childhood immunisation and adolescent health.',
      slots: ['10:00', '10:30', '11:00', '11:30'],
    },
  ];

  console.log('\nSeeding doctors for Electronic City...');
  for (const doc of ecDoctors) {
    try {
      await post('/doctors', doc, 'admin');
      console.log(`  ✓ ${doc.name}`);
    } catch (e) {
      console.log(`  ⚠ ${doc.name}: ${e.message}`);
    }
  }

  // ── Front Desk for Electronic City ────────────────────────────
  const ecFD = [
    {
      name: 'Rekha Menon', email: 'rekha.menon@medbits.com', password: 'desk123',
      branchId: BRANCH_EC, phone: '9345610011', gender: 'Female',
      languages: ['English', 'Kannada', 'Malayalam'],
      counter: '1', shiftStart: '08:00', shiftEnd: '16:00',
    },
    {
      name: 'Arvind Kumar', email: 'arvind.kumar@medbits.com', password: 'desk123',
      branchId: BRANCH_EC, phone: '9345610012', gender: 'Male',
      languages: ['English', 'Hindi', 'Kannada'],
      counter: '2', shiftStart: '12:00', shiftEnd: '20:00',
    },
  ];

  console.log('\nSeeding front desk for Electronic City...');
  for (const fd of ecFD) {
    try {
      await post('/frontdesk', fd, 'admin');
      console.log(`  ✓ ${fd.name}`);
    } catch (e) {
      console.log(`  ⚠ ${fd.name}: ${e.message}`);
    }
  }

  // ── Doctors for Jayanagar ──────────────────────────────────────
  const jnDoctors = [
    {
      name: 'Dr. Mahesh Patil', email: 'mahesh.patil@medbits.com', password: 'doctor123',
      specialization: 'General', branchId: BRANCH_JN, department: 'General Medicine',
      qualification: 'MBBS, MD - General Medicine', experience: 12, age: 41, gender: 'Male',
      phone: '9245620001', licenseNo: 'MCI-GEN-2012-JN1',
      bio: 'General physician with focus on primary care, lifestyle diseases and preventive medicine.',
      slots: ['09:00', '09:30', '10:00', '10:30', '11:00'],
    },
    {
      name: 'Dr. Preethi Hegde', email: 'preethi.hegde@medbits.com', password: 'doctor123',
      specialization: 'Dermatologist', branchId: BRANCH_JN, department: 'Dermatology',
      qualification: 'MBBS, MD - Dermatology', experience: 8, age: 35, gender: 'Female',
      phone: '9245620002', licenseNo: 'MCI-DRM-2016-JN2',
      bio: 'Specialist in acne, psoriasis, hair loss treatments and aesthetic dermatology.',
      slots: ['11:00', '11:30', '12:00', '14:00', '14:30'],
    },
    {
      name: 'Dr. Ravi Shankar', email: 'ravi.shankar@medbits.com', password: 'doctor123',
      specialization: 'Cardiologist', branchId: BRANCH_JN, department: 'Cardiology',
      qualification: 'MBBS, MD, DM - Cardiology', experience: 18, age: 48, gender: 'Male',
      phone: '9245620003', licenseNo: 'MCI-CAR-2006-JN3',
      bio: 'Interventional cardiologist specializing in coronary artery disease and heart failure management.',
      slots: ['10:00', '10:30', '11:00', '11:30'],
    },
  ];

  console.log('\nSeeding doctors for Jayanagar...');
  for (const doc of jnDoctors) {
    try {
      await post('/doctors', doc, 'admin');
      console.log(`  ✓ ${doc.name}`);
    } catch (e) {
      console.log(`  ⚠ ${doc.name}: ${e.message}`);
    }
  }

  // ── Front Desk for Jayanagar ───────────────────────────────────
  const jnFD = [
    {
      name: 'Sunita Patel', email: 'sunita.patel@medbits.com', password: 'desk123',
      branchId: BRANCH_JN, phone: '9245620011', gender: 'Female',
      languages: ['English', 'Kannada', 'Hindi'],
      counter: '1', shiftStart: '08:00', shiftEnd: '16:00',
    },
    {
      name: 'Deepak Joshi', email: 'deepak.joshi@medbits.com', password: 'desk123',
      branchId: BRANCH_JN, phone: '9245620012', gender: 'Male',
      languages: ['English', 'Hindi'],
      counter: '2', shiftStart: '14:00', shiftEnd: '22:00',
    },
  ];

  console.log('\nSeeding front desk for Jayanagar...');
  for (const fd of jnFD) {
    try {
      await post('/frontdesk', fd, 'admin');
      console.log(`  ✓ ${fd.name}`);
    } catch (e) {
      console.log(`  ⚠ ${fd.name}: ${e.message}`);
    }
  }

  console.log('\n=== Seed complete! ===');
  console.log('\nLogin credentials:');
  console.log('─────────────────────────────────────────────');
  console.log('Apollo Main Branch (ADM001):');
  console.log('  Email: admin@medbits.com | Password: admin123');
  console.log('  BranchId: 00000000-0000-4000-8000-000000000001');
  console.log('\nElectronic City Branch:');
  console.log('  Email: kiran.bhat@medbits.com | Password: Admin@123');
  console.log(`  BranchId: ${BRANCH_EC}`);
  console.log('\nJayanagar Branch:');
  console.log('  Email: meera.rao@medbits.com | Password: Admin@123');
  console.log(`  BranchId: ${BRANCH_JN}`);
  console.log('─────────────────────────────────────────────');
}

run().catch(console.error);
