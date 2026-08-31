const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
console.log(JSON.stringify({ input: Buffer.concat(chunks).toString('utf8').trim() }));
