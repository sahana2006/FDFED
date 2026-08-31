/* ============================================================
   Branch Admin - Earnings Page
   Live data from GET /appointments/earnings/branch
   ============================================================ */

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

(async () => {
  try {
    await loadComponents('earnings', 'Earnings');
  } catch (e) {
    console.error('loadComponents error:', e);
  }

  updateTopbarUser();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthLabel = `${MONTHS_LONG[currentMonth]} ${currentYear}`;

  setText('kpiMonthLabel', monthLabel);
  setText('ledgerMonthLabel', monthLabel);
  setText('summaryMonthTitle', monthLabel);

  try {
    const data = await apiRequest('/appointments/earnings/branch');
    renderEarnings(data, currentMonth, currentYear, monthLabel);
  } catch (err) {
    console.error('Branch earnings fetch error:', err);
    showToast(err.message || 'Failed to load earnings', 'error');
    renderBranchError(err.message);
  }
})();

function fmtCurrency(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function pct(part, total) {
  if (!total) return 0;
  return Math.max(Math.round((part / total) * 100), 2);
}

function renderEarnings(data, currentMonth, currentYear, monthLabel) {
  const allAppointments = Array.isArray(data.entries) ? data.entries : [];
  const allLabEntries = Array.isArray(data.labEntries) ? data.labEntries : [];

  const monthAppointments = allAppointments.filter((entry) => {
    const d = new Date(`${entry.date}T00:00:00`);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthLabEntries = allLabEntries.filter((entry) => {
    const d = new Date(entry.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthAppointmentRevenue = monthAppointments.reduce((sum, entry) => sum + (entry.consultationFee || 0), 0);
  const monthLabRevenue = monthLabEntries.reduce((sum, entry) => sum + (entry.testPrice || 0), 0);
  const monthRevenue = monthAppointmentRevenue + monthLabRevenue;
  const monthCuts = monthAppointments.reduce((sum, entry) => sum + (entry.doctorEarning || 0), 0);
  const monthAppointmentProfit = monthAppointments.reduce((sum, entry) => sum + (entry.branchProfit || 0), 0);
  const monthProfit = monthAppointmentProfit + monthLabRevenue;

  setText('heroBadgeValue', fmtCurrency(monthRevenue));
  setText('heroBadgeNote', monthLabel);

  setText('kpiTotalRevenue', fmtCurrency(data.totalRevenue || 0));
  setText('kpiMonthRevenue', fmtCurrency(monthRevenue));
  setText('kpiTotalCuts', fmtCurrency(data.totalDoctorCuts || 0));
  setText('kpiLabRevenue', fmtCurrency(data.totalLabTestRevenue || 0));
  setText('kpiMonthProfit', fmtCurrency(monthProfit));

  setBar('barRevenue', 'barRevenueVal', monthRevenue, monthRevenue);
  setBar('barCuts', 'barCutsVal', monthCuts, monthRevenue);
  setBar('barProfit', 'barProfitVal', monthProfit, monthRevenue);

  setText('healthTotal', data.completedAppointmentsCount || 0);
  setText('healthMonth', monthAppointments.length);
  setText('healthLabTests', monthLabEntries.length);
  const margin = monthRevenue ? `${Math.round((monthProfit / monthRevenue) * 100)}%` : '—';
  setText('healthMargin', margin);

  setText('summaryCount', `${monthAppointments.length} appointments · ${monthLabEntries.length} lab tests`);

  setText('allTimeRevenue', fmtCurrency(data.totalRevenue || 0));
  setText('allTimeCuts', fmtCurrency(data.totalDoctorCuts || 0));
  setText('allTimeLabRevenue', fmtCurrency(data.totalLabTestRevenue || 0));
  setText('allTimeProfit', fmtCurrency(data.branchProfit || 0));

  setText('labCount', `${monthLabEntries.length} done`);

  renderDoctorBreakdown(monthAppointments);
  renderLabBreakdown(monthLabEntries);
  setText('ledgerCount', `${monthAppointments.length} appointments`);
  renderLedger(monthAppointments);
}

function setBar(barId, valId, value, total) {
  const el = document.getElementById(barId);
  if (el) el.style.width = `${pct(value, total)}%`;
  setText(valId, fmtCurrency(value));
}

function renderDoctorBreakdown(entries) {
  const container = document.getElementById('doctorBreakdownList');
  if (!container) return;

  const byDoctor = {};
  entries.forEach((e) => {
    if (!byDoctor[e.doctorId]) {
      byDoctor[e.doctorId] = {
        name: e.doctorName || e.doctorId,
        cut: 0,
        pct: e.percentageCut || 0,
        count: 0,
      };
    }
    byDoctor[e.doctorId].cut += e.doctorEarning || 0;
    byDoctor[e.doctorId].count += 1;
  });

  const doctors = Object.values(byDoctor).sort((a, b) => b.cut - a.cut);

  if (!doctors.length) {
    container.innerHTML = `
      <div class="mini-item">
        <div style="color:var(--text-muted);font-size:.875rem;">
          No completed appointments this month.
        </div>
      </div>`;
    return;
  }

  container.innerHTML = doctors.map((doctor) => `
    <div class="mini-item">
      <div>
        <div class="mini-label">${escHtml(doctor.name)}</div>
        <div class="mini-meta">${doctor.pct}% cut · ${doctor.count} appointment${doctor.count !== 1 ? 's' : ''}</div>
      </div>
      <div class="mini-value cut-value">${fmtCurrency(doctor.cut)}</div>
    </div>`).join('');
}

function renderLabBreakdown(entries) {
  const container = document.getElementById('labBreakdownList');
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = `
      <div class="mini-item">
        <div style="color:var(--text-muted);font-size:.875rem;">
          No completed lab tests this month.
        </div>
      </div>`;
    return;
  }

  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  container.innerHTML = sorted.slice(0, 6).map((entry) => `
    <div class="mini-item">
      <div>
        <div class="mini-label">${escHtml(entry.testName || 'Lab Test')}</div>
        <div class="mini-meta">${escHtml(entry.patientName || 'Unknown patient')} · ${fmtDate(entry.date)} · ${escHtml(entry.technicianName || 'Lab Technician')}</div>
      </div>
      <div class="mini-value cut-value">${fmtCurrency(entry.testPrice || 0)}</div>
    </div>`).join('');
}

function renderLedger(entries) {
  const tbody = document.getElementById('ledgerTbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!entries.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:40px 16px;color:var(--text-muted);">
          <div style="font-size:1.5rem;margin-bottom:8px;">💰</div>
          <div>No completed appointments this month.</div>
        </td>
      </tr>`;
    return;
  }

  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach((entry) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(entry.date)}</td>
      <td><strong>${escHtml(entry.patientName)}</strong></td>
      <td>${escHtml(entry.doctorName)}</td>
      <td><code style="font-size:.78rem;color:var(--text-muted);">${escHtml(entry.appointmentId)}</code></td>
      <td><span class="revenue-badge">${fmtCurrency(entry.consultationFee)}</span></td>
      <td class="td-cut-col">${entry.percentageCut}% → ${fmtCurrency(entry.doctorEarning)}</td>
      <td class="td-doc-earn">${fmtCurrency(entry.doctorEarning)}</td>
      <td class="td-branch-profit">${fmtCurrency(entry.branchProfit)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderBranchError(msg) {
  const tbody = document.getElementById('ledgerTbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">
          ⚠️ ${escHtml(msg || 'Failed to load earnings data. Please refresh.')}
        </td>
      </tr>`;
  }
  [
    'kpiTotalRevenue', 'kpiMonthRevenue', 'kpiTotalCuts', 'kpiLabRevenue', 'kpiMonthProfit',
    'allTimeRevenue', 'allTimeCuts', 'allTimeLabRevenue', 'allTimeProfit',
    'heroBadgeValue', 'barRevenueVal', 'barCutsVal', 'barProfitVal',
    'healthTotal', 'healthMonth', 'healthLabTests', 'healthMargin',
    'summaryCount', 'ledgerCount', 'labCount',
  ].forEach((id) => setText(id, '—'));
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
