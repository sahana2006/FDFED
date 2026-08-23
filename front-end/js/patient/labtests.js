/* MEDBITS - labtests.js */

const LABTESTS_API_BASE_URL = 'http://localhost:3000';

const LAB_TEST_ICONS = {
  'Full Body Check Up': '🧪',
  Diabetes: '🩸',
  'Blood Studies': '🔬',
  Heart: '🫀',
  Kidney: '🧫',
  Liver: '⚗️',
  Thyroid: '🦋',
  Vitamin: '🌿',
  "Women's Health": '🌸',
  'Senior Citizen': '🧓',
};

let labTests = [];
let cartBookings = [];
let bookingHistory = [];
let patientLabReports = [];
let patientLabRequests = [];
let activeLabCategory = 'Full Body Check Up';

function useTemplate(id) {
  return document.getElementById(id).content.cloneNode(true);
}

let labTestsRefreshTimer = null;

async function initializeLabTestsPage() {
  setupPatientReportModal();
  await Promise.all([
    loadLabTests(),
    loadLabCart(),
    loadLabHistory(),
    loadPatientLabReports(),
    loadPatientLabRequests(),
  ]);
  renderLabTests();
  startLabTestsRefresh();
}

function startLabTestsRefresh() {
  if (labTestsRefreshTimer) return;

  labTestsRefreshTimer = window.setInterval(async () => {
    if (document.hidden) return;
    try {
      await Promise.all([
        loadLabHistory(),
        loadPatientLabReports(),
        loadPatientLabRequests(),
      ]);
      renderLabOrders();
    } catch (_) {}
  }, 5000);

  window.addEventListener('focus', async () => {
    try {
      await Promise.all([
        loadLabHistory(),
        loadPatientLabReports(),
        loadPatientLabRequests(),
      ]);
      renderLabOrders();
    } catch (_) {}
  });
}

async function loadPatientLabReports() {
  const session = requireRole('patient');
  if (!session) return;
  const patientId = (session.userId || session.patientId || session.id || '').trim();

  try {
    const response = await fetch(`${LABTESTS_API_BASE_URL}/lab-reports/patient`, {
      headers: { role: 'patient', 'x-user-id': patientId },
    });
    if (response.ok) {
      patientLabReports = await response.json();
    } else {
      patientLabReports = [];
    }
  } catch (_) {
    patientLabReports = [];
  }
}

async function loadPatientLabRequests() {
  const session = requireRole('patient');
  if (!session) return;
  const patientId = (session.userId || session.patientId || session.id || '').trim();

  try {
    const response = await fetch(`${LABTESTS_API_BASE_URL}/lab-requests/patient`, {
      headers: { role: 'patient', 'x-user-id': patientId },
    });
    if (response.ok) {
      patientLabRequests = await response.json();
    } else {
      patientLabRequests = [];
    }
  } catch (_) {
    patientLabRequests = [];
  }
}

