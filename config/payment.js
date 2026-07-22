const PAYMENT_TERMS_VERSION = '2026-07-21';
const PRIVACY_VERSION = '2026-07-21';
const PAYMENT_WINDOW_HOURS = 24;

const BANK = Object.freeze({
  id: process.env.PAYMENT_BANK_ID || '',
  name: process.env.PAYMENT_BANK_NAME || '',
  accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER || '',
  accountName: process.env.PAYMENT_ACCOUNT_NAME || '',
  branch: process.env.PAYMENT_BANK_BRANCH || '',
  qrTemplate: process.env.PAYMENT_QR_TEMPLATE || 'compact2'
});

function isBankConfigured() {
  return Boolean(BANK.id && BANK.name && BANK.accountNumber && BANK.accountName);
}

function transferContent(transactionCode) {
  return `JOBLINK ${transactionCode}`;
}

function qrUrl({ amount, transactionCode }) {
  const content = transferContent(transactionCode);
  const query = new URLSearchParams({
    amount: String(amount),
    addInfo: content,
    accountName: BANK.accountName
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(BANK.id)}-${encodeURIComponent(BANK.accountNumber)}-${encodeURIComponent(BANK.qrTemplate)}.png?${query}`;
}

function bankTransferInfo({ amount, transactionCode }) {
  if (!isBankConfigured()) {
    throw new Error('Chưa cấu hình tài khoản ngân hàng nhận thanh toán.');
  }
  return {
    bank_id: BANK.id,
    bank: BANK.name,
    branch: BANK.branch,
    account_number: BANK.accountNumber,
    account_name: BANK.accountName,
    amount,
    content: transferContent(transactionCode),
    qr_url: qrUrl({ amount, transactionCode })
  };
}

module.exports = {
  BANK,
  PAYMENT_TERMS_VERSION,
  PRIVACY_VERSION,
  PAYMENT_WINDOW_HOURS,
  isBankConfigured,
  bankTransferInfo
};
