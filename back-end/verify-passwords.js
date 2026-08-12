const sqlite3 = require('sqlite3');
const { scrypt: scryptCallback, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(scryptCallback);

async function verifyPassword(password, storedHash) {
  const [algorithm, salt, hash] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const derivedHash = await scrypt(password, salt, 64);
  const storedHashBuffer = Buffer.from(hash, 'hex');
  return storedHashBuffer.length === derivedHash.length
    && timingSafeEqual(storedHashBuffer, derivedHash);
}

async function main() {
  const db = new sqlite3.Database('data/hospital-branches.sqlite');
  
  const rows = await new Promise((resolve, reject) => {
    db.all('SELECT userId, name, email, password FROM branch_admins', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  db.close();

  const testPasswords = ['admin123', 'Admin@123', 'admin', 'Admin123', 'medbits123'];
  
  for (const row of rows) {
    console.log(`\n${row.userId} (${row.email || 'no email'}):`);
    if (!row.password) { console.log('  No password stored'); continue; }
    for (const pw of testPasswords) {
      const ok = await verifyPassword(pw, row.password);
      if (ok) console.log(`  ✓ Password is: ${pw}`);
    }
  }
  console.log('\nDone');
}

main().catch(console.error);
