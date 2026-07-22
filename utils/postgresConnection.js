const SSL_QUERY_PARAMETERS = ['sslmode', 'sslcert', 'sslkey', 'sslrootcert'];

function removeConnectionStringSslOptions(connectionString) {
  if (!connectionString) return connectionString;

  try {
    const parsed = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) return connectionString;

    let changed = false;
    for (const parameter of SSL_QUERY_PARAMETERS) {
      if (parsed.searchParams.has(parameter)) {
        parsed.searchParams.delete(parameter);
        changed = true;
      }
    }

    return changed ? parsed.toString() : connectionString;
  } catch (_error) {
    return connectionString;
  }
}

module.exports = { removeConnectionStringSslOptions };
