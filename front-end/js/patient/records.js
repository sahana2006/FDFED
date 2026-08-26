const MEDICAL_RECORDS_API_BASE_URL = 'http://localhost:3000';

let medicalRecords = [];
let patientLabReports = [];
let patientLabRequests = [];
let medicalRecordsRefreshTimer = null;

function useTemplate(id) {
  return document.getElementById(id).content.cloneNode(true);
}

async function initializeMedicalRecordsPage() {
  const session = requireRole('patient');
  if (!session) return;

  const patientId = (session.userId || session.patientId || session.id || '').trim();
  setupPatientReportModal();
  setupPatientRequestDetailModal();
  await refreshAllPatientData(patientId);
  startMedicalRecordsRefresh();
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

function setupPatientRequestDetailModal() {
  const closeBtn = document.getElementById('closePatientRequestDetailModal');
  const dismissBtn = document.getElementById('dismissPatientRequestDetailModal');
  const modal = document.getElementById('patientRequestDetailModal');

  if (closeBtn) closeBtn.addEventListener('click', closePatientRequestDetailModal);
  if (dismissBtn) dismissBtn.addEventListener('click', closePatientRequestDetailModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePatientRequestDetailModal();
    });
  }
}

async function refreshAllPatientData(patientId) {
  await Promise.all([
    fetchMedicalRecords(patientId),
    fetchPatientLabReports(patientId),
    fetchPatientLabRequests(patientId),
  ]);
  renderMedicalRecords();
}

