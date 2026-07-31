const MEDICAL_RECORDS_API_BASE_URL = 'http://localhost:3000';

let medicalRecords = [];
let medicalRecordsRefreshTimer = null;

function useTemplate(id) {
  return document.getElementById(id).content.cloneNode(true);
}

async function initializeMedicalRecordsPage() {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(
    `${MEDICAL_RECORDS_API_BASE_URL}/medical-records/${encodeURIComponent(session.id)}`,
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
  renderMedicalRecords();
  startMedicalRecordsRefresh();
}

function startMedicalRecordsRefresh() {
  if (medicalRecordsRefreshTimer) return;

  medicalRecordsRefreshTimer = window.setInterval(async () => {
    if (document.hidden) return;
    try {
      await refreshMedicalRecords();
    } catch (_) {}
  }, 5000);

  window.addEventListener('focus', async () => {
    try {
      await refreshMedicalRecords();
    } catch (_) {}
  });
}

async function refreshMedicalRecords() {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(
    `${MEDICAL_RECORDS_API_BASE_URL}/medical-records/${encodeURIComponent(session.id)}`,
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
  renderMedicalRecords();
}

function renderMedicalRecords() {
  const consultations = medicalRecords.filter((record) => record.type === 'consultation');
  const treatments = medicalRecords.filter((record) => record.type === 'treatment');
  const labs = medicalRecords.filter((record) => record.type === 'lab');

  setText('stat-total', medicalRecords.length);
  setText('stat-consults', consultations.length);
  setText('stat-labs', labs.length);

  renderRecordGroup('consultationSection', 'consultationList', consultations);
  renderRecordGroup('treatmentSection', 'treatmentList', treatments);
  renderRecordGroup('labSection', 'labList', labs);

  const emptyState = document.getElementById('recordsEmptyState');
  if (emptyState) {
    emptyState.style.display = medicalRecords.length ? 'none' : 'block';
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
    primaryText.textContent = 'Lab record available from the assigned doctor.';
  }

  return frag;
}

function formatRecordType(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
