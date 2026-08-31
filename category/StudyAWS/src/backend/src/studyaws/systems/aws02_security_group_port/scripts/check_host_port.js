const mode = process.argv[2];
const targets = {
  public: { url: "http://127.0.0.1:43102/", expectedReachable: true },
  "private-api": { url: "http://127.0.0.1:5102/", expectedReachable: false },
  "private-database": { url: "http://127.0.0.1:54322/", expectedReachable: false },
};

if (!(mode in targets)) {
  console.error("choose mode: public, private-api, or private-database");
  process.exit(1);
}

async function main() {
  const target = targets[mode];
  try {
    const response = await fetch(target.url, { signal: AbortSignal.timeout(2000) });
    const body = await response.text();
    const result = { mode, url: target.url, reachable: true, status: response.status, body };
    console.log(JSON.stringify(result, null, 2));
    if (!target.expectedReachable) {
      console.error("ホストへ公開していない内部サービスへ接続できてしまいました");
      process.exitCode = 1;
    }
  } catch (error) {
    const result = {
      mode,
      url: target.url,
      reachable: false,
      expected: target.expectedReachable ? "reachable" : "not reachable from host",
      reason: error instanceof Error ? error.cause?.code || error.name : "unknown",
    };
    console.log(JSON.stringify(result, null, 2));
    if (target.expectedReachable) process.exitCode = 1;
  }
}

main();
