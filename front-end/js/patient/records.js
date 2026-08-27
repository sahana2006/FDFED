const MEDICAL_RECORDS_API_BASE_URL = 'http://localhost:3000';

let medicalRecords = [];
let medicalRecordsRefreshTimer = null;

function useTemplate(id) {
  return document.getElementById(id).content.cloneNode(true);
}

async function initializeMedicalRecordsPage() {
  const session = requireRole('patient');
  if (!session) return;

  const patientId = (session.userId || session.patientId || session.id || '').trim();
  await refreshAllPatientData(patientId);
  startMedicalRecordsRefresh();
}

async function refreshAllPatientData(patientId) {
  await fetchMedicalRecords(patientId);
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

  const totalCount = consultations.length + treatments.length;

  setText('stat-total', totalCount);
  setText('stat-consults', consultations.length);
  setText('stat-treatments', treatments.length);

  renderRecordGroup('consultationSection', 'consultationList', consultations);
  renderRecordGroup('treatmentSection', 'treatmentList', treatments);

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
    primaryText.textContent = 'Medical record available from the assigned doctor.';
  }

  return frag;
}

function formatRecordType(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

