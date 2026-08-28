/* MEDBITS - billing.js */

const BILLING_CONTEXT_KEY = 'medbits_patient_billing_context';
const STATIC_BILLING_AMOUNT = 'Rs 1,200.00';

function getBillingContext() {
  try {
    const raw = sessionStorage.getItem(BILLING_CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function setBillingText(id, value, fallback) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value || fallback;
}

function renderBillingDetails() {
  const data = getBillingContext();
  const appointment = data?.appointment || {};
  const doctor = appointment.doctor || {};
  const patient = appointment.patient || {};
  const branch = appointment.branch || {};

  setBillingText('billingAppointmentId', appointment.id, 'APT-XXXXXX');
  setBillingText('billingPatientName', patient.name, 'Patient Name');
  setBillingText('billingDoctorName', doctor.name, 'Doctor Name');
  setBillingText('billingSpeciality', doctor.specialization, 'Speciality');
  setBillingText('billingDate', appointment.date ? formatDate(appointment.date) : '', 'DD MMM, YYYY');
  setBillingText('billingTime', appointment.slot, 'HH:MM');
  setBillingText('billingBranch', branch.branchName, 'Hospital Branch');
  setBillingText('billingAmount', data?.amount || STATIC_BILLING_AMOUNT, STATIC_BILLING_AMOUNT);

  const badge = document.getElementById('billingStatusBadge');
  if (badge) {
    badge.textContent = 'BOOKING CONFIRMED';
  }
}

async function initializeBillingPage() {
  if (!requireRole('patient')) return;
  renderBillingDetails();
}
