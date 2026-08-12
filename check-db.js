const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('back-end/data/hospital-branches.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
  if (err) return console.error(err);
  console.log('Tables:', rows.map(r => r.name).join(', '));
  
  db.all('SELECT COUNT(*) as cnt FROM doctors', (e, r) => {
    console.log('Doctors in DB:', e ? 'error: '+e.message : r[0].cnt);
  });
  
  db.all('SELECT COUNT(*) as cnt FROM frontdesks', (e, r) => {
    console.log('Frontdesks in DB:', e ? 'error: '+e.message : r[0].cnt);
    db.close();
  });
});
