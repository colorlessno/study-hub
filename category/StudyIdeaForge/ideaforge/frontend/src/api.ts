export async function j(method: string, url: string, body?: any) {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function streamLLM(
  body: any,
  onChunk: (t: string) => void,
  signal?: AbortSignal
) {
  const r = await fetch('/api/llm/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok || !r.body) throw new Error(await r.text());
  const rd = r.body.getReader();
  const dec = new TextDecoder();
  while (true) {
    const { done, value } = await rd.read();
    if (done) break;
    onChunk(dec.decode(value, { stream: true }));
  }
}

export function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
