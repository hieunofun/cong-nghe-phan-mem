require('dotenv').config();

const { ensureStorageBuckets, isSupabaseStorageEnabled } = require('../services/storageService');

async function main() {
  if (!isSupabaseStorageEnabled()) {
    throw new Error('Thieu SUPABASE_URL va SUPABASE_SECRET_KEY (hoac SUPABASE_SERVICE_ROLE_KEY).');
  }
  await ensureStorageBuckets();
  console.log('Da tao/cap nhat bucket joblink-public va joblink-cv.');
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Loi cau hinh Supabase Storage:', err.message);
  process.exit(1);
});
