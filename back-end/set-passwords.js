/**
 * set-passwords.js — Set passwords for BAD001 and BAD002 branch admins
 * Run: node set-passwords.js
 */
const sqlite3 = require('sqlite3');
const { scrypt: scryptCallback, randomBytes } = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function main() {
  const db = new sqlite3.Database('data/hospital-branches.sqlite');

  // Set password for BAD001 (Ramesh - Electronic City)
  const bad001Hash = await hashPassword('Admin@123');
  await new Promise((resolve, reject) => {
    db.run(
      "UPDATE branch_admins SET password = ? WHERE userId = 'BAD001'",
      [bad001Hash],
      function(err) {
        if (err) { console.error('BAD001 failed:', err.message); reject(err); }
        else { console.log('BAD001 (rameshmedbits@gmail.com) password set to: Admin@123, rows changed:', this.changes); resolve(); }
      }
    );
  });

  // Reset BAD002 password too (we don't know what it was)
  const bad002Hash = await hashPassword('Admin@123');
  await new Promise((resolve, reject) => {
    db.run(
      "UPDATE branch_admins SET password = ? WHERE userId = 'BAD002'",
      [bad002Hash],
      function(err) {
        if (err) { console.error('BAD002 failed:', err.message); reject(err); }
        else { console.log('BAD002 (ram@gmail.com) password set to: Admin@123, rows changed:', this.changes); resolve(); }
      }
    );
  });

  db.close(() => {
    console.log('\nDone! Restart the backend server for changes to take effect.');
    console.log('\n=== Branch Admin Credentials ===');
    console.log('Apollo Main Branch:  admin@medbits.com / admin123');
    console.log('Electronic City:     rameshmedbits@gmail.com / Admin@123');
    console.log('Jayanagar:           ram@gmail.com / Admin@123');
  });
}

main().catch(console.error);
