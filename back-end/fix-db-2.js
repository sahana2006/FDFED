const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/hospital-branches.sqlite');

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const dateStr = yesterday.toISOString();

db.serialize(() => {
  db.run(`UPDATE hospital_branches SET planTier = 'pro', subscriptionDue = ? WHERE planTier IS NULL OR planTier = 'base'`, [dateStr], function(err) {
    if (err) {
      console.error('Error updating branches:', err.message);
    } else {
      console.log(`Updated ${this.changes} branches to be OVERDUE on Pro plan.`);
    }
  });

  db.all('SELECT hospitalName, branchName, planTier, subscriptionDue FROM hospital_branches', (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Current branches in DB:');
      console.table(rows);
    }
    db.close();
  });
});
