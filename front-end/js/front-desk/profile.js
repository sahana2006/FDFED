/* ============================================================
   PROFILE.JS - Profile page logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  renderShell('profile');

  const session = getSession();
  if (!session?.id) {
    showToast('Please log in again.', 'error');
    return;
  }

  let staff;
  try {
    staff = await loadCurrentFrontdeskProfile();
  } catch (error) {
    console.error('Frontdesk profile load error:', error);
    showToast('Failed to load profile.', 'error');
    return;
  }

  const initials = staff.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  document.getElementById('profile-avatar').textContent = initials;
  document.getElementById('profile-name').textContent = staff.name;
  document.getElementById('profile-age').textContent = staff.gender || '-';
  document.getElementById('profile-role').textContent = 'Frontdesk Staff';
  document.getElementById('profile-empid').textContent = `EmpID : ${staff.userId}`;
  document.getElementById('profile-dept').textContent = 'Front Desk';

  document.getElementById('joining-date').textContent = staff.dateJoining || '-';
  document.getElementById('reporting-manager').textContent =
    staff.reportingManagerId || '-';

  document.getElementById('profile-email').textContent = staff.email;
  document.getElementById('profile-phone').textContent = staff.phone || '-';

  document.getElementById('shift-name').textContent =
    staff.shiftStart && staff.shiftEnd ? 'Current Shift' : '-';
  document.getElementById('shift-time').textContent =
    staff.shiftStart && staff.shiftEnd
      ? `${staff.shiftStart} - ${staff.shiftEnd}`
      : '-';
  document.getElementById('shift-counter').textContent = staff.counter
    ? `Counter ${staff.counter}`
    : '-';

  document.getElementById('authorized-modules').textContent =
    'Walk-in, Appointments, Follow-Up, Queue';
  document.getElementById('last-login').textContent =
    new Date().toLocaleString();

  const languages = Array.isArray(staff.languages) ? staff.languages : [];
  const langList = document.getElementById('language-list');
  langList.innerHTML = languages.length
    ? languages
        .map(
          (lang) => `
            <div class="language-chip">
              <div class="language-name">${lang}</div>
              <div class="language-level">Working proficiency</div>
            </div>
          `,
        )
        .join('')
    : '<div class="text-muted">No languages added.</div>';
});
