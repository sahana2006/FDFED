async function injectComponent(containerId, componentPath) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const response = await fetch(componentPath);
  if (!response.ok) {
    throw new Error(`Failed to load component: ${componentPath}`);
  }

  const markup = await response.text();
  container.outerHTML = markup;
}

async function loadFrontDeskComponents() {
  const sidebarContainer = document.getElementById('sidebar');
  const navbarContainer = document.getElementById('navbar');

  if (!sidebarContainer && !navbarContainer) return;

  await Promise.all([
    injectComponent('sidebar', '../components/fd_sidebar.html'),
    injectComponent('navbar', '../components/fd_navbar.html')
  ]);
}

window.fdComponentsReady = new Promise((resolve) => {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await loadFrontDeskComponents();
    } catch (error) {
      console.error('Front Desk component loader failed:', error);
    } finally {
      resolve();
    }
  });
});
