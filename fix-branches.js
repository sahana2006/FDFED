const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('back-end/data/hospital-branches.sqlite');

db.serialize(() => {
  db.all('SELECT hospitalName, branchName, status FROM hospital_branches', (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Current branches in DB:');
      console.table(rows);
    }
    db.close();
  });
});
