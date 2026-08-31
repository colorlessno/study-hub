export const FILE_SIZE_LIMIT = 1024 * 1024;

const sampleFiles = {
  valid: {
    name: 'sample-small.pdf',
    size: 3072,
    type: 'application/pdf'
  },
  'invalid-type': {
    name: 'sample-document.txt',
    size: 1200,
    type: 'text/plain'
  },
  'too-large': {
    name: 'sample-large.pdf',
    size: FILE_SIZE_LIMIT + 1,
    type: 'application/pdf'
  }
};

export function getSampleFileMetadata(sampleId) {
  const sample = sampleFiles[sampleId];
  if (!sample) throw new Error(`不明な確認データです: ${sampleId}`);
  return { ...sample };
}

export function validateFileMetadata(file) {
  const name = String(file?.name ?? '');
  const size = Number(file?.size ?? 0);
  const type = String(file?.type ?? '');
  const errors = [];

  if (!name.toLowerCase().endsWith('.pdf')) {
    errors.push('ファイル名の拡張子が「.pdf」ではありません。');
  }
  if (type && type !== 'application/pdf') {
    errors.push(`ブラウザが通知した種類がPDFではありません: ${type}`);
  }
  if (size > FILE_SIZE_LIMIT) {
    errors.push('この教材の上限である1MiBを超えています。');
  }

  return { name, size, type, errors };
}

export function formatFileSize(size) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MiB（${size.toLocaleString('ja-JP')}バイト）`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} KiB（${size.toLocaleString('ja-JP')}バイト）`;
  }
  return `${size.toLocaleString('ja-JP')}バイト`;
}
