/* ============================================================
   test-requests.js — Lab Technician Test Requests
   ============================================================ */

const API_BASE = 'http://localhost:3000';

let allRequests = [];
let filteredRequests = [];
let currentStatusFilter = 'all';
let currentSearchQuery = '';
let selectedRequest = null;
let requestToRejectId = null;

(async () => {
  await loadComponents('test-requests', 'Test Requests');

  const user = getAuthenticatedLabTech();
  if (!user) return;

  setupEventListeners(user);
  await loadRequests(user.id);

  // Auto-open request from URL query parameter ?id=...
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get('id');
  if (targetId) {
    await openRequestDetails(targetId, user.id);
  }
})();

function setupEventListeners(user) {
  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }

  // Filter pills
  const filterButtons = document.querySelectorAll('#statusFilterGroup .filter-btn');
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatusFilter = btn.dataset.status;
      applyFilters();
    });
  });

  // Details Modal close buttons
  const modal = document.getElementById('requestDetailModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  const dismissBtn = document.getElementById('modalDismissBtn');

  if (closeBtn) closeBtn.addEventListener('click', () => closeModal());
  if (dismissBtn) dismissBtn.addEventListener('click', () => closeModal());
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Reject Modal controls
  const rejectModal = document.getElementById('rejectModal');
  const rejectCloseBtn = document.getElementById('rejectCloseBtn');
  const rejectCancelBtn = document.getElementById('rejectCancelBtn');
  const rejectConfirmBtn = document.getElementById('rejectConfirmBtn');
  const btnRejectModalTrigger = document.getElementById('btnRejectModalTrigger');

  if (rejectCloseBtn) rejectCloseBtn.addEventListener('click', closeRejectModal);
  if (rejectCancelBtn) rejectCancelBtn.addEventListener('click', closeRejectModal);
  if (rejectModal) {
    rejectModal.addEventListener('click', (e) => {
      if (e.target === rejectModal) closeRejectModal();
    });
  }
  if (btnRejectModalTrigger) {
    btnRejectModalTrigger.addEventListener('click', () => {
      if (selectedRequest) {
        openRejectModal(selectedRequest.id);
      }
    });
  }
  if (rejectConfirmBtn) {
    rejectConfirmBtn.addEventListener('click', () => handleConfirmReject(user.id));
  }

  // Accept Test Action
  const btnAccept = document.getElementById('btnAcceptTest');
  if (btnAccept) {
    btnAccept.addEventListener('click', () => {
      if (selectedRequest) handleAcceptTest(selectedRequest.id, user.id);
    });
  }
}

