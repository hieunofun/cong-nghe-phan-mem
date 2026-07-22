const fs = require('fs');
const vm = require('vm');

const elements = new Map();
const classList = () => ({ add() {}, remove() {}, toggle() {} });
function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id,
      innerHTML: '',
      textContent: '',
      style: {},
      dataset: {},
      className: '',
      classList: classList(),
      hidden: false,
      checked: false,
      disabled: false,
      src: '',
      addEventListener() {},
      querySelector() { return element('close'); },
      removeAttribute(name) { delete this[name]; },
      focus() {}
    });
  }
  return elements.get(id);
}

const plans = [
  { id: 1, name: 'Miễn phí', code: 'free', price: 0, duration_days: 30, max_job_posts: 3, max_vip_posts: 0, can_search_cv: 0, max_cv_views: 0, description: 'Free' },
  { id: 2, name: 'Basic', code: 'basic', price: 1500000, duration_days: 30, max_job_posts: 10, max_vip_posts: 2, can_search_cv: 1, max_cv_views: 10, description: 'Basic' },
  { id: 3, name: 'Pro', code: 'pro', price: 3500000, duration_days: 30, max_job_posts: 30, max_vip_posts: 10, can_search_cv: 1, max_cv_views: 50, description: 'Pro' }
];
const config = { terms_version: '2026-07-21', privacy_version: '2026-07-21' };
const payment = {
  payment_id: 99,
  transaction_code: 'JLTEST99',
  status: 'pending',
  amount: 3500000,
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  package: { id: 3, name: 'Pro', code: 'pro', duration_days: 30 },
  bank_info: {
    bank: 'Vietcombank',
    branch: 'Chi nhánh kiểm thử',
    account_number: '0123456789',
    account_name: 'NGUYEN VAN TEST',
    amount: 3500000,
    content: 'JOBLINK JLTEST99',
    qr_url: 'https://img.vietqr.io/test.png'
  }
};

let currentUser = null;
let currentToken = null;
let purchaseBody = null;
const context = {
  window: {
    location: { hash: '', search: '', href: 'http://localhost:3000/packages.html' },
    requestAnimationFrame: callback => callback(),
    scrollTo() {},
    history: { replaceState() {} },
    addEventListener() {},
    setInterval: () => 1,
    clearInterval() {},
    setTimeout
  },
  document: {
    body: { classList: classList(), appendChild() {} },
    getElementById: element,
    querySelector: selector => selector === '.qr-caption' ? element('caption') : element('query'),
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => element('created'),
    execCommand: () => true
  },
  navigator: { clipboard: { writeText: async () => {} } },
  getUser: () => currentUser,
  getToken: () => currentToken,
  apiFetch: async (path, options = {}) => {
    if (path === '/payments/packages') return plans;
    if (path === '/payments/checkout-config') return config;
    if (path === '/payments/subscription') return null;
    if (path === '/payments/purchase') {
      purchaseBody = options.body;
      return payment;
    }
    if (path === '/payments/99') return payment;
    throw new Error(`Unexpected API path: ${path}`);
  },
  escapeHtml: value => String(value),
  showToast() {},
  console,
  setTimeout,
  clearTimeout,
  URL,
  URLSearchParams,
  Promise
};

vm.createContext(context);
vm.runInContext(fs.readFileSync('public/js/packages.js', 'utf8'), context);

(async () => {
  await new Promise(resolve => setTimeout(resolve, 40));
  const pricingHtml = element('pricing-grid').innerHTML;
  if (!pricingHtml.includes('1,5 triệu') || pricingHtml.includes('Thanh toán Demo')) {
    throw new Error(`Pricing render failed:\n${pricingHtml}`);
  }

  currentUser = { role: 'company' };
  currentToken = 'token';
  vm.runInContext('openPurchaseModal(3)', context);
  if (element('checkout-review').hidden || !element('confirm-btn').disabled) {
    throw new Error('Terms gate failed.');
  }

  element('checkout-terms').checked = true;
  await vm.runInContext('confirmPurchase()', context);
  if (!purchaseBody?.terms_accepted || purchaseBody.payment_method !== 'bank_transfer') {
    throw new Error('Purchase payload failed.');
  }
  if (
    element('checkout-payment').hidden ||
    element('payment-qr').src !== payment.bank_info.qr_url ||
    element('payment-content').textContent !== 'JOBLINK JLTEST99'
  ) {
    throw new Error('Payment instruction render failed.');
  }

  console.log('Checkout render test passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
