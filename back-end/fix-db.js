const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/hospital-branches.sqlite');

db.serialize(() => {
  // Fix ADM001 empty name/email - this was the root cause of login failure
  db.run(
    "UPDATE branch_admins SET name = 'Admin User', email = 'admin@medbits.com' WHERE userId = 'ADM001'",
    function(err) {
      if (err) console.error('ADM001 fix failed:', err.message);
      else     console.log('ADM001 fixed. Rows changed:', this.changes);
    }
  );

  // Verify
  db.all('SELECT userId, name, email, branchId FROM branch_admins', (err, rows) => {
    if (err) return console.error(err);
    rows.forEach(r => console.log(JSON.stringify(r)));
    db.close(() => console.log('\nDone. Please restart the backend server now.'));
  });
});
