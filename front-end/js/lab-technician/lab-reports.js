/* ============================================================
   lab-reports.js — Lab Technician Lab Reports & Reporting
   ============================================================ */

const API_BASE = 'http://localhost:3000';

let allRequests = [];
let allReports = [];
let currentTab = 'to_report';
let currentSearchQuery = '';
let selectedRequestForReporting = null;
let currentAttachedFile = null;

(async () => {
  await loadComponents('lab-reports', 'Lab Reports');

  const user = getAuthenticatedLabTech();
  if (!user) return;

  setupEventListeners(user);
  await loadAllData(user.id);

  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const reqId = urlParams.get('reqId');
  const reportId = urlParams.get('id');

  if (reqId) {
    const targetReq = allRequests.find((r) => r.id === reqId);
    if (targetReq) {
      await openSendReportModal(targetReq, user.id);
    }
  } else if (reportId) {
    await openReportPreview(reportId, user.id);
  }
})();

function setupEventListeners(user) {
  // Search input
  const searchInput = document.getElementById('searchReportInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }

  // Filter tabs
  const filterButtons = document.querySelectorAll('#reportStatusFilterGroup .filter-btn');
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      updateSectionTitle();
      applyFilters();
    });
  });

  // Preview Modal
  const previewModal = document.getElementById('reportPreviewModal');
  const previewCloseBtn = document.getElementById('previewModalCloseBtn');
  const previewDismissBtn = document.getElementById('previewDismissBtn');
  const printBtn = document.getElementById('btnPrintReport');

  if (previewCloseBtn) previewCloseBtn.addEventListener('click', closePreviewModal);
  if (previewDismissBtn) previewDismissBtn.addEventListener('click', closePreviewModal);
  if (printBtn) printBtn.addEventListener('click', () => window.print());
  if (previewModal) {
    previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) closePreviewModal();
    });
  }

  // Send Report Modal
  const sendModal = document.getElementById('sendReportModal');
  const sendCloseBtn = document.getElementById('sendReportCloseBtn');
  const sendDismissBtn = document.getElementById('sendReportDismissBtn');
  const btnConfirmSend = document.getElementById('btnConfirmSendReport');
  const btnSaveDraft = document.getElementById('btnSaveDraftReport');

  if (sendCloseBtn) sendCloseBtn.addEventListener('click', closeSendReportModal);
  if (sendDismissBtn) sendDismissBtn.addEventListener('click', closeSendReportModal);
  if (sendModal) {
    sendModal.addEventListener('click', (e) => {
      if (e.target === sendModal) closeSendReportModal();
    });
  }

  if (btnConfirmSend) {
    btnConfirmSend.addEventListener('click', () => handleSendReport(user.id));
  }
  if (btnSaveDraft) {
    btnSaveDraft.addEventListener('click', () => handleSaveDraftReport(user.id));
  }

  // File Upload Handlers
  const fileDropzone = document.getElementById('fileDropzoneTrigger');
  const fileInput = document.getElementById('reportFileInput');

  if (fileDropzone && fileInput) {
    fileDropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelected);
  }
}

function updateSectionTitle() {
  const title = document.getElementById('reportsSectionTitle');
  if (!title) return;
  if (currentTab === 'to_report') {
    title.textContent = 'InProgress Lab Reports';
  } else if (currentTab === 'submitted') {
    title.textContent = 'Completed & Submitted Lab Reports';
  } else {
    title.textContent = 'All Laboratory Items';
  }
}

