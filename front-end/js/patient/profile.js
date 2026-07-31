/* MEDBITS - profile.js */

const PATIENT_API_BASE_URL = 'http://localhost:3000';
let patientProfile = null;

async function loadPatientProfile() {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(
    `${PATIENT_API_BASE_URL}/patients/${encodeURIComponent(session.id)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load patient profile');
  }

  patientProfile = await response.json();
  renderProfile();
}

function renderProfile() {
  if (!patientProfile) return;

  const initials =
    (patientProfile.firstName?.[0] || '') + (patientProfile.lastName?.[0] || '');

  setText('profileInitials', initials.toUpperCase());
  setText('profileName', `${patientProfile.firstName} ${patientProfile.lastName}`);
  setText('profileId', `Patient ID: ${patientProfile.userId}`);

  setValue('pf-firstName', patientProfile.firstName);
  setValue('pf-lastName', patientProfile.lastName);
  setValue('pf-dob', patientProfile.dob);
  setValue('pf-gender', patientProfile.gender);
  setValue('pf-blood', patientProfile.bloodGroup);
  setValue('pf-phone', patientProfile.phone);
  setValue('pf-email', patientProfile.email);
  setValue('pf-guardian', patientProfile.guardianName);
}

function openEditProfile() {
  if (!patientProfile) return;

  openModal(document.getElementById('tpl-editProfile').innerHTML);
  setValue('ef-fn', patientProfile.firstName);
  setValue('ef-ln', patientProfile.lastName);
  setValue('ef-dob', patientProfile.dob);
  setValue('ef-gender', patientProfile.gender);
  setValue('ef-bg', patientProfile.bloodGroup);
  setValue('ef-ph', patientProfile.phone);
  setValue('ef-em', patientProfile.email);
  setValue('ef-gn', patientProfile.guardianName);
}

async function saveProfile() {
  const session = requireRole('patient');
  if (!session) return;

  const payload = {
    firstName: val('ef-fn').trim(),
    lastName: val('ef-ln').trim(),
    dob: val('ef-dob').trim(),
    gender: val('ef-gender').trim(),
    bloodGroup: val('ef-bg').trim(),
    phone: val('ef-ph').trim(),
    email: val('ef-em').trim(),
    guardianName: val('ef-gn').trim(),
  };

  const response = await fetch(
    `${PATIENT_API_BASE_URL}/patients/${encodeURIComponent(session.id)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        role: 'patient',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    showToast('Unable to update profile', 'error');
    return;
  }

  patientProfile = await response.json();
  localStorage.setItem(
    'user',
    JSON.stringify({
      ...session,
      firstName: patientProfile.firstName,
      lastName: patientProfile.lastName,
      name: `${patientProfile.firstName} ${patientProfile.lastName}`.trim(),
      email: patientProfile.email,
    }),
  );

  closeModal();
  updateTopbarUser();
  renderProfile();
  showToast('Profile updated', 'success');
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}
