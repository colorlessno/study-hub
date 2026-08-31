import { readOption } from './args.mjs';

const dependencyUrl = readOption('dependency-url');
const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk);
}

try {
  const text = Buffer.concat(chunks).toString('utf8');
  const input = text ? JSON.parse(text) : {};
  let dependency = null;
  if (dependencyUrl) {
    const response = await fetch(dependencyUrl);
    dependency = await response.json();
  }
  console.log(JSON.stringify({
    message: '疑似コマンドを実行しました。',
    received: input,
    dependency
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : '処理に失敗しました。');
  process.exitCode = 1;
}
