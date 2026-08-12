import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_BRANCH_ID = '00000000-0000-4000-8000-000000000001';
const SLOTS_DEFAULT = JSON.stringify(['10:00', '10:30', '11:00', '11:30', '12:00']);

export class SeedDoctorsAndFrontdesk1720000000012 implements MigrationInterface {
  name = 'SeedDoctorsAndFrontdesk1720000000012';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Seed Apollo branch doctors ─────────────────────────────────────────────
    const doctors = [
      { id: 'DOC001', userId: 'DOC001', name: 'Dr. S Madhuri',    specialization: 'Dermatologist', department: 'Dermatology',      qualification: 'MBBS, MD - Dermatology',      experience: 12, age: 38, gender: 'Female', email: 'madhuri@medbits.com',          phone: '9876541001', licenseNo: 'MCI-DRM-2012-001', bio: 'Specialist in skin disorders, cosmetic dermatology and laser treatments with 12 years of clinical experience.' },
      { id: 'DOC002', userId: 'DOC002', name: 'Dr. Ashwini Ray',  specialization: 'Dermatologist', department: 'Dermatology',      qualification: 'MBBS, DNB - Dermatology',     experience: 8,  age: 34, gender: 'Female', email: 'ashwini.ray@medbits.com',      phone: '9876541002', licenseNo: 'MCI-DRM-2016-002', bio: 'Focused on pediatric dermatology, eczema management and phototherapy.' },
      { id: 'DOC003', userId: 'DOC003', name: 'Dr. Sarah Johnson', specialization: 'Cardiologist',  department: 'Cardiology',       qualification: 'MBBS, MD, DM - Cardiology',   experience: 15, age: 44, gender: 'Female', email: 'sarah.johnson@medbits.com',    phone: '9384751206', licenseNo: 'MCI-CAR-2009-003', bio: 'Interventional cardiologist specializing in angioplasty, heart failure management and preventive cardiology.' },
      { id: 'DOC004', userId: 'DOC004', name: 'Dr. Ramesh Iyer',  specialization: 'Cardiologist',  department: 'Cardiology',       qualification: 'MBBS, MD, DM - Cardiology',   experience: 20, age: 50, gender: 'Male',   email: 'ramesh.iyer@medbits.com',      phone: '9876541004', licenseNo: 'MCI-CAR-2004-004', bio: 'Senior cardiologist with expertise in echocardiography, cardiac arrhythmias and valve disorders.' },
      { id: 'DOC005', userId: 'DOC005', name: 'Dr. Paul Johnson', specialization: 'Pediatrician',  department: 'Paediatrics',      qualification: 'MBBS, MD - Paediatrics',      experience: 10, age: 39, gender: 'Male',   email: 'paul.johnson@medbits.com',     phone: '9876541005', licenseNo: 'MCI-PED-2014-005', bio: 'Dedicated to child health and development, neonatal care, and adolescent medicine.' },
      { id: 'DOC006', userId: 'DOC006', name: 'Dr. Robert Wilson', specialization: 'Orthopedic',   department: 'Orthopaedics',     qualification: 'MBBS, MS - Orthopaedics',     experience: 18, age: 47, gender: 'Male',   email: 'robert.wilson@medbits.com',    phone: '9876541006', licenseNo: 'MCI-ORT-2006-006', bio: 'Expert in joint replacement, sports injuries, spine surgery and trauma management.' },
      { id: 'DOC007', userId: 'DOC007', name: 'Dr. Anita Gupta',  specialization: 'Neurologist',   department: 'Neurology',        qualification: 'MBBS, MD, DM - Neurology',    experience: 14, age: 43, gender: 'Female', email: 'anita.gupta@medbits.com',      phone: '9876541007', licenseNo: 'MCI-NEU-2010-007', bio: 'Specialist in epilepsy, migraine, stroke management and neurodegenerative disorders.' },
      { id: 'DOC008', userId: 'DOC008', name: 'Dr. Kavita Sharma', specialization: 'General',      department: 'General Medicine', qualification: 'MBBS, MD - General Medicine', experience: 9,  age: 36, gender: 'Female', email: 'kavita.sharma@medbits.com',    phone: '9876541008', licenseNo: 'MCI-GEN-2015-008', bio: 'Primary care physician with focus on preventive medicine, chronic disease management and patient wellness.' },
      { id: 'DOC009', userId: 'DOC009', name: 'Dr. Vikram Nair',  specialization: 'General',      department: 'General Medicine', qualification: 'MBBS, MD - General Medicine', experience: 11, age: 40, gender: 'Male',   email: 'vikram.nair@medbits.com',      phone: '9876541009', licenseNo: 'MCI-GEN-2013-009', bio: 'Experienced general physician managing acute and chronic conditions with emphasis on holistic patient care.' },
    ];

    for (const doc of doctors) {
      await queryRunner.query(`
        INSERT OR IGNORE INTO "doctors" (
          "id", "userId", "name", "specialization", "branchId", "department",
          "qualification", "experience", "age", "gender", "email", "phone",
          "licenseNo", "bio", "slots"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        doc.id, doc.userId, doc.name, doc.specialization, DEFAULT_BRANCH_ID, doc.department,
        doc.qualification, doc.experience, doc.age, doc.gender, doc.email, doc.phone,
        doc.licenseNo, doc.bio, SLOTS_DEFAULT,
      ]);
    }

    // ── Seed default frontdesk (Priya Nair) ────────────────────────────────────
    await queryRunner.query(`
      INSERT OR IGNORE INTO "frontdesks" (
        "userId", "branchId", "name", "email", "phone", "gender",
        "reportingManagerId", "languages", "counter", "shiftStart", "shiftEnd"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'FD001', DEFAULT_BRANCH_ID, 'Priya Nair', 'frontdesk@medbits.com',
      '9876541010', 'Female', 'ADM001', '["English","Hindi"]', '1', '09:00', '17:00',
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "doctors" WHERE "id" IN ('DOC001','DOC002','DOC003','DOC004','DOC005','DOC006','DOC007','DOC008','DOC009')`);
    await queryRunner.query(`DELETE FROM "frontdesks" WHERE "userId" = 'FD001'`);
  }
}
