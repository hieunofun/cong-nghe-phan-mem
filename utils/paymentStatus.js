function effectivePaymentStatus(payment, now = Date.now()) {
  if (
    payment?.status === 'pending'
    && payment.expires_at
    && new Date(payment.expires_at).getTime() <= now
  ) {
    return 'expired';
  }
  return payment?.status;
}

function withEffectivePaymentStatus(payment, now = Date.now()) {
  return {
    ...payment,
    status: effectivePaymentStatus(payment, now)
  };
}

module.exports = { effectivePaymentStatus, withEffectivePaymentStatus };
