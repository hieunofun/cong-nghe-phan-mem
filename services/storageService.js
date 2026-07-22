const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const PUBLIC_BUCKET = process.env.SUPABASE_PUBLIC_BUCKET || 'joblink-public';
const CV_BUCKET = process.env.SUPABASE_CV_BUCKET || 'joblink-cv';
const STORAGE_REFERENCE_PREFIX = 'supabase://';
const LOCAL_UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');

const storageConfig = {
  cv: { bucket: CV_BUCKET, folder: 'cv', public: false },
  logo: { bucket: PUBLIC_BUCKET, folder: 'logos', public: true },
  avatar: { bucket: PUBLIC_BUCKET, folder: 'avatars', public: true }
};

let supabaseClient;
let bucketsReadyPromise;

function getSupabaseSecret() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function isSupabaseStorageEnabled() {
  return Boolean(process.env.SUPABASE_URL && getSupabaseSecret());
}

function getSupabaseClient() {
  if (!isSupabaseStorageEnabled()) return null;
  if (!supabaseClient) {
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(process.env.SUPABASE_URL, getSupabaseSecret(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }
  return supabaseClient;
}

async function ensureBucket(client, name, options) {
  const { data, error } = await client.storage.getBucket(name);
  if (error && !/not found/i.test(error.message || '')) throw error;
  if (!data) {
    const created = await client.storage.createBucket(name, options);
    if (created.error) throw created.error;
    return;
  }
  const updated = await client.storage.updateBucket(name, options);
  if (updated.error) throw updated.error;
}

async function ensureStorageBuckets() {
  const client = getSupabaseClient();
  if (!client) return false;
  if (!bucketsReadyPromise) {
    bucketsReadyPromise = Promise.all([
      ensureBucket(client, PUBLIC_BUCKET, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        fileSizeLimit: '2MB'
      }),
      ensureBucket(client, CV_BUCKET, {
        public: false,
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        fileSizeLimit: '5MB'
      })
    ]).then(() => true).catch((err) => {
      bucketsReadyPromise = null;
      throw err;
    });
  }
  return bucketsReadyPromise;
}

function safeExtension(originalName) {
  const extension = path.extname(String(originalName || '')).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : '';
}

function trustedContentType(file, kind) {
  const extension = safeExtension(file.originalname);
  const types = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
  };
  const contentType = types[extension];
  if (!contentType) throw new Error('Định dạng tệp không được hỗ trợ.');

  const buffer = file.buffer;
  const isPdf = buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b
    && buffer[2] === 0x03 && buffer[3] === 0x04;
  const isPng = buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp = buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  const signatureValid = extension === '.pdf' ? isPdf
    : extension === '.docx' ? isZip
      : extension === '.png' ? isPng
        : ['.jpg', '.jpeg'].includes(extension) ? isJpeg
          : extension === '.webp' ? isWebp
            : false;
  const kindValid = kind === 'cv'
    ? ['.pdf', '.docx'].includes(extension)
    : ['.png', '.jpg', '.jpeg', '.webp'].includes(extension);
  if (!signatureValid || !kindValid) {
    throw new Error('Nội dung tệp không khớp với định dạng được phép.');
  }
  return contentType;
}

