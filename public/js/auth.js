// Xu ly cac luong xac thuc tai khoan JobLink.

function showAlert(message, type = 'error') {
  const slot = document.getElementById('alert-slot');
  if (!slot) return;
  slot.innerHTML = `<div class="alert alert-${type}" role="alert">${escapeHtml(message)}</div>`;
}

function clearAlert() {
  const slot = document.getElementById('alert-slot');
  if (slot) slot.innerHTML = '';
}

function setButtonLoading(btn, loading, idleText) {
  btn.disabled = loading;
  btn.innerHTML = loading ? '<span class="loading-spinner"></span> Đang xử lý...' : idleText;
}

function redirectAfterAuth(role) {
  window.location.href = dashboardUrlForRole(role);
}

function passwordValidationMessage(password) {
  if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'Mật khẩu phải có chữ hoa, chữ thường và chữ số.';
  }
  return '';
}

function readPageHistoryState(key) {
  return window.history.state?.[key] || null;
}

function writePageHistoryState(key, value, push = false) {
  const nextState = { ...(window.history.state || {}), [key]: value };
  const method = push ? 'pushState' : 'replaceState';
  window.history[method](nextState, '', window.location.href);
}

const accountEntryForm = document.getElementById('login-form') || document.getElementById('register-form');
if (accountEntryForm) {
  clearAuth();
  window.addEventListener('pageshow', clearAuth);
}

function setupPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      button.textContent = showing ? 'Hiện' : 'Ẩn';
      button.setAttribute('aria-label', showing ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
    });
  });
}

function setupPasswordStrength(input) {
  const host = document.getElementById('password-strength');
  if (!input || !host) return;
  const fill = host.querySelector('.strength-fill');
  const label = host.querySelector('.strength-label');

  input.addEventListener('input', () => {
    const value = input.value;
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value) && value.length >= 10) score += 1;

    host.dataset.score = String(score);
    fill.style.width = `${score * 25}%`;
    label.textContent = value
      ? ['Mật khẩu chưa đạt yêu cầu', 'Mật khẩu yếu', 'Mật khẩu trung bình', 'Mật khẩu tốt', 'Mật khẩu mạnh'][score]
      : 'Dùng chữ hoa, chữ thường và số';
  });
}

setupPasswordToggles();
setupPasswordStrength(document.getElementById('password'));

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();

    if (!loginForm.reportValidity()) return;
    const btn = document.getElementById('submit-btn');
    setButtonLoading(btn, true, 'Đăng nhập');

    try {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const remember = document.getElementById('remember').checked;
      const data = await apiFetch('/auth/login', {
        method: 'POST', body: { email, password }, auth: false
      });
      setAuth(data.token, data.user, remember);
      showToast('Đăng nhập thành công!', 'success');
      redirectAfterAuth(data.user.role);
    } catch (error) {
      showAlert(error.message);
      setButtonLoading(btn, false, 'Đăng nhập');
    }
  });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
  let currentRole = new URLSearchParams(window.location.search).get('role') === 'company'
    ? 'company'
    : 'candidate';
  const roleButtons = document.querySelectorAll('.role-switch button');
  const candidateFields = document.getElementById('candidate-fields');
  const companyFields = document.getElementById('company-fields');

  function selectRole(role) {
    currentRole = role;
    roleButtons.forEach((button) => {
      const active = button.dataset.role === role;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    candidateFields.hidden = role !== 'candidate';
    companyFields.hidden = role !== 'company';
    document.getElementById('full_name').required = role === 'candidate';
    document.getElementById('company_name').required = role === 'company';
    clearAlert();
  }

  roleButtons.forEach((button) => button.addEventListener('click', () => selectRole(button.dataset.role)));
  selectRole(currentRole);

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const passwordError = passwordValidationMessage(password);
    if (passwordError) {
      showAlert(passwordError);
      document.getElementById('password').focus();
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Mật khẩu xác nhận không khớp.');
      document.getElementById('confirm_password').focus();
      return;
    }
    if (!document.getElementById('terms').checked) {
      showAlert('Bạn cần đồng ý với Điều khoản sử dụng và Chính sách bảo mật.');
      document.getElementById('terms').focus();
      return;
    }
    if (!registerForm.reportValidity()) return;

    const btn = document.getElementById('submit-btn');
    setButtonLoading(btn, true, 'Tạo tài khoản');

    try {
      const email = document.getElementById('email').value.trim();
      const commonBody = { email, password, terms_accepted: true };
      let data;

      if (currentRole === 'candidate') {
        data = await apiFetch('/auth/register/candidate', {
          method: 'POST',
          body: { ...commonBody, full_name: document.getElementById('full_name').value.trim() },
          auth: false
        });
      } else {
        data = await apiFetch('/auth/register/company', {
          method: 'POST',
          body: {
            ...commonBody,
            company_name: document.getElementById('company_name').value.trim(),
            tax_code: document.getElementById('tax_code').value.trim(),
            address: document.getElementById('address').value.trim()
          },
          auth: false
        });
      }

      setAuth(data.token, data.user, true);
      showToast(data.message, 'success');
      redirectAfterAuth(data.user.role);
    } catch (error) {
      showAlert(error.message);
      setButtonLoading(btn, false, 'Tạo tài khoản');
    }
  });
}

