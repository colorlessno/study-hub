import fs from 'node:fs';
import path from 'node:path';

const root = process.env.STUDYHUB_TEST_TEMP_ROOT;
const action = process.argv[2];

if (!root) {
  console.error('一時フォルダが設定されていません。');
  process.exitCode = 1;
} else {
  const marker = path.join(root, 'marker.txt');
  if (action === 'write') {
    fs.writeFileSync(marker, 'temporary', 'utf8');
    console.log(JSON.stringify({ root, markerCreated: true }));
  } else if (action === 'check') {
    const markerExists = fs.existsSync(marker);
    console.log(JSON.stringify({ root, markerExists }));
    if (!markerExists) process.exitCode = 1;
  } else {
    console.error('不明な操作です。');
    process.exitCode = 1;
  }
}
