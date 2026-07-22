(function personalizeEmployerActions() {
  const user = getToken() ? getUser() : null;
  if (user?.role !== 'company') return;

  document.querySelectorAll('[data-company-session-link]').forEach((link) => {
    link.href = link.dataset.companyHref;
    link.textContent = link.dataset.companyLabel;
  });
})();