async function loadAllData(technicianId) {
  const tbody = document.getElementById('reportsTableBody');
  try {
    const [reqsRes, repsRes] = await Promise.all([
      fetch(`${API_BASE}/lab-requests`, {
        headers: { role: 'labtech', 'x-user-id': technicianId },
      }),
      fetch(`${API_BASE}/lab-reports`, {
        headers: { role: 'labtech', 'x-user-id': technicianId },
      }),
    ]);

    if (!reqsRes.ok || !repsRes.ok) {
      throw new Error('Failed to load lab reports data');
    }

    allRequests = await reqsRes.json();
    allReports = await repsRes.json();

    applyFilters();
  } catch (error) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;color:var(--red);padding:32px;">
            ${escapeHtml(error.message || 'Unable to load lab data.')}
          </td>
        </tr>`;
    }
    showToast(error.message || 'Error loading lab data', 'error');
  }
}

function applyFilters() {
  const tbody = document.getElementById('reportsTableBody');
  if (!tbody) return;

  let itemsToRender = [];

  if (currentTab === 'to_report') {
    // Requests that are in_progress or draft_report (or accepted for backwards compat)
    itemsToRender = allRequests
      .filter((r) => r.status === 'in_progress' || r.status === 'draft_report' || r.status === 'accepted')
      .map((r) => ({ type: 'request', data: r }));
  } else if (currentTab === 'submitted') {
    // Final submitted reports
    itemsToRender = allReports
      .filter((r) => r.status === 'submitted')
      .map((r) => ({ type: 'report', data: r }));
  } else {
    // All items in Lab Reports: only in-progress/draft requests and submitted reports
    const reqItems = allRequests
      .filter((r) => r.status === 'in_progress' || r.status === 'draft_report' || r.status === 'accepted')
      .map((r) => ({ type: 'request', data: r }));
    const repItems = allReports
      .filter((r) => r.status === 'submitted')
      .map((r) => ({ type: 'report', data: r }));
    itemsToRender = [...reqItems, ...repItems];
  }

  // Search Query filter
  if (currentSearchQuery) {
    itemsToRender = itemsToRender.filter((item) => {
      const d = item.data;
      const matchText = `${d.id} ${d.patientName} ${d.patientId} ${d.testName} ${d.doctorName} ${d.appointmentId} ${d.result || ''}`.toLowerCase();
      return matchText.includes(currentSearchQuery);
    });
  }

  const countBadge = document.getElementById('reportsCountBadge');
  if (countBadge) {
    countBadge.textContent = `${itemsToRender.length} item${itemsToRender.length !== 1 ? 's' : ''}`;
  }

  renderTable(itemsToRender);
}

function renderTable(items) {
  const tbody = document.getElementById('reportsTableBody');
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <div class="empty-state-text">No items found matching the selected criteria.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  const user = getAuthenticatedLabTech();
  const technicianId = user?.id || '';

  tbody.innerHTML = '';
  items.forEach((item) => {
    const tr = document.createElement('tr');

    if (item.type === 'request') {
      const req = item.data;
      let badgeHtml = '<span class="badge badge-in-progress">In Progress</span>';
      if (req.status === 'draft_report') {
        badgeHtml = '<span class="badge badge-in-progress">Draft Report</span>';
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
          <div style="font-weight:500;">${req.sourceType === 'patient_labtest' ? 'Booked from Patient Portal' : `Dr. ${escapeHtml(req.doctorName)}`}</div>
          <div style="font-size:.78rem;color:var(--text-muted);">${escapeHtml(req.doctorId)}</div>
          ${req.branchId ? `<div style="font-size:.72rem;color:var(--text-muted);">Branch: ${escapeHtml(req.branchName || req.branchId)}</div>` : ''}
        </td>
        <td>
          <span style="font-family:monospace;font-size:.82rem;color:var(--text-muted);">${escapeHtml(req.appointmentId || '—')}</span>
        </td>
        <td>
          <span style="white-space:nowrap;">${escapeHtml(req.requestDate)}</span>
        </td>
        <td>
          ${badgeHtml}
        </td>
        <td style="text-align:right;white-space:nowrap;">
          <button type="button" class="btn btn-primary btn-sm btn-action-send-report">
            Send Lab Report
          </button>
        </td>
      `;

      tr.querySelector('.btn-action-send-report').addEventListener('click', () => {
        openSendReportModal(req, technicianId);
      });
    } else {
      const report = item.data;
      const reportDate = report.submittedAt
        ? new Date(report.submittedAt).toLocaleDateString()
        : new Date(report.updatedAt).toLocaleDateString();

      tr.innerHTML = `
        <td>
          <div style="font-weight:600;color:var(--text);">${escapeHtml(report.patientName || report.patientId)}</div>
          <div style="font-size:.78rem;color:var(--text-muted);">${escapeHtml(report.patientId)}</div>
        </td>
        <td>
          <strong style="color:var(--accent);">${escapeHtml(report.testName)}</strong>
        </td>
        <td>
          <div style="font-weight:500;">${report.sourceType === 'patient_labtest' ? 'Booked from Patient Portal' : `Dr. ${escapeHtml(report.doctorName)}`}</div>
          <div style="font-size:.78rem;color:var(--text-muted);">${escapeHtml(report.doctorId)}</div>
          ${report.branchId ? `<div style="font-size:.72rem;color:var(--text-muted);">Branch: ${escapeHtml(report.branchName || report.branchId)}</div>` : ''}
        </td>
        <td>
          <span style="font-family:monospace;font-size:.82rem;color:var(--text-muted);">${escapeHtml(report.appointmentId || 'Direct')}</span>
        </td>
        <td>
          <span style="white-space:nowrap;">${escapeHtml(reportDate)}</span>
        </td>
        <td>
          <span class="badge badge-completed">Submitted Report</span>
        </td>
        <td style="text-align:right;white-space:nowrap;">
          <button type="button" class="btn btn-outline btn-sm btn-action-view-report">
            View / Print Report
          </button>
        </td>
      `;

      tr.querySelector('.btn-action-view-report').addEventListener('click', () => {
        openReportPreview(report.id, technicianId);
      });
    }

    tbody.appendChild(tr);
  });
}

