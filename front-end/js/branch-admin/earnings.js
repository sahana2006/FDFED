/* ============================================================
   Branch Admin - Earnings Page
   Live data from GET /appointments/earnings/branch
   ============================================================ */

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

const state = {
  data: null,
  selectedMonthKey: '',
};

(async () => {
  try {
    await loadComponents('earnings', 'Earnings');
  } catch (e) {
    console.error('loadComponents error:', e);
  }

  updateTopbarUser();

  try {
    const data = await apiRequest('/appointments/earnings/branch');
    state.data = data;
    ensureMonthFilter();

    const monthKeys = getAvailableMonthKeys(data);
    state.selectedMonthKey = resolveDefaultMonthKey(monthKeys);
    populateMonthSelect(monthKeys, state.selectedMonthKey);
    renderEarnings(data, state.selectedMonthKey);
  } catch (err) {
    console.error('Branch earnings fetch error:', err);
    showToast(err.message || 'Failed to load earnings', 'error');
    renderBranchError(err.message);
  }
})();

function fmtCurrency(n) {
  return '\u20B9' + Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(dateStr) {
  if (!dateStr) return '\u2014';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function pct(part, total) {
  if (!total) return 0;
  return Math.max(Math.round((part / total) * 100), 2);
}

function ensureMonthFilter() {
  const heroBadge = document.getElementById('heroBadge');
  const wrapper = heroBadge?.parentElement;
  if (!wrapper || document.getElementById('monthSelect')) return;

  wrapper.classList.add('hero-controls');
  wrapper.insertAdjacentHTML('afterbegin', `
    <label class="month-filter">
      <span>Month</span>
      <select id="monthSelect" aria-label="Select revenue month"></select>
    </label>
  `);

  const select = document.getElementById('monthSelect');
  if (select && !select.dataset.bound) {
    select.addEventListener('change', () => {
      state.selectedMonthKey = select.value;
      if (state.data) {
        renderEarnings(state.data, state.selectedMonthKey);
      }
    });
    select.dataset.bound = '1';
  }
}

function getMonthKeyFromDate(dateStr) {
  if (!dateStr) return '';
  const rawDate = String(dateStr);
  const d = new Date(rawDate.length === 10 ? `${rawDate}T00:00:00` : rawDate);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthKey, fallbackDate = new Date()) {
  if (!monthKey) {
    return `${MONTHS_LONG[fallbackDate.getMonth()]} ${fallbackDate.getFullYear()}`;
  }

  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) {
    return `${MONTHS_LONG[fallbackDate.getMonth()]} ${fallbackDate.getFullYear()}`;
  }

  return `${MONTHS_LONG[month - 1]} ${year}`;
}

function getAvailableMonthKeys(data) {
  const keys = new Set();
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const allAppointments = Array.isArray(data?.entries) ? data.entries : [];
  const allLabEntries = Array.isArray(data?.labEntries) ? data.labEntries : [];

  allAppointments.forEach((entry) => {
    const key = getMonthKeyFromDate(entry.date);
    const revenue = Math.max(Number(entry.consultationFee || 0), Number(entry.branchProfit || 0));
    if (key && key <= currentKey && revenue > 0) keys.add(key);
  });

  allLabEntries.forEach((entry) => {
    const key = getMonthKeyFromDate(entry.date);
    if (key && key <= currentKey && Number(entry.testPrice || 0) > 0) keys.add(key);
  });

  keys.add(currentKey);

  return [...keys].sort((a, b) => b.localeCompare(a));
}

function resolveDefaultMonthKey(monthKeys) {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (monthKeys.includes(currentKey)) return currentKey;
  return monthKeys[0] || currentKey;
}

function populateMonthSelect(monthKeys, selectedKey) {
  const select = document.getElementById('monthSelect');
  if (!select) return;

  select.innerHTML = monthKeys.map((key) => `
    <option value="${key}">${escHtml(getMonthLabel(key))}</option>
  `).join('');
  select.disabled = !monthKeys.length;
  if (selectedKey) {
    select.value = selectedKey;
  }
}

function renderEarnings(data, selectedMonthKey) {
  const allAppointments = Array.isArray(data.entries) ? data.entries : [];
  const allLabEntries = Array.isArray(data.labEntries) ? data.labEntries : [];
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthKeys = getAvailableMonthKeys(data);
  const monthKey = monthKeys.includes(selectedMonthKey)
    ? selectedMonthKey
    : resolveDefaultMonthKey(monthKeys);
  const monthLabel = getMonthLabel(monthKey, now);

  const monthAppointments = allAppointments.filter((entry) => getMonthKeyFromDate(entry.date) === monthKey);
  const monthLabEntries = allLabEntries.filter((entry) => getMonthKeyFromDate(entry.date) === monthKey);

  const monthAppointmentRevenue = monthAppointments.reduce((sum, entry) => sum + Number(entry.consultationFee || 0), 0);
  const monthLabRevenue = monthLabEntries.reduce((sum, entry) => sum + Number(entry.testPrice || 0), 0);
  const monthRevenue = monthAppointmentRevenue + monthLabRevenue;
  const monthCuts = monthAppointments.reduce((sum, entry) => sum + (entry.doctorEarning || 0), 0);
  const monthAppointmentProfit = monthAppointments.reduce((sum, entry) => sum + (entry.branchProfit || 0), 0);
  const monthProfit = monthAppointmentProfit + monthLabRevenue;

  const badgeLabel = document.querySelector('#heroBadge .rbd-label');
  if (badgeLabel) {
    badgeLabel.textContent = monthKey === currentKey ? 'Current Month' : 'Selected Month';
  }

  const summaryEyebrow = document.querySelector('.analytics-panel .panel-eyebrow');
  const summaryCopy = document.querySelector('.analytics-panel .panel-copy');
  if (summaryEyebrow) {
    summaryEyebrow.textContent = monthKey === currentKey ? "This Month's Summary" : 'Selected Month Summary';
  }
  if (summaryCopy) {
    summaryCopy.textContent = `Revenue vs doctor cuts vs branch profit for ${monthLabel}, including lab-test income.`;
  }

  setText('heroBadgeValue', fmtCurrency(monthRevenue));
  setText('heroBadgeNote', monthLabel);

  setText('kpiTotalRevenue', fmtCurrency(data.totalRevenue || 0));
  setText('kpiMonthRevenue', fmtCurrency(monthRevenue));
  setText('kpiTotalCuts', fmtCurrency(data.totalDoctorCuts || 0));
  setText('kpiLabRevenue', fmtCurrency(monthLabRevenue));
  setText('kpiMonthProfit', fmtCurrency(monthProfit));
  setText('kpiMonthLabel', monthLabel);

  setBar('barRevenue', 'barRevenueVal', monthRevenue, monthRevenue);
  setBar('barCuts', 'barCutsVal', monthCuts, monthRevenue);
  setBar('barProfit', 'barProfitVal', monthProfit, monthRevenue);

  setText('healthTotal', data.completedAppointmentsCount || 0);
  setText('healthMonth', monthAppointments.length);
  setText('healthLabTests', monthLabEntries.length);
  const margin = monthRevenue ? `${Math.round((monthProfit / monthRevenue) * 100)}%` : '\u2014';
  setText('healthMargin', margin);

  setText('summaryCount', `${monthAppointments.length} appointments \u00b7 ${monthLabEntries.length} lab tests`);
  setText('summaryMonthTitle', monthLabel);
  setText('ledgerMonthLabel', monthLabel);

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
        <div class="mini-meta">${doctor.pct}% cut \u00b7 ${doctor.count} appointment${doctor.count !== 1 ? 's' : ''}</div>
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
        <div class="mini-meta">${escHtml(entry.patientName || 'Unknown patient')} \u00b7 ${fmtDate(entry.date)} \u00b7 ${escHtml(entry.technicianName || 'Lab Technician')}</div>
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
          <div style="font-size:1.5rem;margin-bottom:8px;">\u{1F4B0}</div>
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
      <td class="td-cut-col">${entry.percentageCut}% \u2192 ${fmtCurrency(entry.doctorEarning)}</td>
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
          \u26A0\uFE0F ${escHtml(msg || 'Failed to load earnings data. Please refresh.')}
        </td>
      </tr>`;
  }

  [
    'kpiTotalRevenue', 'kpiMonthRevenue', 'kpiTotalCuts', 'kpiLabRevenue', 'kpiMonthProfit',
    'allTimeRevenue', 'allTimeCuts', 'allTimeLabRevenue', 'allTimeProfit',
    'heroBadgeValue', 'barRevenueVal', 'barCutsVal', 'barProfitVal',
    'healthTotal', 'healthMonth', 'healthLabTests', 'healthMargin',
    'summaryCount', 'ledgerCount', 'labCount', 'kpiMonthLabel', 'ledgerMonthLabel', 'summaryMonthTitle',
  ].forEach((id) => setText(id, '\u2014'));

  const badgeLabel = document.querySelector('#heroBadge .rbd-label');
  if (badgeLabel) badgeLabel.textContent = 'Current Month';
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
