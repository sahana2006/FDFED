(async () => {
  await loadComponents('profile', 'Profile');

  const API_BASE = 'http://localhost:3000';

  const editableFields = ['email', 'phone'];
  const editBtn = document.getElementById('editProfileBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  const saveBtn = document.getElementById('saveProfileBtn');
  const editActions = document.getElementById('editActions');
  const avatarEl = document.getElementById('profileAvatarLg');
  const profileName = document.getElementById('profileName');
  const profileRole = document.getElementById('profileRole');
  const profileDoctorId = document.getElementById('profileDoctorId');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');

  /* ── Session helpers ── */
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

  function getInitials(name) {
    return (name || '?')
      .split(/[\s-]+/)
      .map(part => part[0]?.toUpperCase() || '')
      .slice(0, 2)
      .join('');
  }

  /* ── Doctor data fetched from backend ── */
  let doctorData = null;

  async function fetchDoctorProfile() {
    const doctorId = getDoctorId();
    if (!doctorId) return null;

    try {
      const response = await fetch(`${API_BASE}/doctors/${encodeURIComponent(doctorId)}`, {
        headers: { role: 'doctor' },
      });
      if (!response.ok) throw new Error('Failed to load doctor profile');
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  function getProfile() {
    const session = getDoctorSession();
    const savedEdits = JSON.parse(localStorage.getItem('doctorProfile') || '{}');

    // Build profile from backend data, falling back to session, then saved edits
    const name = doctorData?.name || session.name || 'Doctor';
    const specialization = doctorData?.specialization || session.specialization || 'General';
    const department = doctorData?.department || 'General Medicine';
    const qualification = doctorData?.qualification || '';
    const email = savedEdits.email || doctorData?.email || session.email || '';
    const phone = savedEdits.phone || doctorData?.phone || '';

    const normalizedPhone = getNormalizedPhone(phone);

    // Split name into first/last
    const nameParts = name.replace(/^Dr\.\s*/i, '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      name,
      firstName,
      lastName,
      role: `${specialization} - MEDBITS Hospital`,
      email,
      phone: normalizedPhone.length === 10 ? normalizedPhone : (doctorData?.phone || ''),
      initials: getInitials(name),
      specialization,
      department,
      qualification,
      doctorId: getDoctorId(),
    };
  }

  function populateProfile() {
    const data = getProfile();
    profileName.textContent = data.name;
    profileRole.textContent = data.role;
    if (profileDoctorId) profileDoctorId.textContent = data.doctorId;

    avatarEl.style.backgroundImage = '';
    avatarEl.textContent = data.initials;

    document.getElementById('firstName').value = data.firstName;
    document.getElementById('lastName').value = data.lastName;
    document.getElementById('email').value = data.email;
    document.getElementById('phone').value = data.phone;
    document.getElementById('spec').value = data.specialization;
    document.getElementById('dept').value = data.department;
    document.getElementById('qual').value = data.qualification;

    // Also update header bar
    const topName = document.getElementById('userNameTop');
    const topRole = document.getElementById('userRoleTop');
    if (topName) topName.textContent = data.name;
    if (topRole) topRole.textContent = data.role;
  }

  function enableEditing(on) {
    editableFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !on;
    });
    editActions.style.display = on ? 'flex' : 'none';
    editBtn.style.display = on ? 'none' : '';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getNormalizedPhone(phone) {
    return String(phone || '').replace(/\D/g, '');
  }

  /* ── Initialize ── */
  doctorData = await fetchDoctorProfile();
  populateProfile();
  enableEditing(false);

  // Clean up any stale doctorProfile localStorage
  const existingProfile = JSON.parse(localStorage.getItem('doctorProfile') || '{}');
  if (existingProfile.photo || (existingProfile.phone && getNormalizedPhone(existingProfile.phone).length !== 10)) {
    const sanitizedProfile = getProfile();
    localStorage.setItem('doctorProfile', JSON.stringify({ email: sanitizedProfile.email, phone: sanitizedProfile.phone }));
  }

  phoneInput.addEventListener('input', () => {
    phoneInput.value = getNormalizedPhone(phoneInput.value).slice(0, 10);
  });

  editBtn.addEventListener('click', () => enableEditing(true));
  cancelBtn.addEventListener('click', () => {
    populateProfile();
    enableEditing(false);
  });

  saveBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const phoneDigits = getNormalizedPhone(phoneInput.value);

    if (!isValidEmail(email)) {
      showToast('Please enter a valid email address.', 'error');
      emailInput.focus();
      return;
    }

    if (phoneDigits.length !== 10) {
      showToast('Phone number must be exactly 10 digits.', 'error');
      phoneInput.focus();
      return;
    }

    // Persist only the editable fields
    localStorage.setItem('doctorProfile', JSON.stringify({ email, phone: phoneDigits }));
    populateProfile();
    enableEditing(false);
    showToast('Profile updated successfully!', 'success');
  });
})();
