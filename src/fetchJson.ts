/**
 * Large packs are published as plain `.json` and as `.json.gz`. Static servers
 * either send the raw gzip bytes or inflate them because of the `.gz`
 * extension; handle both, then fall back to the plain file when needed.
 */
export async function fetchJson<T>(url: string): Promise<T> {
  try {
    const response = await fetch(`${url}.gz`);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
      if (!isGzip) return JSON.parse(new TextDecoder().decode(buffer)) as T;
      if (typeof DecompressionStream !== 'undefined') {
        const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
        return (await new Response(stream).json()) as T;
      }
    }
  } catch {
    // fall through to the plain JSON below
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} unavailable (${response.status})`);
  return (await response.json()) as T;
}