// ----------------------------------------------------
// SEND LAB REPORT MODAL WORKFLOW
// ----------------------------------------------------

async function openSendReportModal(req, technicianId) {
  selectedRequestForReporting = req;
  currentAttachedFile = null;

  const modal = document.getElementById('sendReportModal');
  const summaryBox = document.getElementById('sendModalPatientSummary');
  const resultInput = document.getElementById('reportResultInput');
  const findingsInput = document.getElementById('reportFindingsInput');
  const remarksInput = document.getElementById('reportRemarksInput');
  const fileContainer = document.getElementById('attachedFileContainer');

  if (!modal || !summaryBox) return;

  // Render complete patient data in the summary box
  summaryBox.innerHTML = `
    <div class="ps-item">
      <span class="ps-label">Patient Name & ID</span>
      <span class="ps-value">${escapeHtml(req.patientName || req.patientId)} (${escapeHtml(req.patientId)})</span>
    </div>
    <div class="ps-item">
      <span class="ps-label">Prescribed By Doctor</span>
      <span class="ps-value">${req.sourceType === 'patient_labtest' ? 'Booked from Patient Portal' : `Dr. ${escapeHtml(req.doctorName)} (${escapeHtml(req.doctorId)})`}</span>
    </div>
    ${req.branchId ? `<div class="ps-item"><span class="ps-label">Branch</span><span class="ps-value">${escapeHtml(req.branchName || req.branchId)}</span></div>` : ''}
    <div class="ps-item">
      <span class="ps-label">Test Name</span>
      <span class="ps-value" style="color:var(--accent);">${escapeHtml(req.testName)}</span>
    </div>
    <div class="ps-item">
      <span class="ps-label">Appointment ID / Date</span>
      <span class="ps-value">${escapeHtml(req.appointmentId || 'Direct')} &middot; ${escapeHtml(req.requestDate)}</span>
    </div>
    <div class="ps-item" style="grid-column:span 2;">
      <span class="ps-label">Doctor Consultation Notes / Instructions</span>
      <span class="ps-value" style="font-weight:400;">${escapeHtml(req.consultationNote || 'None provided.')}</span>
    </div>
    <div class="ps-item" style="grid-column:span 2;">
      <span class="ps-label">Prescribed Medicines</span>
      <span class="ps-value" style="font-weight:400;">${escapeHtml(req.prescriptionMedicines || 'None prescribed.')}</span>
    </div>
  `;

  // Pre-load draft report if existing
  if (resultInput) resultInput.value = '';
  if (findingsInput) findingsInput.value = '';
  if (remarksInput) remarksInput.value = '';
  if (fileContainer) {
    fileContainer.innerHTML = '';
    fileContainer.style.display = 'none';
  }

  try {
    const draftRes = await fetch(`${API_BASE}/lab-requests/${encodeURIComponent(req.id)}/report`, {
      headers: { role: 'labtech', 'x-user-id': technicianId },
    });
    if (draftRes.ok) {
      const draft = await draftRes.json();
      if (draft) {
        if (resultInput) resultInput.value = draft.result || '';
        if (findingsInput) findingsInput.value = draft.findings || '';
        if (remarksInput) remarksInput.value = draft.remarks || '';
        if (draft.fileAttachment) {
          currentAttachedFile = draft.fileAttachment;
          renderAttachedFileChip();
        }
      }
    }
  } catch (_) {}

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeSendReportModal() {
  selectedRequestForReporting = null;
  currentAttachedFile = null;
  const modal = document.getElementById('sendReportModal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function handleFileSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    currentAttachedFile = {
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      fileData: reader.result,
    };
    renderAttachedFileChip();
    showToast(`Attached file: ${file.name}`, 'info');
  };
  reader.readAsDataURL(file);
}

