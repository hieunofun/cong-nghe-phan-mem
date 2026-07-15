// public/js/auth.js
// Xu ly form dang nhap (login.html) va dang ky (register.html)

function showAlert(message, type = 'error') {
  const slot = document.getElementById('alert-slot');
  if (!slot) return;
  slot.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}

function clearAlert() {
  const slot = document.getElementById('alert-slot');
  if (slot) slot.innerHTML = '';
}

function setButtonLoading(btn, loading, idleText) {
  btn.disabled = loading;
  btn.innerHTML = loading ? `<span class="loading-spinner"></span> Đang xử lý...` : idleText;
}

function redirectAfterAuth(role) {
  window.location.href = dashboardUrlForRole(role);
}

// --- LOGIN ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const btn = document.getElementById('submit-btn');
    setButtonLoading(btn, true, 'Đăng nhập');

    try {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password }, auth: false });
      setAuth(data.token, data.user);
      showToast('Đăng nhập thành công!', 'success');
      redirectAfterAuth(data.user.role);
    } catch (err) {
      showAlert(err.message);
      setButtonLoading(btn, false, 'Đăng nhập');
    }
  });
}

// --- REGISTER ---
const registerForm = document.getElementById('register-form');
if (registerForm) {
  let currentRole = 'candidate';
  const roleButtons = document.querySelectorAll('.role-switch button');
  const candidateFields = document.getElementById('candidate-fields');
  const companyFields = document.getElementById('company-fields');

  roleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentRole = btn.dataset.role;
      roleButtons.forEach((b) => b.classList.toggle('active', b === btn));
      candidateFields.style.display = currentRole === 'candidate' ? 'block' : 'none';
      companyFields.style.display = currentRole === 'company' ? 'block' : 'none';
      clearAlert();
    });
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const btn = document.getElementById('submit-btn');
    setButtonLoading(btn, true, 'Đăng ký');

    try {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      let data;
      if (currentRole === 'candidate') {
        const full_name = document.getElementById('full_name').value.trim();
        if (!full_name) throw new Error('Vui lòng nhập họ và tên.');
        data = await apiFetch('/auth/register/candidate', {
          method: 'POST', body: { email, password, full_name }, auth: false
        });
      } else {
        const company_name = document.getElementById('company_name').value.trim();
        const tax_code = document.getElementById('tax_code').value.trim();
        const address = document.getElementById('address').value.trim();
        if (!company_name) throw new Error('Vui lòng nhập tên doanh nghiệp.');
        data = await apiFetch('/auth/register/company', {
          method: 'POST', body: { email, password, company_name, tax_code, address }, auth: false
        });
      }

      setAuth(data.token, data.user);
      showToast(data.message, 'success');
      redirectAfterAuth(data.user.role);
    } catch (err) {
      showAlert(err.message);
      setButtonLoading(btn, false, 'Đăng ký');
    }
  });
}
