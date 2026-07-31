/* MEDBITS - feedback.js */

const FEEDBACK_API_BASE_URL = 'http://localhost:3000';

const RATING_COLOURS = {
  Bad: 'badge-red',
  Average: 'badge-orange',
  Good: 'badge-green',
  Better: 'badge-green',
  Excellent: 'badge-green',
};

let completedAppointments = [];
let userFeedback = [];

async function initializeFeedbackPage() {
  await Promise.all([loadCompletedAppointments(), loadUserFeedback()]);
  renderFeedback();
}

async function loadCompletedAppointments() {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(
    `${FEEDBACK_API_BASE_URL}/appointments/completed/${encodeURIComponent(session.id)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load completed appointments');
  }

  completedAppointments = await response.json();
}

async function loadUserFeedback() {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(
    `${FEEDBACK_API_BASE_URL}/feedback/user/${encodeURIComponent(session.id)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load feedback');
  }

  userFeedback = await response.json();
}

function renderFeedback() {
  const select = document.getElementById('fbDoctor');
  if (select) {
    select.innerHTML = '';

    const feedbackDoctorIds = new Set(
      userFeedback.map((feedback) => feedback.doctorId),
    );
    const seenDoctorIds = new Set();
    const availableAppointments = completedAppointments.filter(
      (appointment) => !feedbackDoctorIds.has(appointment.doctor.id),
    );

    if (!availableAppointments.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No completed appointments available for feedback';
      select.appendChild(opt);
    }

    availableAppointments.forEach((appointment) => {
      if (seenDoctorIds.has(appointment.doctor.id)) {
        return;
      }
      seenDoctorIds.add(appointment.doctor.id);

      const opt = document.createElement('option');
      opt.value = appointment.doctor.id;
      opt.textContent = `${appointment.doctor.name} - ${appointment.doctor.specialization}`;
      select.appendChild(opt);
    });
  }

  renderFbList();
}

function renderFbList() {
  const list = document.getElementById('fbList');
  if (!list) return;
  list.innerHTML = '';

  if (!userFeedback.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '...';
    const msg = document.createElement('p');
    msg.textContent = 'No feedback yet';
    empty.appendChild(icon);
    empty.appendChild(msg);
    list.appendChild(empty);
    return;
  }

  userFeedback.forEach((feedback) => {
    const frag = document.getElementById('tpl-fb-card').content.cloneNode(true);
    const card = frag.querySelector('.fb-card');

    card.querySelector('.fb-doctor').textContent = feedback.doctor.name;
    card.querySelector('.fb-date').textContent = feedback.doctor.specialization;
    card.querySelector('.fb-comment').textContent = feedback.comment;

    const badge = card.querySelector('.fb-badge');
    badge.textContent = feedback.rating;
    badge.classList.add(RATING_COLOURS[feedback.rating] || 'badge-blue');

    list.appendChild(frag);
  });
}

function selectRating(btn, rating) {
  document.querySelectorAll('.rating-btn').forEach((button) => button.classList.remove('selected'));
  btn.classList.add('selected');
  window._rating = rating;
}

async function submitFeedback() {
  const session = requireRole('patient');
  const doctorId = val('fbDoctor');
  const comment = val('fbComment').trim();
  const rating = window._rating;

  if (!session) return;
  if (!doctorId) {
    showToast('Please select a consulted doctor', 'error');
    return;
  }
  if (!rating) {
    showToast('Please select a rating', 'error');
    return;
  }
  if (!comment) {
    showToast('Please write your feedback', 'error');
    return;
  }

  const response = await fetch(`${FEEDBACK_API_BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      role: 'patient',
    },
    body: JSON.stringify({
      userId: session.id,
      doctorId,
      rating,
      comment,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    showToast(errorBody?.message || 'Unable to submit feedback', 'error');
    return;
  }

  window._rating = '';
  document.getElementById('fbComment').value = '';
  document.querySelectorAll('.rating-btn').forEach((button) => button.classList.remove('selected'));
  await loadUserFeedback();
  renderFeedback();
  showToast('Feedback submitted!', 'success');
}
