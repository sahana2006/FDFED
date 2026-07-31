/* treatment-plan.js */
(async () => {
  await loadComponents('treatment-plan', 'Treatment Plan');

  const API_BASE = 'http://localhost:3000';

  const searchInput = document.getElementById('appointmentSearchInput');
  const appointmentSearchResults = document.getElementById('appointmentSearchResults');
  const selectedBanner = document.getElementById('selectedAppointmentBanner');
  const selectedDetail = document.getElementById('selectedAppointmentDetail');
  const clearSelectionBtn = document.getElementById('clearSelectionBtn');
  const savePlanBtn = document.getElementById('savePlanBtn');
  const viewHistoryBtn = document.getElementById('viewHistoryBtn');
  const historyModal = document.getElementById('historyModal');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const historyList = document.getElementById('historyList');
  const historyTitle = document.getElementById('historyModalTitle');
  const errorBanner = document.getElementById('planErrorBanner');
  const formFieldIds = ['lifestyle', 'diet', 'duration'];

  let appointments = [];
  let selectedAppointment = null;

  /* ── Doctor session helpers ── */
  function getDoctorSession() {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (_) {
      return {};
    }
  }

  function getDoctorId() {
    const session = getDoctorSession();
    return session.doctorId || session.id || '';
  }

  /* ── Patient extraction from appointment ── */
  function getPatient(appointment) {
    if (appointment.patient) {
      const patientName = appointment.patient.name ||
        `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim();
      return {
        id: appointment.patient.userId || appointment.userId,
        name: patientName || appointment.userId,
      };
    }
    const fallbackId = appointment.userId || appointment.patientId || 'PATIENT';
    return { id: fallbackId, name: fallbackId };
  }

  function formatDisplayDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateValue;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /* ── Error helpers ── */
  function showFormError(message) {
    if (!errorBanner) return;
    errorBanner.textContent = message;
    errorBanner.classList.add('show');
  }

  function clearFormError() {
    if (!errorBanner) return;
    errorBanner.textContent = '';
    errorBanner.classList.remove('show');
  }

  function setFieldError(field, shouldHighlight) {
    if (!field) return;
    field.classList.toggle('field-error', shouldHighlight);
  }

  function clearFieldErrors() {
    setFieldError(searchInput, false);
    formFieldIds.forEach(id => setFieldError(document.getElementById(id), false));
  }

  /* ── Form helpers ── */
  function collectPlanValues() {
    return {
      lifestyle: document.getElementById('lifestyle').value.trim(),
      diet: document.getElementById('diet').value.trim(),
      duration: document.getElementById('duration').value.trim(),
    };
  }

  function validatePlan(plan) {
    if (!selectedAppointment) {
      searchInput.classList.add('input-error');
      setTimeout(() => searchInput.classList.remove('input-error'), 1500);
      return 'Please select an appointment before saving the treatment plan.';
    }

    const hasAnyContent = Object.values(plan).some(Boolean);
    if (!hasAnyContent) {
      formFieldIds.forEach(id => setFieldError(document.getElementById(id), true));
      return 'Enter at least one treatment detail before saving.';
    }

    if (plan.duration && plan.duration.length < 3) {
      setFieldError(document.getElementById('duration'), true);
      return 'Treatment duration looks too short. Use a value like "2 weeks" or "1 month".';
    }

    return '';
  }

  function clearFormFields() {
    formFieldIds.forEach(id => {
      document.getElementById(id).value = '';
    });
  }

  /* ── Local storage plan persistence ── */
  function getAllPlans() {
    try {
      return JSON.parse(localStorage.getItem('treatmentPlans') || '{}');
    } catch (error) {
      throw new Error('Saved treatment plan data is corrupted. Clear the stored plans and try again.');
    }
  }

  function saveLocalPlan(patientId, plan) {
    const all = getAllPlans();
    if (!all[patientId]) all[patientId] = [];
    all[patientId].unshift(plan);

    try {
      localStorage.setItem('treatmentPlans', JSON.stringify(all));
    } catch (error) {
      throw new Error('Unable to save the treatment plan right now. Browser storage may be unavailable.');
    }
  }

  function getPatientPlans(patientId) {
    return getAllPlans()[patientId] || [];
  }

  /* ── Fetch doctor's appointments from API ── */
  async function loadAppointments() {
    const doctorId = getDoctorId();
    if (!doctorId) {
      appointments = [];
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/appointments/doctor/${encodeURIComponent(doctorId)}`, {
        headers: { role: 'doctor' },
      });
      if (!response.ok) throw new Error('Unable to load appointments');
      const data = await response.json();
      // Show completed appointments for creating treatment plans
      appointments = data.filter(apt => apt.status === 'completed');
    } catch (_) {
      appointments = [];
    }
  }

  /* ── Appointment search dropdown ── */
  function renderAppointmentSearch(query = '') {
    const normalized = query.trim().toLowerCase();
    appointmentSearchResults.innerHTML = '';

    const matches = normalized ? appointments.filter(apt => {
      const patient = getPatient(apt);
      return `${apt.id} ${patient.id} ${patient.name} ${apt.date} ${apt.slot}`
        .toLowerCase()
        .includes(normalized);
    }) : appointments;

    if (!matches.length) {
      appointmentSearchResults.innerHTML =
        '<button type="button" class="appointment-search-option empty" disabled>No completed appointments found</button>';
      appointmentSearchResults.classList.add('open');
      return;
    }

    matches.forEach(apt => {
      const patient = getPatient(apt);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'appointment-search-option';
      btn.innerHTML = `
        <span><strong>${patient.name}</strong><small>${apt.id} | ${formatDisplayDate(apt.date)} | ${apt.slot}</small></span>
        <span class="apt-status-tag">${apt.status || 'completed'}</span>`;
      btn.addEventListener('click', () => selectAppointment(apt));
      appointmentSearchResults.appendChild(btn);
    });

    appointmentSearchResults.classList.add('open');
  }

  function selectAppointment(appointment) {
    selectedAppointment = appointment;
    const patient = getPatient(appointment);
    searchInput.value = `${appointment.id} — ${patient.name} — ${formatDisplayDate(appointment.date)} ${appointment.slot}`;
    appointmentSearchResults.classList.remove('open');

    // Show the selected appointment banner
    selectedDetail.textContent = `${appointment.id} — ${patient.name} — ${formatDisplayDate(appointment.date)} at ${appointment.slot}`;
    selectedBanner.style.display = 'flex';

    clearFormError();
    clearFieldErrors();
    searchInput.classList.remove('input-error');
  }

  function clearSelection() {
    selectedAppointment = null;
    searchInput.value = '';
    selectedBanner.style.display = 'none';
    selectedDetail.textContent = '';
  }

  clearSelectionBtn.addEventListener('click', () => {
    clearSelection();
    searchInput.focus();
  });

  /* ── Save treatment plan ── */
  savePlanBtn.addEventListener('click', async () => {
    clearFormError();
    clearFieldErrors();

    const planValues = collectPlanValues();
    const validationError = validatePlan(planValues);

    if (validationError) {
      showFormError(validationError);
      showToast(validationError, 'error');
      return;
    }

    const patient = getPatient(selectedAppointment);
    const patientId = patient.id;

    const plan = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      appointmentId: selectedAppointment.id,
      ...planValues,
    };

    try {
      saveLocalPlan(patientId, plan);
      clearFormFields();

      // ── Persist to backend so it shows in patient medical records ──
      try {
        const session = getDoctorSession();
        let doctorId = getDoctorId();
        let doctorName = session.name || 'Doctor';
        let specialization = session.specialization || 'General';

        await fetch(`${API_BASE}/medical-records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', role: 'doctor' },
          body: JSON.stringify({
            doctorId,
            patientId,
            appointmentId: selectedAppointment.id,
            type: 'treatment',
            doctorName,
            specialization,
            date: new Date().toISOString().split('T')[0],
            lifestyle: plan.lifestyle,
            diet: plan.diet,
            duration: plan.duration,
          }),
        });
      } catch (_) {
        // Backend may not be running; local save already succeeded
      }

      clearSelection();
      showToast('Treatment plan saved successfully!', 'success');
    } catch (error) {
      showFormError(error.message);
      showToast(error.message, 'error');
    }
  });

  /* ── View history ── */
  viewHistoryBtn.addEventListener('click', () => {
    clearFormError();
    clearFieldErrors();

    if (!selectedAppointment) {
      const message = 'Please select an appointment first.';
      searchInput.classList.add('input-error');
      setTimeout(() => searchInput.classList.remove('input-error'), 1500);
      showFormError(message);
      showToast(message, 'error');
      return;
    }

    const patient = getPatient(selectedAppointment);
    const patientId = patient.id;

    try {
      const plans = getPatientPlans(patientId);
      historyTitle.textContent = `Treatment History — ${patient.name}`;
      historyList.innerHTML = '';

      if (plans.length === 0) {
        historyList.innerHTML = '<p style="color:var(--text-muted);font-size:.875rem;text-align:center;padding:20px 0;">No treatment plans saved yet for this patient.</p>';
      } else {
        plans.forEach((plan, index) => {
          const card = document.createElement('div');
          card.style.cssText = 'border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:16px;margin-bottom:14px;';
          card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <span style="font-weight:700;font-size:.875rem;">Plan #${plans.length - index}</span>
              <span style="font-size:.78rem;color:var(--text-muted);">${plan.date || 'Unknown date'}</span>
            </div>
            ${plan.appointmentId ? `<div class="hist-row"><strong>Appointment:</strong> ${plan.appointmentId}</div>` : ''}
            ${plan.lifestyle ? `<div class="hist-row"><strong>Lifestyle:</strong> ${plan.lifestyle}</div>` : ''}
            ${plan.diet ? `<div class="hist-row"><strong>Diet:</strong> ${plan.diet}</div>` : ''}
            ${plan.duration ? `<div class="hist-row"><strong>Duration:</strong> ${plan.duration}</div>` : ''}`;
          historyList.appendChild(card);
        });
      }

      historyModal.classList.add('open');
    } catch (error) {
      showFormError(error.message);
      showToast(error.message, 'error');
    }
  });

  closeHistoryBtn.addEventListener('click', () => historyModal.classList.remove('open'));
  historyModal.addEventListener('click', event => {
    if (event.target === historyModal) historyModal.classList.remove('open');
  });

  /* ── Search input events ── */
  searchInput.addEventListener('input', function () {
    selectedAppointment = null;
    selectedBanner.style.display = 'none';
    renderAppointmentSearch(this.value);
  });

  searchInput.addEventListener('click', () => renderAppointmentSearch(searchInput.value));
  searchInput.addEventListener('focus', () => renderAppointmentSearch(searchInput.value));

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.appointment-search-shell')) {
      appointmentSearchResults.classList.remove('open');
    }
  });

  /* ── Clear field errors on input ── */
  formFieldIds.map(id => document.getElementById(id)).forEach(field => {
    if (!field) return;

    const clearCurrentFieldError = () => {
      setFieldError(field, false);
      clearFormError();
    };

    field.addEventListener('input', clearCurrentFieldError);
    field.addEventListener('change', clearCurrentFieldError);
  });

  /* ── Initialize ── */
  await loadAppointments();
})();