async function loadLabTests() {
  const response = await fetch(`${LABTESTS_API_BASE_URL}/labtests`, {
    headers: {
      role: 'patient',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load lab tests');
  }

  labTests = await response.json();
}

async function loadLabCart() {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(
    `${LABTESTS_API_BASE_URL}/labtests/cart/${encodeURIComponent(session.id)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load lab cart');
  }

  cartBookings = await response.json();
}

async function loadLabHistory() {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(
    `${LABTESTS_API_BASE_URL}/labtests/history/${encodeURIComponent(session.id)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load lab history');
  }

  bookingHistory = await response.json();
}

function renderLabTests() {
  renderLabCartSummary();
  renderLabCartItems();
  renderLabOrders();
  renderTopTests();

  if (activeLabCategory === 'All Tests') {
    showAllLab();
    return;
  }

  showLabCategory(activeLabCategory);
}

function showLabCategory(cat) {
  activeLabCategory = cat;
  const tests = labTests.filter((test) => test.category === cat);
  setText('labCategoryTitle', `${cat} (${tests.length})`);
  renderLabProducts(tests);
}

function showAllLab() {
  activeLabCategory = 'All Tests';
  setText('labCategoryTitle', `All Tests (${labTests.length})`);
  renderLabProducts(labTests);
}

function searchLabTests(q) {
  const query = q.trim().toLowerCase();
  if (!query) {
    showLabCategory('Full Body Check Up');
    return;
  }

  const results = labTests.filter((test) =>
    test.name.toLowerCase().includes(query),
  );
  setText('labCategoryTitle', `Results for "${q}"`);
  renderLabProducts(results);
}

function renderLabProducts(tests) {
  fillLabGrid(document.getElementById('labProductGrid'), tests);
}

function renderTopTests() {
  fillLabGrid(document.getElementById('topLabGrid'), labTests.slice(0, 4));
}

function fillLabGrid(grid, tests) {
  if (!grid) return;
  grid.innerHTML = '';

  if (!tests.length) {
    const msg = document.createElement('p');
    msg.className = 'text-muted';
    msg.textContent = 'No tests in this category.';
    grid.appendChild(msg);
    return;
  }

  tests.forEach((test) => {
    const frag = useTemplate('tpl-lab-card');
    const card = frag.querySelector('.product-card');
    const existingCartBooking = cartBookings.find(
      (booking) => booking.labTestId === test.id,
    );

    card.querySelector('.lab-icon').textContent =
      LAB_TEST_ICONS[test.category] || '🧪';
    card.querySelector('.lab-name').textContent = test.name;
    card.querySelector('.lab-desc').textContent = test.description;
    card.querySelector('.lab-price').textContent = `Rs ${test.price.toFixed(2)}`;

    const btn = card.querySelector('.lab-btn');
    btn.textContent = existingCartBooking ? 'Remove' : 'Add';
    btn.className = `${existingCartBooking ? 'btn btn-outline' : 'btn-add'} lab-btn`;
    btn.onclick = async function () {
      if (existingCartBooking) {
        await removeLabTestFromCart(existingCartBooking.id);
        return;
      }

      await addLabTestToCart(test.id);
    };

    grid.appendChild(frag);
  });
}

async function addLabTestToCart(labTestId) {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(`${LABTESTS_API_BASE_URL}/labtests/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      role: 'patient',
    },
    body: JSON.stringify({
      userId: session.id,
      labTestId,
    }),
  });

  if (!response.ok) {
    showToast('Unable to add lab test', 'error');
    return;
  }

  await loadLabCart();
  renderLabTests();
  showToast('Lab test added to cart', 'success');
}

async function removeLabTestFromCart(bookingId) {
  const response = await fetch(
    `${LABTESTS_API_BASE_URL}/labtests/cart/${encodeURIComponent(bookingId)}`,
    {
      method: 'DELETE',
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    showToast('Unable to remove lab test', 'error');
    return;
  }

  await loadLabCart();
  renderLabTests();
  showToast('Lab test removed from cart', 'info');
}

function renderLabCartSummary() {
  const bar = document.getElementById('labCartBar');
  const cartTotal = cartBookings.reduce(
    (sum, booking) => sum + booking.labTest.price,
    0,
  );

  if (!bar) return;

  bar.classList.toggle('hidden', cartBookings.length === 0);
  setText('labCartTotal', `Rs ${cartTotal.toFixed(2)}`);
  setText(
    'labCartCount',
    `(${cartBookings.length} item${cartBookings.length !== 1 ? 's' : ''})`,
  );
}

function showLabCart() {
  const cartSection = document.getElementById('labCartSection');
  if (!cartSection) return;

  cartSection.style.display = 'block';
  cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideLabCart() {
  const cartSection = document.getElementById('labCartSection');
  if (!cartSection) return;

  cartSection.style.display = 'none';
}

function renderLabCartItems() {
  const cartList = document.getElementById('labCartItemsList');
  const emptyState = document.getElementById('labCartEmptyState');
  const totalEl = document.getElementById('labCartSubtotal');
  const confirmBtn = document.getElementById('confirmLabBookingBtn');

  if (!cartList || !emptyState || !totalEl || !confirmBtn) return;

  cartList.innerHTML = '';

  if (!cartBookings.length) {
    emptyState.style.display = 'block';
    confirmBtn.disabled = true;
    setText('labCartSubtotal', 'Rs 0.00');
    return;
  }

  emptyState.style.display = 'none';
  confirmBtn.disabled = false;

  cartBookings.forEach((booking) => {
    const frag = useTemplate('tpl-lab-cart-row');
    const row = frag.querySelector('.cart-item');

    row.querySelector('.lab-cart-icon').textContent =
      LAB_TEST_ICONS[booking.labTest.category] || '🧪';
    row.querySelector('.lab-cart-name').textContent = booking.labTest.name;
    row.querySelector('.lab-cart-cat').textContent = booking.labTest.category;
    row.querySelector('.lab-cart-price').textContent = `Rs ${booking.labTest.price.toFixed(2)}`;
    row.querySelector('.lab-cart-remove').onclick = async function () {
      await removeLabTestFromCart(booking.id);
    };

    cartList.appendChild(frag);
  });

  const subtotal = cartBookings.reduce(
    (sum, booking) => sum + booking.labTest.price,
    0,
  );
  setText('labCartSubtotal', `Rs ${subtotal.toFixed(2)}`);
}

async function confirmLabBooking() {
  const session = requireRole('patient');
  if (!session || !cartBookings.length) return;

  const response = await fetch(
    `${LABTESTS_API_BASE_URL}/labtests/confirm/${encodeURIComponent(session.id)}`,
    {
      method: 'POST',
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    showToast('Unable to confirm lab booking', 'error');
    return;
  }

  await Promise.all([loadLabCart(), loadLabHistory()]);
  renderLabTests();
  hideLabCart();
  showToast('Lab tests booked!', 'success');
}

function renderLabOrders() {
  const el = document.getElementById('labOrderList');
  if (!el) return;
  el.innerHTML = '';

  const hasAnyItems =
    patientLabReports.length > 0 ||
    patientLabRequests.length > 0 ||
    bookingHistory.length > 0;

  if (!hasAnyItems) {
    const msg = document.createElement('p');
    msg.className = 'text-muted';
    msg.textContent = 'No lab tests or completed reports yet.';
    el.appendChild(msg);
    return;
  }

  // 1. Render official submitted Diagnostic Lab Reports sent by Lab Technician
  patientLabReports.forEach((report) => {
    const row = document.createElement('div');
    row.className = 'order-item';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.gap = '12px';
    row.style.padding = '14px 16px';
    row.style.marginBottom = '10px';
    row.style.border = '1px solid var(--border)';
    row.style.borderRadius = 'var(--radius-sm)';
    row.style.background = '#f8fafc';

    const matchingReq = patientLabRequests.find(
      (r) =>
        (report.labRequestId && r.id === report.labRequestId) ||
        (r.reportId && r.reportId === report.id),
    );

    const reportDate = report.submittedAt
      ? formatDate(report.submittedAt.split('T')[0])
      : (report.updatedAt ? formatDate(report.updatedAt.split('T')[0]) : '—');

    const recDate =
      matchingReq?.recommendationDate ||
      matchingReq?.requestDate ||
      (report.createdAt ? report.createdAt.split('T')[0] : '');

    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:1.6rem;background:var(--accent-light);width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;">🧪</div>
        <div>
          <div class="list-item-title" style="font-weight:700;color:var(--text);font-size:0.95rem;">${escapeHtml(report.testName)}</div>
          <div class="list-item-sub" style="font-size:.82rem;color:var(--text-muted);margin-top:2px;">
            <strong>Recommended by Doctor:</strong> Dr. ${escapeHtml(report.doctorName)}${recDate ? ` on <span style="font-weight:600;color:var(--navy);">${formatDate(recDate)}</span>` : ''} &middot; Verified by ${escapeHtml(report.technicianName || 'Lab Technician')} (${escapeHtml(reportDate)})
          </div>
          ${report.result ? `<div style="font-size:.82rem;color:#047857;margin-top:4px;font-weight:600;">Result: ${escapeHtml(report.result)}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <span class="badge badge-green" style="background:#ecfdf5;color:#065f46;border:1px solid rgba(16,185,129,0.3);font-size:.75rem;padding:3px 10px;border-radius:20px;">Submitted Report</span>
        <button class="btn btn-outline btn-sm btn-view-report" type="button" style="padding:6px 14px;font-size:.82rem;">View Report</button>
      </div>
    `;

    row.querySelector('.btn-view-report').addEventListener('click', () => {
      openPatientReportModal(report, matchingReq);
    });

    el.appendChild(row);
  });

  // 2. Render Doctor Lab Requests (Pending / In Progress / Rejected)
  patientLabRequests
    .filter(
      (req) =>
        req.status !== 'completed' ||
        !patientLabReports.some(
          (r) => r.id === req.reportId || r.labRequestId === req.id,
        ),
    )
    .forEach((req) => {
      const row = document.createElement('div');
      row.className = 'order-item';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.gap = '12px';
      row.style.padding = '14px 16px';
      row.style.marginBottom = '10px';
      row.style.border = '1px solid var(--border)';
      row.style.borderRadius = 'var(--radius-sm)';

      const recDateStr = formatDate(
        req.recommendationDate ||
          req.requestDate ||
          (req.createdAt ? req.createdAt.split('T')[0] : ''),
      );
      const labDateStr = req.labTestDate ? formatDate(req.labTestDate) : '';

      let badgeStyle = 'background:#fef3c7;color:#92400e;border:1px solid rgba(245,158,11,0.3);';
      let badgeText = 'Pending';
      if (
        req.status === 'in_progress' ||
        req.status === 'accepted' ||
        req.status === 'draft_report'
      ) {
        badgeStyle = 'background:#ede9fe;color:#5b21b6;border:1px solid rgba(139,92,246,0.3);';
        badgeText = 'In Progress';
      } else if (req.status === 'rejected') {
        badgeStyle = 'background:#fee2e2;color:#991b1b;border:1px solid rgba(239,68,68,0.3);';
        badgeText = 'Rejected';
      }

      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-size:1.6rem;background:#fef3c7;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;">🔬</div>
          <div>
            <div class="list-item-title" style="font-weight:700;color:var(--text);">${escapeHtml(req.testName)}</div>
            <div class="list-item-sub" style="font-size:.82rem;color:var(--text-muted);margin-top:2px;">
              <strong>Recommended by Doctor:</strong> Dr. ${escapeHtml(req.doctorName)} on <span style="font-weight:600;color:var(--navy);">${recDateStr}</span>
              ${labDateStr && labDateStr !== recDateStr ? ` &middot; <strong style="color:var(--accent);">Scheduled Lab Date: ${labDateStr}</strong>` : ''}
            </div>
            ${req.consultationNote ? `<div style="font-size:.8rem;color:var(--text-muted);margin-top:2px;">Instructions: ${escapeHtml(req.consultationNote)}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
          <span class="badge" style="${badgeStyle}font-size:.75rem;padding:3px 10px;border-radius:20px;">${badgeText}</span>
        </div>
      `;

      el.appendChild(row);
    });

  // 3. Render Online Booked Lab Tests
  if (bookingHistory.length) {
    const groupedBookings = groupLabBookingsByOrderId(bookingHistory);
    groupedBookings.forEach((group) => {
      const frag = useTemplate('tpl-lab-order-row');
      const row = frag.querySelector('.order-item');
      const primaryBooking = group.items[0];
      const testSummary = group.items.map((booking) => booking.labTest.name).join(', ');
      const totalPrice = group.items.reduce((sum, booking) => sum + booking.labTest.price, 0);

      row.querySelector('.lab-order-test').textContent = `Order #${group.orderId}`;
      row.querySelector('.lab-order-date').textContent =
        `${testSummary} | ${group.items.length} test${group.items.length !== 1 ? 's' : ''} | Rs ${totalPrice.toFixed(2)}`;
      row.querySelector('.lab-order-badge').textContent =
        primaryBooking.status === 'booked' ? 'Completed' : primaryBooking.status;

      el.appendChild(frag);
    });
  }
}

function setupPatientReportModal() {
  const closeBtn = document.getElementById('closePatientReportModal');
  const dismissBtn = document.getElementById('dismissPatientReportModal');
  const printBtn = document.getElementById('printPatientReportBtn');
  const modal = document.getElementById('patientReportModal');

  if (closeBtn) closeBtn.addEventListener('click', closePatientReportModal);
  if (dismissBtn) dismissBtn.addEventListener('click', closePatientReportModal);
  if (printBtn) printBtn.addEventListener('click', () => window.print());
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePatientReportModal();
    });
  }
}