async function fetchMedicalRecords(patientId) {
  const response = await fetch(
    `${MEDICAL_RECORDS_API_BASE_URL}/medical-records/${encodeURIComponent(patientId)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load medical records');
  }

  medicalRecords = await response.json();
}

async function fetchPatientLabReports(patientId) {
  try {
    const response = await fetch(
      `${MEDICAL_RECORDS_API_BASE_URL}/lab-reports/patient`,
      {
        headers: {
          role: 'patient',
          'x-user-id': patientId,
        },
      },
    );

    if (response.ok) {
      patientLabReports = await response.json();
    } else {
      patientLabReports = [];
    }
  } catch (_) {
    patientLabReports = [];
  }
}

async function fetchPatientLabRequests(patientId) {
  try {
    const response = await fetch(
      `${MEDICAL_RECORDS_API_BASE_URL}/lab-requests/patient`,
      {
        headers: {
          role: 'patient',
          'x-user-id': patientId,
        },
      },
    );

    if (response.ok) {
      patientLabRequests = await response.json();
    } else {
      patientLabRequests = [];
    }
  } catch (_) {
    patientLabRequests = [];
  }
}

function startMedicalRecordsRefresh() {
  if (medicalRecordsRefreshTimer) return;

  medicalRecordsRefreshTimer = window.setInterval(async () => {
    if (document.hidden) return;
    try {
      const session = requireRole('patient');
      const patientId = (session?.userId || session?.patientId || session?.id || '').trim();
      if (patientId) await refreshAllPatientData(patientId);
    } catch (_) {}
  }, 5000);

  window.addEventListener('focus', async () => {
    try {
      const session = requireRole('patient');
      const patientId = (session?.userId || session?.patientId || session?.id || '').trim();
      if (patientId) await refreshAllPatientData(patientId);
    } catch (_) {}
  });
}

function renderMedicalRecords() {
  const consultations = medicalRecords.filter((record) => record.type === 'consultation');
  const treatments = medicalRecords.filter((record) => record.type === 'treatment');
  const legacyLabs = medicalRecords.filter((record) => record.type === 'lab');

  const totalCount = medicalRecords.length + patientLabReports.length + patientLabRequests.length;
  const labCount = legacyLabs.length + patientLabReports.length + patientLabRequests.length;

  setText('stat-total', totalCount);
  setText('stat-consults', consultations.length);
  setText('stat-labs', labCount);

  renderRecordGroup('consultationSection', 'consultationList', consultations);
  renderRecordGroup('treatmentSection', 'treatmentList', treatments);
  renderLabRequestsSection(patientLabRequests);
  renderLabSection(legacyLabs, patientLabReports);

  const emptyState = document.getElementById('recordsEmptyState');
  if (emptyState) {
    emptyState.style.display = totalCount ? 'none' : 'block';
  }
}

function renderRecordGroup(sectionId, listId, records) {
  const section = document.getElementById(sectionId);
  const list = document.getElementById(listId);
  if (!section || !list) return;

  list.innerHTML = '';
  section.style.display = records.length ? 'block' : 'none';

  records.forEach((record) => {
    list.appendChild(buildRecordCard(record));
  });
}

function renderLabRequestsSection(requests) {
  const section = document.getElementById('labRequestsSection');
  const list = document.getElementById('labRequestsList');
  if (!section || !list) return;

  list.innerHTML = '';
  section.style.display = requests.length ? 'block' : 'none';

  requests.forEach((req) => {
    list.appendChild(buildLabRequestCard(req));
  });
}

function buildLabRequestCard(req) {
  const card = document.createElement('div');
  card.className = 'rec-card';
  card.id = `labreq-${req.id}`;

  const requestDate = req.requestDate ? formatDate(req.requestDate) : '—';

  let badgeStyle = 'background:#fef3c7;color:#92400e;border:1px solid rgba(245,158,11,0.3);';
  let badgeLabel = 'Pending';
  if (req.status === 'accepted') {
    badgeStyle = 'background:#e0f2fe;color:#075985;border:1px solid rgba(2,132,199,0.3);';
    badgeLabel = 'Accepted';
  } else if (req.status === 'in_progress' || req.status === 'draft_report') {
    badgeStyle = 'background:#ede9fe;color:#5b21b6;border:1px solid rgba(139,92,246,0.3);';
    badgeLabel = 'In Progress';
  } else if (req.status === 'completed') {
    badgeStyle = 'background:#ecfdf5;color:#065f46;border:1px solid rgba(16,185,129,0.3);';
    badgeLabel = 'Completed';
  } else if (req.status === 'rejected') {
    badgeStyle = 'background:#fee2e2;color:#991b1b;border:1px solid rgba(239,68,68,0.3);';
    badgeLabel = 'Rejected';
  }

  const matchingReport = patientLabReports.find(
    (r) => (req.reportId && r.id === req.reportId) || r.labRequestId === req.id,
  );

  card.innerHTML = `
    <div style="flex:1;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="rec-title" style="color:var(--accent);font-weight:700;">${escapeHtml(req.testName)}</div>
          <span class="badge" style="${badgeStyle}font-size:.75rem;padding:2px 8px;border-radius:4px;">${escapeHtml(badgeLabel)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="btn btn-outline btn-sm btn-view-request-details" type="button" style="padding:4px 12px;font-size:.8rem;">Details</button>
          ${
            req.status === 'completed' && matchingReport
              ? `<button class="btn btn-primary btn-sm btn-view-request-report" type="button" style="padding:4px 12px;font-size:.8rem;">View Report</button>`
              : ''
          }
        </div>
      </div>
      <div class="rec-meta rec-meta-doc">
        Recommended by Dr. ${escapeHtml(req.doctorName)} on ${formatDate(req.recommendationDate || req.requestDate)}${req.labTestDate && req.labTestDate !== (req.recommendationDate || req.requestDate) ? ` &middot; <span style="color:var(--accent);font-weight:600;">Scheduled Lab Date: ${formatDate(req.labTestDate)}</span>` : ''} &middot; Appt: <code>${escapeHtml(req.appointmentId || 'Direct')}</code>
      </div>
      ${
        req.consultationNote
          ? `<div class="rec-notes rec-primary-text" style="margin-top:6px;font-size:.84rem;">
              <strong>Doctor Notes:</strong> ${escapeHtml(req.consultationNote)}
            </div>`
          : ''
      }
    </div>
  `;

  card.querySelector('.btn-view-request-details').addEventListener('click', () => {
    openPatientRequestDetailModal(req, matchingReport);
  });

  const reportBtn = card.querySelector('.btn-view-request-report');
  if (reportBtn && matchingReport) {
    reportBtn.addEventListener('click', () => {
      openPatientReportModal(matchingReport);
    });
  }

  return card;
}

function openPatientRequestDetailModal(req, matchingReport) {
  const modal = document.getElementById('patientRequestDetailModal');
  const body = document.getElementById('patientRequestDetailModalBody');
  const btnReport = document.getElementById('btnModalViewReportFromRequest');
  if (!modal || !body) return;

  let badgeStyle = 'background:#fef3c7;color:#92400e;border:1px solid rgba(245,158,11,0.3);';
  let badgeLabel = 'Pending';
  if (req.status === 'accepted') {
    badgeStyle = 'background:#e0f2fe;color:#075985;border:1px solid rgba(2,132,199,0.3);';
    badgeLabel = 'Accepted';
  } else if (req.status === 'in_progress' || req.status === 'draft_report') {
    badgeStyle = 'background:#ede9fe;color:#5b21b6;border:1px solid rgba(139,92,246,0.3);';
    badgeLabel = 'In Progress';
  } else if (req.status === 'completed') {
    badgeStyle = 'background:#ecfdf5;color:#065f46;border:1px solid rgba(16,185,129,0.3);';
    badgeLabel = 'Completed';
  } else if (req.status === 'rejected') {
    badgeStyle = 'background:#fee2e2;color:#991b1b;border:1px solid rgba(239,68,68,0.3);';
    badgeLabel = 'Rejected';
  }

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:16px;font-size:.875rem;">
      <div>
        <div><span style="color:#64748b;">Test Name:</span> <strong style="color:var(--accent);">${escapeHtml(req.testName)}</strong></div>
        <div style="margin-top:4px;"><span style="color:#64748b;">Prescribed By:</span> <strong>Dr. ${escapeHtml(req.doctorName)}</strong> (${escapeHtml(req.doctorId)})</div>
        <div style="margin-top:4px;"><span style="color:#64748b;">Recommendation Date:</span> <span>${formatDate(req.recommendationDate || req.requestDate)}</span></div>
        <div style="margin-top:4px;"><span style="color:#64748b;">Scheduled Lab Test Date:</span> <strong style="color:var(--accent);">${formatDate(req.labTestDate || req.recommendationDate || req.requestDate)}</strong></div>
      </div>
      <div>
        <div><span style="color:#64748b;">Status:</span> <span class="badge" style="${badgeStyle}font-size:.75rem;padding:2px 8px;border-radius:4px;">${escapeHtml(badgeLabel)}</span></div>
        <div style="margin-top:4px;"><span style="color:#64748b;">Request ID:</span> <code>${escapeHtml(req.id)}</code></div>
        <div style="margin-top:4px;"><span style="color:#64748b;">Appointment ID:</span> <code>${escapeHtml(req.appointmentId || 'Direct')}</code></div>
      </div>
    </div>

    ${
      req.consultationNote
        ? `<div style="margin-bottom:14px;">
            <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:4px;">Doctor's Consultation Instructions</div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:.85rem;color:#0f172a;line-height:1.5;white-space:pre-wrap;">${escapeHtml(req.consultationNote)}</div>
          </div>`
        : ''
    }

    ${
      req.prescriptionMedicines
        ? `<div style="margin-bottom:14px;">
            <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:4px;">Prescribed Medicines</div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:.85rem;color:#0f172a;line-height:1.5;white-space:pre-wrap;">${escapeHtml(req.prescriptionMedicines)}</div>
          </div>`
        : ''
    }
  `;

  if (btnReport) {
    if (req.status === 'completed' && matchingReport) {
      btnReport.style.display = 'inline-block';
      btnReport.onclick = () => {
        closePatientRequestDetailModal();
        openPatientReportModal(matchingReport);
      };
    } else {
      btnReport.style.display = 'none';
    }
  }

  modal.classList.add('open');
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
}

function closePatientRequestDetailModal() {
  const modal = document.getElementById('patientRequestDetailModal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function renderLabSection(legacyLabs, reports) {
  const section = document.getElementById('labSection');
  const list = document.getElementById('labList');
  if (!section || !list) return;

  list.innerHTML = '';
  const renderedReportIds = new Set();

  // Render official submitted diagnostic reports first
  reports.forEach((report) => {
    renderedReportIds.add(report.id);
    if (report.labRequestId) renderedReportIds.add(report.labRequestId);
    list.appendChild(buildLabReportCard(report));
  });

  // Render any legacy lab records not already rendered as diagnostic reports
  legacyLabs.forEach((record) => {
    if (!renderedReportIds.has(record.id)) {
      list.appendChild(buildRecordCard(record));
    }
  });

  const hasContent = list.children.length > 0;
  section.style.display = hasContent ? 'block' : 'none';
}

function buildLabReportCard(report) {
  const card = document.createElement('div');
  card.className = 'rec-card';
  card.id = `report-${report.id}`;

  const reportDate = report.submittedAt
    ? formatDate(report.submittedAt.split('T')[0])
    : (report.updatedAt ? formatDate(report.updatedAt.split('T')[0]) : '—');

  card.innerHTML = `
    <div style="flex:1;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="rec-title" style="color:var(--accent);font-weight:700;">${escapeHtml(report.testName)}</div>
          <span class="badge" style="background:#ecfdf5;color:#065f46;border:1px solid rgba(16,185,129,0.3);font-size:.75rem;padding:2px 8px;border-radius:4px;">Submitted Report</span>
        </div>
        <button class="btn btn-outline btn-sm btn-view-patient-report" type="button" style="padding:4px 12px;font-size:.8rem;">View Report</button>
      </div>
      <div class="rec-meta rec-meta-doc">
        Dr. ${escapeHtml(report.doctorName)} &middot; Verified by ${escapeHtml(report.technicianName || 'Lab Technician')} ${reportDate ? ' &middot; ' + reportDate : ''}
      </div>
      <div class="rec-notes rec-primary-text" style="margin-top:8px;">
        <strong>Result:</strong> ${escapeHtml(report.result || 'No results recorded.')}
      </div>
      ${
        report.remarks
          ? `<div class="rec-notes" style="margin-top:4px;color:var(--text-muted);font-size:.82rem;">Remarks: ${escapeHtml(report.remarks)}</div>`
          : ''
      }
    </div>
  `;

  card.querySelector('.btn-view-patient-report').addEventListener('click', () => {
    openPatientReportModal(report);
  });

  return card;
}

function buildRecordCard(record) {
  const frag = useTemplate('tpl-rec-card');
  const card = frag.querySelector('.rec-card');
  const badge = card.querySelector('.rec-badge');
  const primaryText = card.querySelector('.rec-primary-text');
  const medicinesText = card.querySelector('.rec-medicines');
  const followUpText = card.querySelector('.rec-followup');

  card.id = `rcard-${record.id}`;
  card.querySelector('.rec-title').textContent = `Record ${record.id}`;
  card.querySelector('.rec-meta-doc').textContent =
    `${record.doctorName} - ${record.specialization}${record.date ? ' · ' + formatDate(record.date) : ''}`;

  badge.textContent = formatRecordType(record.type);
  badge.classList.add(record.type === 'consultation' ? 'badge-teal' : 'badge-orange');

  if (record.type === 'consultation') {
    primaryText.textContent = `Consultation Note: ${record.consultationNote || 'N/A'}`;
    medicinesText.textContent = `Medicines: ${record.medicines || 'N/A'}`;
    medicinesText.style.display = 'block';
    followUpText.textContent = `Follow-Up: ${record.followUp ? formatDate(record.followUp) : 'N/A'}`;
    followUpText.style.display = 'block';
  } else if (record.type === 'treatment') {
    const details = [];
    if (record.medicines) details.push(`Medicines: ${record.medicines}`);
    if (record.tests) details.push(`Tests: ${record.tests}`);
    if (record.lifestyle) details.push(`Lifestyle: ${record.lifestyle}`);
    if (record.diet) details.push(`Diet: ${record.diet}`);
    if (record.duration) details.push(`Duration: ${record.duration}`);
    primaryText.textContent = details.length
      ? details.join(' | ')
      : 'Treatment plan details from the assigned doctor.';
  } else {
    primaryText.textContent = 'Lab record available from the assigned doctor.';
  }

  return frag;
}

function openPatientReportModal(report) {
  const modal = document.getElementById('patientReportModal');
  const body = document.getElementById('patientReportModalBody');
  if (!modal || !body) return;

  const matchingReq = patientLabRequests.find(
    (r) =>
      (report.labRequestId && r.id === report.labRequestId) ||
      (r.reportId && r.reportId === report.id),
  );
  const recDateStr =
    matchingReq?.recommendationDate ||
    matchingReq?.requestDate ||
    (report.createdAt ? report.createdAt.split('T')[0] : '');

  const attachmentUrl = resolveLabReportAttachmentUrl(report);

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
        attachmentUrl
          ? `<div style="margin-bottom:18px;">
              <div style="font-size:.8rem;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Attached Detailed Report File</div>
              <div style="display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-size:1.3rem;">📄</span>
                  <div>
                    <div style="font-weight:600;color:#0f172a;font-size:0.9rem;">${escapeHtml(getLabReportAttachmentName(report))}</div>
                    <div style="font-size:0.75rem;color:#64748b;">${escapeHtml(getLabReportAttachmentType(report))} ${getLabReportAttachmentSize(report) ? `&middot; ${Math.round(getLabReportAttachmentSize(report) / 1024)} KB` : ''}</div>
                  </div>
                </div>
                <a href="${attachmentUrl}" download="${escapeHtml(getLabReportAttachmentName(report))}" class="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer" style="text-decoration:none;padding:4px 12px;font-size:.8rem;">
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

function formatRecordType(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
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

function resolveLabReportAttachmentUrl(report) {
  const raw =
    report?.fileAttachment?.fileData ||
    report?.uploadedFilePath ||
    report?.uploadedFileName ||
    '';

  if (!raw) return '';
  if (/^(data:|https?:|blob:)/i.test(raw)) return raw;

  try {
    return new URL(raw.startsWith('/') ? raw : `/${raw}`, MEDICAL_RECORDS_API_BASE_URL).href;
  } catch (_) {
    return raw;
  }
}

function getLabReportAttachmentName(report) {
  return (
    report?.fileAttachment?.fileName ||
    report?.uploadedFileOriginalName ||
    report?.uploadedFileName ||
    'lab-report-file'
  );
}

function getLabReportAttachmentType(report) {
  return report?.fileAttachment?.fileType || report?.uploadedFileMimeType || '';
}

function getLabReportAttachmentSize(report) {
  return report?.fileAttachment?.fileSize || report?.uploadedFileSize || 0;
}