async function loadRequests(technicianId) {
  const tbody = document.getElementById('requestsTableBody');
  try {
    const response = await fetch(`${API_BASE}/lab-requests`, {
      method: 'GET',
      headers: {
        role: 'labtech',
        'x-user-id': technicianId,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Failed to load test requests');
    }

    allRequests = await response.json();
    applyFilters();
  } catch (error) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;color:var(--red);padding:32px;">
            ${escapeHtml(error.message || 'Unable to load test requests from server.')}
          </td>
        </tr>`;
    }
    showToast(error.message || 'Unable to load test requests', 'error');
  }
}

function applyFilters() {
  filteredRequests = allRequests.filter((req) => {
    // Status filter
    if (currentStatusFilter !== 'all') {
      if (currentStatusFilter === 'in_progress') {
        if (req.status !== 'in_progress' && req.status !== 'draft_report' && req.status !== 'accepted') return false;
      } else if (req.status !== currentStatusFilter) {
        return false;
      }
    }

    // Search query filter
    if (currentSearchQuery) {
      const matchText = `${req.id} ${req.patientName} ${req.patientId} ${req.testName} ${req.doctorName} ${req.appointmentId}`.toLowerCase();
      if (!matchText.includes(currentSearchQuery)) return false;
    }

    return true;
  });

  filteredRequests.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.requestDate || 0).getTime();
    const timeB = new Date(b.createdAt || b.requestDate || 0).getTime();
    return timeB - timeA;
  });

  const countBadge = document.getElementById('requestCountBadge');
  if (countBadge) {
    countBadge.textContent = `${filteredRequests.length} request${filteredRequests.length !== 1 ? 's' : ''}`;
  }

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('requestsTableBody');
  if (!tbody) return;

  if (!filteredRequests.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-text">No test requests match the current filters.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  const user = getAuthenticatedLabTech();
  const technicianId = user?.id || '';

  tbody.innerHTML = '';
  filteredRequests.forEach((req) => {
    const tr = document.createElement('tr');
    const badgeClass = getStatusBadgeClass(req.status);
    const statusLabel = formatStatusLabel(req.status);

    let actionButtonsHtml = '';
    if (req.status === 'pending') {
      actionButtonsHtml = `
        <button type="button" class="btn btn-primary btn-sm btn-action-accept" data-req-id="${escapeHtml(req.id)}" style="margin-right:4px;">
          Accept
        </button>
        <button type="button" class="btn btn-outline btn-sm btn-action-reject" data-req-id="${escapeHtml(req.id)}" style="margin-right:4px;color:var(--red);border-color:var(--red);">
          Reject
        </button>
        <button type="button" class="btn btn-outline btn-sm btn-view-detail" data-req-id="${escapeHtml(req.id)}">
          Details
        </button>
      `;
    } else {
      actionButtonsHtml = `
        <button type="button" class="btn btn-outline btn-sm btn-view-detail" data-req-id="${escapeHtml(req.id)}">
          View Details
        </button>
      `;
    }

    tr.innerHTML = `
      <td>
        <div style="font-weight:600;color:var(--text);">${escapeHtml(req.patientName || req.patientId)}</div>
        <div style="font-size:.78rem;color:var(--text-muted);">${escapeHtml(req.patientId)}</div>
      </td>
      <td>
        <strong style="color:var(--accent);">${escapeHtml(req.testName)}</strong>
      </td>
      <td>
        <div style="font-weight:500;">Dr. ${escapeHtml(req.doctorName)}</div>
        <div style="font-size:.78rem;color:var(--text-muted);">${escapeHtml(req.doctorId)}</div>
      </td>
      <td>
        <span style="font-family:monospace;font-size:.82rem;color:var(--text-muted);">${escapeHtml(req.appointmentId || '—')}</span>
      </td>
      <td>
        <div style="white-space:nowrap;font-size:.84rem;"><strong>Rec:</strong> ${escapeHtml(req.recommendationDate || req.requestDate)}</div>
        ${req.labTestDate && req.labTestDate !== (req.recommendationDate || req.requestDate) ? `<div style="font-size:.78rem;color:var(--accent);margin-top:2px;"><strong>Lab Date:</strong> ${escapeHtml(req.labTestDate)}</div>` : ''}
      </td>
      <td>
        <span class="badge ${badgeClass}">${statusLabel}</span>
      </td>
      <td style="text-align:right;white-space:nowrap;">
        ${actionButtonsHtml}
      </td>
    `;

    const btnAccept = tr.querySelector('.btn-action-accept');
    if (btnAccept) {
      btnAccept.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAcceptTest(req.id, technicianId);
      });
    }

    const btnReject = tr.querySelector('.btn-action-reject');
    if (btnReject) {
      btnReject.addEventListener('click', (e) => {
        e.stopPropagation();
        openRejectModal(req.id);
      });
    }

    const btnDetail = tr.querySelector('.btn-view-detail');
    if (btnDetail) {
      btnDetail.addEventListener('click', () => {
        openRequestDetails(req.id, technicianId);
      });
    }

    tbody.appendChild(tr);
  });
}

async function openRequestDetails(requestId, technicianId) {
  const modal = document.getElementById('requestDetailModal');
  const modalBody = document.getElementById('modalBody');
  const btnAccept = document.getElementById('btnAcceptTest');
  const btnReject = document.getElementById('btnRejectModalTrigger');

  if (!modal || !modalBody) return;

  modalBody.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:24px;">Loading request details...</p>';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  try {
    const response = await fetch(`${API_BASE}/lab-requests/${encodeURIComponent(requestId)}`, {
      method: 'GET',
      headers: {
        role: 'labtech',
        'x-user-id': technicianId,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Could not load request details');
    }

    selectedRequest = await response.json();
    renderModalContent(selectedRequest);

    const btnProcess = document.getElementById('btnProcessTest');
    const btnViewReport = document.getElementById('btnViewReport');

    // Button visibility based on current status
    if (btnAccept) btnAccept.style.display = selectedRequest.status === 'pending' ? 'inline-flex' : 'none';
    if (btnReject) btnReject.style.display = (selectedRequest.status === 'pending' || selectedRequest.status === 'in_progress' || selectedRequest.status === 'accepted') ? 'inline-flex' : 'none';

    if (btnProcess) {
      if (selectedRequest.status === 'in_progress' || selectedRequest.status === 'draft_report' || selectedRequest.status === 'accepted') {
        btnProcess.style.display = 'inline-flex';
        btnProcess.textContent = 'Report Test in Lab Reports';
        btnProcess.href = `lab-reports.html?reqId=${encodeURIComponent(selectedRequest.id)}`;
      } else {
        btnProcess.style.display = 'none';
      }
    }

    if (btnViewReport) {
      if (selectedRequest.status === 'completed' && selectedRequest.reportId) {
        btnViewReport.style.display = 'inline-flex';
        btnViewReport.href = `lab-reports.html?id=${encodeURIComponent(selectedRequest.reportId)}`;
      } else {
        btnViewReport.style.display = 'none';
      }
    }
  } catch (error) {
    modalBody.innerHTML = `
      <div style="padding:24px;text-align:center;color:var(--red);">
        <p><strong>Error:</strong> ${escapeHtml(error.message)}</p>
      </div>`;
  }
}

function renderModalContent(req) {
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;

  const badgeClass = getStatusBadgeClass(req.status);
  const statusLabel = formatStatusLabel(req.status);

  modalBody.innerHTML = `
    <div class="req-detail-grid">
      <div class="req-detail-item">
        <span class="req-detail-label">Request ID</span>
        <span class="req-detail-value" style="font-family:monospace;">${escapeHtml(req.id)}</span>
      </div>
      <div class="req-detail-item">
        <span class="req-detail-label">Current Status</span>
        <span class="req-detail-value"><span class="badge ${badgeClass}">${statusLabel}</span></span>
      </div>
      <div class="req-detail-item">
        <span class="req-detail-label">Patient Name</span>
        <span class="req-detail-value">${escapeHtml(req.patientName || req.patientId)}</span>
      </div>
      <div class="req-detail-item">
        <span class="req-detail-label">Patient ID</span>
        <span class="req-detail-value" style="font-family:monospace;">${escapeHtml(req.patientId)}</span>
      </div>
      <div class="req-detail-item">
        <span class="req-detail-label">Prescribing Doctor</span>
        <span class="req-detail-value">Dr. ${escapeHtml(req.doctorName)} (${escapeHtml(req.doctorId)})</span>
      </div>
      <div class="req-detail-item">
        <span class="req-detail-label">Appointment ID</span>
        <span class="req-detail-value" style="font-family:monospace;">${escapeHtml(req.appointmentId || '—')}</span>
      </div>
      <div class="req-detail-item">
        <span class="req-detail-label">Requested Test</span>
        <span class="req-detail-value" style="color:var(--accent);font-weight:700;">${escapeHtml(req.testName)}</span>
      </div>
      <div class="req-detail-item">
        <span class="req-detail-label">Doctor Recommendation Date</span>
        <span class="req-detail-value">${escapeHtml(req.recommendationDate || req.requestDate)}</span>
      </div>
      <div class="req-detail-item">
        <span class="req-detail-label">Scheduled Lab Test Date</span>
        <span class="req-detail-value" style="color:var(--accent);font-weight:600;">${escapeHtml(req.labTestDate || req.recommendationDate || req.requestDate)}</span>
      </div>
      <div class="req-detail-item full-width">
        <span class="req-detail-label">Doctor Consultation Notes</span>
        <span class="req-detail-value" style="font-weight:400;white-space:pre-wrap;">${escapeHtml(req.consultationNote || 'No notes provided.')}</span>
      </div>
      <div class="req-detail-item full-width">
        <span class="req-detail-label">Prescribed Medicines</span>
        <span class="req-detail-value" style="font-weight:400;white-space:pre-wrap;">${escapeHtml(req.prescriptionMedicines || 'None prescribed.')}</span>
      </div>
      ${
        req.status === 'rejected'
          ? `<div class="req-detail-item full-width" style="background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;padding:10px 14px;">
              <span class="req-detail-label" style="color:#991b1b;">Rejection Reason</span>
              <span class="req-detail-value" style="color:#7f1d1d;font-weight:500;">${escapeHtml(req.rejectionReason || 'Declined by lab technician')} (${req.rejectedAt ? new Date(req.rejectedAt).toLocaleString() : ''})</span>
            </div>`
          : ''
      }
    </div>
  `;
}

function closeModal() {
  const modal = document.getElementById('requestDetailModal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function openRejectModal(requestId) {
  requestToRejectId = requestId;
  const rejectModal = document.getElementById('rejectModal');
  const reasonInput = document.getElementById('rejectReasonInput');
  if (reasonInput) reasonInput.value = '';
  if (rejectModal) {
    rejectModal.classList.add('open');
    rejectModal.setAttribute('aria-hidden', 'false');
  }
}

function closeRejectModal() {
  requestToRejectId = null;
  const rejectModal = document.getElementById('rejectModal');
  if (rejectModal) {
    rejectModal.classList.remove('open');
    rejectModal.setAttribute('aria-hidden', 'true');
  }
}

async function handleConfirmReject(technicianId) {
  if (!requestToRejectId) return;

  const reasonInput = document.getElementById('rejectReasonInput');
  const reason = reasonInput?.value?.trim() || 'Declined by lab technician';
  const confirmBtn = document.getElementById('rejectConfirmBtn');
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/lab-requests/${encodeURIComponent(requestToRejectId)}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        role: 'labtech',
        'x-user-id': technicianId,
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Failed to reject test request');
    }

    showToast('Test request rejected.', 'info');
    closeRejectModal();
    closeModal();
    await loadRequests(technicianId);
  } catch (error) {
    showToast(error.message || 'Error rejecting request', 'error');
  } finally {
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

async function handleAcceptTest(requestId, technicianId) {
  const btnAccept = document.getElementById('btnAcceptTest');
  if (btnAccept) btnAccept.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/lab-requests/${encodeURIComponent(requestId)}/accept`, {
      method: 'PATCH',
      headers: {
        role: 'labtech',
        'x-user-id': technicianId,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Failed to accept test request');
    }

    showToast('Test request accepted and marked In Progress! Ready for reporting in Lab Reports.', 'success');
    closeModal();
    await loadRequests(technicianId);
  } catch (error) {
    showToast(error.message || 'Error accepting test request', 'error');
  } finally {
    if (btnAccept) btnAccept.disabled = false;
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'pending': return 'badge-pending';
    case 'accepted':
    case 'in_progress':
    case 'draft_report': return 'badge-in-progress';
    case 'completed': return 'badge-completed';
    case 'rejected': return 'badge-danger';
    default: return 'badge-pending';
  }
}

function formatStatusLabel(status) {
  switch (status) {
    case 'pending': return 'Pending';
    case 'accepted':
    case 'in_progress':
    case 'draft_report': return 'In Progress';
    case 'completed': return 'Completed';
    case 'rejected': return 'Rejected';
    default: return status || 'Unknown';
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
