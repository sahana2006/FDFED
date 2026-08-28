const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('back-end/data/hospital-branches.sqlite');

// Make the existing branches OVERDUE by setting subscriptionDue to yesterday
// and planTier to 'pro' for testing.
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const dateStr = yesterday.toISOString();

db.serialize(() => {
  db.run(`UPDATE hospital_branches SET planTier = 'pro', subscriptionDue = ? WHERE planTier IS NULL OR subscriptionDue IS NULL`, [dateStr], function(err) {
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