function renderAttachedFileChip() {
  const container = document.getElementById('attachedFileContainer');
  if (!container || !currentAttachedFile) return;

  const sizeKb = Math.round((currentAttachedFile.fileSize || 0) / 1024);

  container.innerHTML = `
    <div class="attached-file-chip">
      <div style="display:flex;align-items:center;gap:8px;">
        <span>📎</span>
        <div>
          <strong>${escapeHtml(currentAttachedFile.fileName)}</strong>
          <span style="font-size:0.75rem;color:var(--text-muted);margin-left:4px;">(${sizeKb} KB)</span>
        </div>
      </div>
      <button type="button" class="btn btn-outline btn-sm" id="btnRemoveAttachedFile" style="padding:2px 8px;font-size:0.75rem;color:var(--red);border-color:var(--red);">
        Remove
      </button>
    </div>
  `;
  container.style.display = 'block';

  document.getElementById('btnRemoveAttachedFile')?.addEventListener('click', () => {
    currentAttachedFile = null;
    container.innerHTML = '';
    container.style.display = 'none';
    const input = document.getElementById('reportFileInput');
    if (input) input.value = '';
  });
}

async function handleSendReport(technicianId) {
  if (!selectedRequestForReporting) return;

  const result = document.getElementById('reportResultInput')?.value?.trim();
  const findings = document.getElementById('reportFindingsInput')?.value?.trim();
  const remarks = document.getElementById('reportRemarksInput')?.value?.trim();

  if (!result) {
    showToast('Please enter the Diagnostic Result & Measured Values before sending.', 'warning');
    document.getElementById('reportResultInput')?.focus();
    return;
  }

  const btnSend = document.getElementById('btnConfirmSendReport');
  if (btnSend) btnSend.disabled = true;

  try {
    const payload = {
      result,
      findings,
      remarks,
      fileAttachment: currentAttachedFile || undefined,
    };

    const response = await fetch(`${API_BASE}/lab-requests/${encodeURIComponent(selectedRequestForReporting.id)}/report/submit`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        role: 'labtech',
        'x-user-id': technicianId,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Failed to submit report');
    }

    showToast('Lab Report successfully sent to Patient and Doctor!', 'success');
    closeSendReportModal();
    await loadAllData(technicianId);
  } catch (error) {
    showToast(error.message || 'Error submitting report', 'error');
  } finally {
    if (btnSend) btnSend.disabled = false;
  }
}

async function handleSaveDraftReport(technicianId) {
  if (!selectedRequestForReporting) return;

  const result = document.getElementById('reportResultInput')?.value?.trim() || '';
  const findings = document.getElementById('reportFindingsInput')?.value?.trim() || '';
  const remarks = document.getElementById('reportRemarksInput')?.value?.trim() || '';

  const btnDraft = document.getElementById('btnSaveDraftReport');
  if (btnDraft) btnDraft.disabled = true;

  try {
    const payload = {
      result,
      findings,
      remarks,
      fileAttachment: currentAttachedFile || undefined,
    };

    const response = await fetch(`${API_BASE}/lab-requests/${encodeURIComponent(selectedRequestForReporting.id)}/report/draft`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        role: 'labtech',
        'x-user-id': technicianId,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Failed to save draft');
    }

    showToast('Report draft saved successfully.', 'info');
    closeSendReportModal();
    await loadAllData(technicianId);
  } catch (error) {
    showToast(error.message || 'Error saving draft', 'error');
  } finally {
    if (btnDraft) btnDraft.disabled = false;
  }
}

// ----------------------------------------------------
// REPORT PREVIEW & PRINT MODAL
// ----------------------------------------------------

