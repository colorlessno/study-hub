const mode = process.argv[2];
const url = "http://127.0.0.1:43103/health";

if (!['up', 'down'].includes(mode)) {
  console.error('choose mode: up or down');
  process.exit(1);
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function requestHealth() {
  const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
  const body = await response.json();
  return { status: response.status, body };
}

async function expectUp() {
  let lastError;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const result = await requestHealth();
      console.log(JSON.stringify({ expected: 'reachable', attempt, ...result }, null, 2));
      if (result.status !== 200 || result.body.ok !== true) process.exitCode = 1;
      return;
    } catch (error) {
      lastError = error;
      await wait(100);
    }
  }
  console.error(lastError);
  process.exitCode = 1;
}

async function expectDown() {
  try {
    const result = await requestHealth();
    console.log(JSON.stringify({ expected: 'not reachable while stopped', reachable: true, ...result }, null, 2));
    process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({
      expected: 'not reachable while stopped',
      reachable: false,
      reason: error instanceof Error ? error.cause?.code || error.name : 'unknown',
    }, null, 2));
  }
}

if (mode === 'up') expectUp();
else expectDown();
