/* ============================================================
   Branch Admin — Earnings Page   (earnings.js)
   Live data from GET /appointments/earnings/branch
   ============================================================ */

const MONTHS_LONG = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

(async () => {
  try {
    await loadComponents('earnings', 'Earnings');
  } catch (e) {
    console.error('loadComponents error:', e);
  }

  updateTopbarUser();

  const now          = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();
  const monthLabel   = `${MONTHS_LONG[currentMonth]} ${currentYear}`;

  // Set month label elements immediately (synchronous)
  setText('kpiMonthLabel',      monthLabel);
  setText('ledgerMonthLabel',   monthLabel);
  setText('summaryMonthTitle',  monthLabel);

  try {
    const data = await apiRequest('/appointments/earnings/branch');
    renderEarnings(data, currentMonth, currentYear, monthLabel);
  } catch (err) {
    console.error('Branch earnings fetch error:', err);
    showToast(err.message || 'Failed to load earnings', 'error');
    renderBranchError(err.message);
  }
})();

/* ── Helpers ── */
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

/* ── Main render ── */
function renderEarnings(data, currentMonth, currentYear, monthLabel) {
  // Filter current-month entries
  const monthEntries = (data.entries || []).filter(e => {
    const d = new Date(`${e.date}T00:00:00`);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthRevenue = monthEntries.reduce((s, e) => s + (e.consultationFee || 0), 0);
  const monthCuts    = monthEntries.reduce((s, e) => s + (e.doctorEarning   || 0), 0);
  const monthProfit  = monthEntries.reduce((s, e) => s + (e.branchProfit    || 0), 0);

  // Hero badge
  setText('heroBadgeValue', fmtCurrency(monthRevenue));
  setText('heroBadgeNote',  monthLabel);

  // KPI cards
  setText('kpiTotalRevenue', fmtCurrency(data.totalRevenue    || 0));
  setText('kpiMonthRevenue', fmtCurrency(monthRevenue));
  setText('kpiTotalCuts',    fmtCurrency(data.totalDoctorCuts || 0));
  setText('kpiMonthProfit',  fmtCurrency(monthProfit));

  // Summary bars (widths relative to monthly revenue)
  setBar('barRevenue', 'barRevenueVal', monthRevenue, monthRevenue);
  setBar('barCuts',    'barCutsVal',    monthCuts,    monthRevenue);
  setBar('barProfit',  'barProfitVal',  monthProfit,  monthRevenue);

  // Health cards
  setText('healthTotal',  data.completedAppointmentsCount || 0);
  setText('healthMonth',  monthEntries.length);
  const margin = monthRevenue
    ? `${Math.round((monthProfit / monthRevenue) * 100)}%`
    : '—';
  setText('healthMargin', margin);

  // Summary pills
  setText('summaryCount', `${monthEntries.length} Completed`);

  // All-time panel
  setText('allTimeRevenue', fmtCurrency(data.totalRevenue    || 0));
  setText('allTimeCuts',    fmtCurrency(data.totalDoctorCuts || 0));
  setText('allTimeProfit',  fmtCurrency(data.branchProfit    || 0));

  // Doctor breakdown (this month)
  renderDoctorBreakdown(monthEntries);

  // Ledger
  setText('ledgerCount', `${monthEntries.length} appointments`);
  renderLedger(monthEntries);
}

function setBar(barId, valId, value, total) {
  const el = document.getElementById(barId);
  if (el) el.style.width = `${pct(value, total)}%`;
  setText(valId, fmtCurrency(value));
}

/* ── Doctor breakdown panel ── */
function renderDoctorBreakdown(entries) {
  const container = document.getElementById('doctorBreakdownList');
  if (!container) return;

  const byDoctor = {};
  entries.forEach(e => {
    if (!byDoctor[e.doctorId]) {
      byDoctor[e.doctorId] = {
        name: e.doctorName || e.doctorId,
        cut: 0,
        pct: e.percentageCut || 0,
        count: 0,
      };
    }
    byDoctor[e.doctorId].cut   += (e.doctorEarning || 0);
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

  container.innerHTML = doctors.map(d => `
    <div class="mini-item">
      <div>
        <div class="mini-label">${escHtml(d.name)}</div>
        <div class="mini-meta">${d.pct}% cut · ${d.count} appointment${d.count !== 1 ? 's' : ''}</div>
      </div>
      <div class="mini-value cut-value">${fmtCurrency(d.cut)}</div>
    </div>`).join('');
}

/* ── Appointments ledger ── */
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

  sorted.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(e.date)}</td>
      <td><strong>${escHtml(e.patientName)}</strong></td>
      <td>${escHtml(e.doctorName)}</td>
      <td><code style="font-size:.78rem;color:var(--text-muted);">${escHtml(e.appointmentId)}</code></td>
      <td><span class="revenue-badge">${fmtCurrency(e.consultationFee)}</span></td>
      <td class="td-cut-col">${e.percentageCut}% → ${fmtCurrency(e.doctorEarning)}</td>
      <td class="td-doc-earn">${fmtCurrency(e.doctorEarning)}</td>
      <td class="td-branch-profit">${fmtCurrency(e.branchProfit)}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ── Error state ── */
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
    'kpiTotalRevenue','kpiMonthRevenue','kpiTotalCuts','kpiMonthProfit',
    'allTimeRevenue','allTimeCuts','allTimeProfit',
    'heroBadgeValue','barRevenueVal','barCutsVal','barProfitVal',
  ].forEach(id => setText(id, '—'));
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
