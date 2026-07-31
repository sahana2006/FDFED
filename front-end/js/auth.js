const USER_STORAGE_KEY = 'user';
const API_BASE_URL = 'http://localhost:3000';

function getSession() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

function redirectByRole(user) {
  const routes = {
    admin: 'superuser/dashboard.html',
    patient: 'patient/dashboard.html',
    doctor: 'doctor/dashboard.html',
    frontdesk: 'front-desk/dashboard.html',
  };

  const route = routes[user.role];
  if (!route) {
    clearSession();
    window.location.replace('login.html');
    return;
  }

  window.location.href = route;
}

async function handleLogin(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return 'Invalid email or password.';
    }

    const user = await response.json();
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    redirectByRole(user);
    return null;
  } catch (_error) {
    return 'Unable to reach server. Ensure backend is running on port 3000.';
  }
}

async function handleSignup(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return errorBody?.message || 'Unable to create account.';
    }

    return null;
  } catch (_error) {
    return 'Unable to reach server. Ensure backend is running on port 3000.';
  }
}