const forgotForm = document.getElementById('forgot-form');
if (forgotForm) {
  const historyKey = 'joblinkForgotPassword';
  const demoBox = document.getElementById('dev-reset-link');

  function showForgotForm() {
    forgotForm.hidden = false;
    clearAlert();
    setButtonLoading(document.getElementById('submit-btn'), false, 'Gửi hướng dẫn');

    demoBox.hidden = true;
    demoBox.querySelector('a').href = '#';
  }

  function showForgotComplete(state) {
    showAlert(state.message || 'JobLink đã tạo hướng dẫn đặt lại mật khẩu.', 'success');
    forgotForm.hidden = true;

    if (state.resetUrl) {
      demoBox.querySelector('a').href = state.resetUrl;
      demoBox.hidden = false;
    } else {
      demoBox.hidden = true;
      demoBox.querySelector('a').href = '#';
    }
  }

  function renderForgotStep(state) {
    if (state?.step === 'complete') {
      showForgotComplete(state);
    } else {
      showForgotForm();
    }
  }

  let forgotState = readPageHistoryState(historyKey);
  if (!forgotState || !['form', 'complete'].includes(forgotState.step)) {
    forgotState = { step: 'form' };
    writePageHistoryState(historyKey, forgotState);
  }
  renderForgotStep(forgotState);

  window.addEventListener('popstate', (event) => {
    renderForgotStep(event.state?.[historyKey]);
  });
  window.addEventListener('pageshow', () => renderForgotStep(readPageHistoryState(historyKey)));

  forgotForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();
    if (!forgotForm.reportValidity()) return;

    const btn = document.getElementById('submit-btn');
    setButtonLoading(btn, true, 'Gửi hướng dẫn');
    try {
      const email = document.getElementById('email').value.trim();
      const data = await apiFetch('/auth/forgot-password', {
        method: 'POST', body: { email }, auth: false
      });
      const completeState = {
        step: 'complete',
        message: data.message,
        resetUrl: data.reset_url || ''
      };
      writePageHistoryState(historyKey, completeState, true);
      showForgotComplete(completeState);
    } catch (error) {
      showAlert(error.message);
      setButtonLoading(btn, false, 'Gửi hướng dẫn');
    }
  });
}

const resetForm = document.getElementById('reset-form');
if (resetForm) {
  const historyKey = 'joblinkResetPassword';
  const resetComplete = document.getElementById('reset-complete');
  const token = new URLSearchParams(window.location.search).get('token');

  function showResetForm() {
    resetForm.reset();
    resetForm.hidden = false;
    resetComplete.hidden = true;
    clearAlert();
    setButtonLoading(document.getElementById('submit-btn'), false, 'Cập nhật mật khẩu');

    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (input) input.type = 'password';
      button.textContent = 'Hiện';
      button.setAttribute('aria-label', 'Hiện mật khẩu');
    });
    document.getElementById('password')?.dispatchEvent(new Event('input'));
  }

  function showResetComplete(state) {
    showAlert(state.message || 'Mật khẩu đã được cập nhật thành công.', 'success');
    resetForm.hidden = true;
    resetComplete.hidden = false;
  }

  function renderResetStep(state) {
    if (state?.step === 'complete') {
      showResetComplete(state);
    } else {
      showResetForm();
    }
  }

  if (!token) {
    showAlert('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã thiếu token.');
    resetForm.hidden = true;
  } else {
    let resetState = readPageHistoryState(historyKey);
    if (!resetState || !['form', 'complete'].includes(resetState.step)) {
      resetState = { step: 'form' };
      writePageHistoryState(historyKey, resetState);
    }
    renderResetStep(resetState);

    window.addEventListener('popstate', (event) => {
      renderResetStep(event.state?.[historyKey]);
    });
    window.addEventListener('pageshow', () => renderResetStep(readPageHistoryState(historyKey)));
  }

  resetForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();
    if (!resetForm.reportValidity()) return;

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const passwordError = passwordValidationMessage(password);
    if (passwordError) return showAlert(passwordError);
    if (password !== confirmPassword) return showAlert('Mật khẩu xác nhận không khớp.');

    const btn = document.getElementById('submit-btn');
    setButtonLoading(btn, true, 'Cập nhật mật khẩu');
    try {
      const data = await apiFetch('/auth/reset-password', {
        method: 'POST', body: { token, password }, auth: false
      });
      clearAuth();
      const completeState = { step: 'complete', message: data.message };
      writePageHistoryState(historyKey, completeState, true);
      showResetComplete(completeState);
    } catch (error) {
      showAlert(error.message);
      setButtonLoading(btn, false, 'Cập nhật mật khẩu');
    }
  });
}