async function openReportPreview(reportId, technicianId) {
  const modal = document.getElementById('reportPreviewModal');
  const body = document.getElementById('previewModalBody');
  if (!modal || !body) return;

  body.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:32px;">Loading report preview...</p>';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  try {
    let report = allReports.find((r) => r.id === reportId || r.labRequestId === reportId);
    if (!report) {
      const response = await fetch(`${API_BASE}/lab-reports/${encodeURIComponent(reportId)}`, {
        headers: { role: 'labtech', 'x-user-id': technicianId },
      });
      if (!response.ok) throw new Error('Could not load report details');
      report = await response.json();
    }

    const reportDateStr = report.submittedAt
      ? new Date(report.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';

    let attachmentHtml = '';
    if (report.fileAttachment && report.fileAttachment.fileData) {
      const fa = report.fileAttachment;
      const sizeKb = Math.round((fa.fileSize || 0) / 1024);
      attachmentHtml = `
        <div class="report-section" style="margin-top:16px;">
          <div class="report-section-title">Attached Detailed File / Document</div>
          <div style="display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:12px 16px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:1.4rem;">📄</span>
              <div>
                <div style="font-weight:600;color:var(--text);">${escapeHtml(fa.fileName)}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(fa.fileType || '')} ${sizeKb ? `&middot; ${sizeKb} KB` : ''}</div>
              </div>
            </div>
            <a href="${fa.fileData}" download="${escapeHtml(fa.fileName)}" class="btn btn-outline btn-sm" target="_blank" style="text-decoration:none;">
              Download File
            </a>
          </div>
        </div>
      `;
    }

    body.innerHTML = `
      <div>
        <div class="report-header-banner">
          <div class="report-brand">
            <span class="report-brand-logo">⚗</span>
            <div>
              <div class="report-brand-text">MEDBITS DIAGNOSTIC LABS</div>
              <div style="font-size:.78rem;color:var(--text-muted);">Clinical Pathology & Diagnostic Medicine</div>
            </div>
          </div>
          <div class="report-meta-box">
            <div><strong>Report ID:</strong> ${escapeHtml(report.id)}</div>
            <div><strong>Date:</strong> ${escapeHtml(reportDateStr)}</div>
            <div style="margin-top:4px;"><span class="badge badge-completed">Submitted Report</span></div>
          </div>
        </div>

        <div class="report-patient-meta">
          <div>
            <div class="rpm-row"><span class="rpm-label">Patient Name:</span><span class="rpm-val">${escapeHtml(report.patientName || report.patientId)}</span></div>
            <div class="rpm-row" style="margin-top:6px;"><span class="rpm-label">Patient ID:</span><span class="rpm-val" style="font-family:monospace;">${escapeHtml(report.patientId)}</span></div>
            <div class="rpm-row" style="margin-top:6px;"><span class="rpm-label">Appointment ID:</span><span class="rpm-val" style="font-family:monospace;">${escapeHtml(report.appointmentId || 'Direct')}</span></div>
          </div>
          <div>
            <div class="rpm-row"><span class="rpm-label">Prescribed By:</span><span class="rpm-val">${report.sourceType === 'patient_labtest' ? 'Booked from Patient Portal' : `Dr. ${escapeHtml(report.doctorName)}`}</span></div>
            <div class="rpm-row" style="margin-top:6px;"><span class="rpm-label">Doctor ID:</span><span class="rpm-val" style="font-family:monospace;">${escapeHtml(report.doctorId)}</span></div>
            <div class="rpm-row" style="margin-top:6px;"><span class="rpm-label">Test Name:</span><span class="rpm-val" style="color:var(--accent);">${escapeHtml(report.testName)}</span></div>
            ${report.branchId ? `<div class="rpm-row" style="margin-top:6px;"><span class="rpm-label">Branch:</span><span class="rpm-val">${escapeHtml(report.branchName || report.branchId)}</span></div>` : ''}
          </div>
        </div>

        <div class="report-section">
          <div class="report-section-title">Diagnostic Test Result & Measured Values</div>
          <div class="report-result-box" style="white-space:pre-wrap;">${escapeHtml(report.result || 'No results recorded.')}</div>
        </div>

        <div class="report-section">
          <div class="report-section-title">Clinical Findings & Observations</div>
          <div class="report-text-box" style="white-space:pre-wrap;">${escapeHtml(report.findings || 'No detailed findings noted.')}</div>
        </div>

        <div class="report-section">
          <div class="report-section-title">Remarks & Recommendations</div>
          <div class="report-text-box" style="white-space:pre-wrap;">${escapeHtml(report.remarks || 'No additional remarks.')}</div>
        </div>

        ${attachmentHtml}

        <div class="report-signoff">
          <div style="font-size:.78rem;color:var(--text-muted);">
            Official Electronic Medical Report archived in MEDBITS Diagnostic System.
          </div>
          <div class="signoff-box">
            <div class="signoff-title">Verified & Certified By</div>
            <div class="signoff-name">${escapeHtml(report.technicianName || 'Certified Lab Technician')}</div>
            <div style="font-size:.78rem;color:var(--text-muted);">Lab Technician ID: ${escapeHtml(report.technicianId)}</div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    body.innerHTML = `
      <div style="padding:24px;text-align:center;color:var(--red);">
        <p><strong>Error:</strong> ${escapeHtml(error.message)}</p>
      </div>`;
  }
}

function closePreviewModal() {
  const modal = document.getElementById('reportPreviewModal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
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