function openPatientReportModal(report, matchingReq) {
  const modal = document.getElementById('patientReportModal');
  const body = document.getElementById('patientReportModalBody');
  if (!modal || !body) return;

  const req =
    matchingReq ||
    patientLabRequests.find(
      (r) =>
        (report.labRequestId && r.id === report.labRequestId) ||
        (r.reportId && r.reportId === report.id),
    );

  const reportDateStr = report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : '—';
  const recDateStr =
    req?.recommendationDate ||
    req?.requestDate ||
    (report.createdAt ? report.createdAt.split('T')[0] : '');

  body.innerHTML = `
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:18px;">
      <div>
        <div style="font-family:'Sora',sans-serif;font-weight:700;font-size:1.1rem;color:#0f2858;">MEDBITS DIAGNOSTIC REPORT</div>
        <div style="font-size:.8rem;color:#64748b;">Clinical Pathology Laboratory</div>
      </div>
      <div style="text-align:right;font-size:.8rem;color:#64748b;">
        <div><strong>Report ID:</strong> ${escapeHtml(report.id)}</div>
        <div><strong>Date:</strong> ${escapeHtml(reportDateStr)}</div>
        <span class="badge" style="background:#ecfdf5;color:#065f46;font-size:.75rem;padding:2px 10px;margin-top:4px;">Submitted</span>
      </div>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;font-size:.875rem;">
      <div>
        <div><span style="color:#64748b;">Patient:</span> <strong>${escapeHtml(report.patientName || report.patientId)}</strong></div>
        <div style="margin-top:4px;"><span style="color:#64748b;">Prescribed Doctor:</span> <strong>Dr. ${escapeHtml(report.doctorName)}</strong></div>
        ${recDateStr ? `<div style="margin-top:4px;"><span style="color:#64748b;">Doctor Recommended Date:</span> <strong>${formatDate(recDateStr)}</strong></div>` : ''}
      </div>
      <div>
        <div><span style="color:#64748b;">Test Name:</span> <strong style="color:var(--accent);">${escapeHtml(report.testName)}</strong></div>
        <div style="margin-top:4px;"><span style="color:#64748b;">Appointment ID:</span> <code>${escapeHtml(report.appointmentId || 'Direct')}</code></div>
        <div style="margin-top:4px;"><span style="color:#64748b;">Report Date:</span> <strong>${escapeHtml(reportDateStr)}</strong></div>
      </div>
    </div>

    <div style="margin-bottom:18px;">
      <div style="font-size:.8rem;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Diagnostic Result & Values</div>
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:14px 18px;font-size:.95rem;font-weight:600;color:#14532d;white-space:pre-wrap;">${escapeHtml(report.result || 'No results recorded.')}</div>
    </div>

    <div style="margin-bottom:18px;">
      <div style="font-size:.8rem;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Clinical Findings & Observations</div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;font-size:.875rem;color:#0f172a;line-height:1.5;white-space:pre-wrap;">${escapeHtml(report.findings || 'No detailed findings noted.')}</div>
    </div>

    <div style="margin-bottom:18px;">
      <div style="font-size:.8rem;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Remarks & Recommendations</div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;font-size:.875rem;color:#0f172a;line-height:1.5;white-space:pre-wrap;">${escapeHtml(report.remarks || 'No remarks provided.')}</div>
    </div>

    ${
      report.fileAttachment && report.fileAttachment.fileData
        ? `<div style="margin-bottom:18px;">
            <div style="font-size:.8rem;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Attached Detailed Report File</div>
            <div style="display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:1.3rem;">📄</span>
                <div>
                  <div style="font-weight:600;color:#0f172a;font-size:0.9rem;">${escapeHtml(report.fileAttachment.fileName)}</div>
                  <div style="font-size:0.75rem;color:#64748b;">${escapeHtml(report.fileAttachment.fileType || '')} ${report.fileAttachment.fileSize ? `&middot; ${Math.round(report.fileAttachment.fileSize / 1024)} KB` : ''}</div>
                </div>
              </div>
              <a href="${report.fileAttachment.fileData}" download="${escapeHtml(report.fileAttachment.fileName)}" class="btn btn-outline btn-sm" target="_blank" style="text-decoration:none;padding:4px 12px;font-size:.8rem;">
                Download File
              </a>
            </div>
          </div>`
        : ''
    }

    <div style="border-top:1px dashed #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;font-size:.8rem;color:#64748b;">
      <div>Electronic verification authentic</div>
      <div><strong>Certified by:</strong> ${escapeHtml(report.technicianName || report.technicianId)}</div>
    </div>
  `;

  modal.classList.add('open');
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
}

function closePatientReportModal() {
  const modal = document.getElementById('patientReportModal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function groupLabBookingsByOrderId(items) {
  const groups = new Map();

  items.forEach((item) => {
    const orderId = item.orderId || item.id;
    const existingGroup = groups.get(orderId);
    if (existingGroup) {
      existingGroup.items.push(item);
      return;
    }

    groups.set(orderId, {
      orderId,
      items: [item],
    });
  });

  return Array.from(groups.values());
}
