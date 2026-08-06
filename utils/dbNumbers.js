function safeDbNumber(row, key) {
  const value = Number(row?.[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

module.exports = { safeDbNumber };