function createObjectPath(kind, file, ownerId) {
  const config = storageConfig[kind];
  if (!config) throw new Error('Loại tệp tải lên không hợp lệ.');
  const ownerSegment = String(ownerId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'anonymous';
  return `${config.folder}/${ownerSegment}/${Date.now()}-${crypto.randomUUID()}${safeExtension(file.originalname)}`;
}

function createStorageReference(bucket, objectPath) {
  return `${STORAGE_REFERENCE_PREFIX}${bucket}/${objectPath}`;
}

function parseStorageReference(value) {
  if (typeof value !== 'string' || !value.startsWith(STORAGE_REFERENCE_PREFIX)) return null;
  const remainder = value.slice(STORAGE_REFERENCE_PREFIX.length);
  const slashIndex = remainder.indexOf('/');
  if (slashIndex <= 0) return null;
  const bucket = remainder.slice(0, slashIndex);
  const objectPath = remainder.slice(slashIndex + 1);
  if (!bucket || !objectPath || objectPath.includes('..')) return null;
  return { bucket, objectPath };
}

function parsePublicStorageUrl(value) {
  if (!isSupabaseStorageEnabled() || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const marker = '/storage/v1/object/public/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const remainder = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    const slashIndex = remainder.indexOf('/');
    if (slashIndex <= 0) return null;
    return { bucket: remainder.slice(0, slashIndex), objectPath: remainder.slice(slashIndex + 1) };
  } catch (_err) {
    return null;
  }
}

async function storeUploadedFile(file, kind, ownerId) {
  if (!file?.buffer) throw new Error('Không nhận được nội dung tệp tải lên.');
  if (process.env.NODE_ENV === 'production' && !isSupabaseStorageEnabled()) {
    throw new Error('Supabase Storage chưa được cấu hình cho môi trường production.');
  }
  const config = storageConfig[kind];
  if (!config) throw new Error('Loại tệp tải lên không hợp lệ.');
  const objectPath = createObjectPath(kind, file, ownerId);
  const contentType = trustedContentType(file, kind);

  if (isSupabaseStorageEnabled()) {
    await ensureStorageBuckets();
    const client = getSupabaseClient();
    const { error } = await client.storage.from(config.bucket).upload(objectPath, file.buffer, {
      contentType,
      cacheControl: config.public ? '3600' : '0',
      upsert: false
    });
    if (error) throw error;
    if (!config.public) return createStorageReference(config.bucket, objectPath);
    const { data } = client.storage.from(config.bucket).getPublicUrl(objectPath);
    return data.publicUrl;
  }

  const localDirectory = path.resolve(LOCAL_UPLOAD_ROOT, config.folder);
  if (!localDirectory.startsWith(`${LOCAL_UPLOAD_ROOT}${path.sep}`)) {
    throw new Error('Đường dẫn lưu tệp local không an toàn.');
  }
  await fs.mkdir(localDirectory, { recursive: true });
  const filename = path.basename(objectPath);
  await fs.writeFile(path.join(localDirectory, filename), file.buffer);
  return `/uploads/${config.folder}/${filename}`;
}

async function getAccessibleFileUrl(storedValue, expiresInSeconds = 3600) {
  if (!storedValue) return null;
  const reference = parseStorageReference(storedValue);
  if (!reference) return storedValue;
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.storage
    .from(reference.bucket)
    .createSignedUrl(reference.objectPath, expiresInSeconds, { download: false });
  if (error) throw error;
  return data.signedUrl;
}

async function downloadStoredFile(storedValue) {
  const reference = parseStorageReference(storedValue);
  if (!reference) return null;
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase Storage chưa được cấu hình.');
  const { data, error } = await client.storage.from(reference.bucket).download(reference.objectPath);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

async function deleteStoredFile(storedValue) {
  if (!storedValue) return;
  const remote = parseStorageReference(storedValue) || parsePublicStorageUrl(storedValue);
  if (remote) {
    const client = getSupabaseClient();
    if (!client) return;
    const { error } = await client.storage.from(remote.bucket).remove([remote.objectPath]);
    if (error) throw error;
    return;
  }

  if (typeof storedValue === 'string' && storedValue.startsWith('/uploads/')) {
    const relativePath = storedValue.replace(/^\/uploads\//, '');
    const filePath = path.resolve(LOCAL_UPLOAD_ROOT, relativePath);
    if (!filePath.startsWith(`${LOCAL_UPLOAD_ROOT}${path.sep}`)) return;
    await fs.unlink(filePath).catch((err) => {
      if (err.code !== 'ENOENT') throw err;
    });
  }
}

function storedFileExtension(storedValue) {
  const reference = parseStorageReference(storedValue);
  const target = reference ? reference.objectPath : String(storedValue || '').split('?')[0];
  return path.extname(target).toLowerCase();
}

async function withAccessibleCVUrl(record) {
  if (!record) return record;
  return { ...record, cv_url: await getAccessibleFileUrl(record.cv_url) };
}

async function withAccessibleCVUrls(records) {
  return Promise.all((records || []).map(withAccessibleCVUrl));
}

module.exports = {
  deleteStoredFile,
  downloadStoredFile,
  ensureStorageBuckets,
  getAccessibleFileUrl,
  isSupabaseStorageEnabled,
  storeUploadedFile,
  storedFileExtension,
  withAccessibleCVUrl,
  withAccessibleCVUrls
};
