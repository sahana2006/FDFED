/* ============================================================
   Doctor Portal — Earnings Page   (earnings.js)
   ============================================================ */

const API_BASE = 'http://localhost:3000';
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

(async () => {
  try {
    await loadComponents('earnings', 'Earnings');
  } catch (e) {
    console.error('loadComponents failed:', e);
  }

  // Read session — components.js sets up auth redirect if not logged in
  let session = {};
  try {
    session = JSON.parse(localStorage.getItem('user') || '{}');
  } catch (_) {}

  const doctorId = session.doctorId || session.id || '';

  if (!doctorId) {
    showPageError('Doctor session not found. Please log in again.');
    return;
  }

  const now          = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();
  const monthLabel   = `${MONTHS[currentMonth]} ${currentYear}`;

  // Update month labels first (synchronous — happens before fetch)
  setText('currentMonthLabel', monthLabel);
  setText('kpiMonthNote', monthLabel);

  try {
    const res = await fetch(
      `${API_BASE}/appointments/earnings/doctor/${encodeURIComponent(doctorId)}`,
      { headers: { role: 'doctor', 'x-user-id': doctorId } },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || `Server error ${res.status}`);
    }

    const data = await res.json();
    renderEarnings(data, currentMonth, currentYear, monthLabel);

  } catch (err) {
    console.error('Earnings fetch error:', err);
    showPageError(err.message || 'Unable to load earnings. Is the server running?');
  }
})();

/* ── DOM helpers ── */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Render earnings data ── */
function renderEarnings(data, currentMonth, currentYear, monthLabel) {
  // Hero
  setText('heroTitle', `Dr. ${data.doctorName || 'Doctor'}'s Earnings`);
  setText('heroSub',   `Your share for completed consultations · ${data.percentageCut}% cut per appointment`);
  setText('heroMonthValue', formatCurrency(data.currentMonthEarnings));
  setText('heroMonthNote',  monthLabel);

  // KPI cards
  setText('kpiTotal', formatCurrency(data.totalEarnings));
  setText('kpiMonth', formatCurrency(data.currentMonthEarnings));
  setText('kpiCount', String(data.entries.length));

  // Cut info band
  const band = document.getElementById('cutInfoBand');
  if (band) band.style.display = 'flex';
  setText('cutPct',    `${data.percentageCut}%`);
  setText('cutPctInline', `${data.percentageCut}%`);

  // Filter current-month entries for the ledger
  const monthEntries = data.entries.filter(e => {
    const d = new Date(`${e.date}T00:00:00`);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  renderTable(monthEntries);
}

/* ── Render ledger table ── */
function renderTable(entries) {
  const tbody = document.getElementById('earningsTbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!entries.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state-icon">💰</div>
            <div class="empty-state-msg">
              No completed consultations this month.<br>
              Complete an appointment to start tracking earnings.
            </div>
          </div>
        </td>
      </tr>`;
    return;
  }

  // Sort by date descending
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(e.date)}</td>
      <td><strong>${escHtml(e.patientName)}</strong></td>
      <td>${escHtml(e.slot)}</td>
      <td class="td-fee">${formatCurrency(e.consultationFee)}</td>
      <td class="td-cut">${e.percentageCut}%</td>
      <td class="td-earn"><span class="earn-amount">${formatCurrency(e.doctorEarning)}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

/* ── Error state ── */
function showPageError(msg) {
  setText('heroTitle', 'Earnings');
  setText('heroSub',   msg);
  setText('heroMonthValue', '₹0.00');
  setText('kpiTotal', '₹0.00');
  setText('kpiMonth', '₹0.00');
  setText('kpiCount', '0');

  const tbody = document.getElementById('earningsTbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-msg">${escHtml(msg)}</div>
          </div>
        </td>
      </tr>`;
  }

  if (typeof showToast === 'function') showToast(msg, 'error');
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
