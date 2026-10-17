import { openDB } from 'idb';
import { initialState, validateBackup } from './domain';
import type { LearningState, Pack, PackMeta } from './types';

const db = openDB('crorepati-revision', 1, { upgrade(database) {
  database.createObjectStore('state');
  database.createObjectStore('packs', { keyPath: 'id' });
  database.createObjectStore('downloads', { keyPath: 'id' });
  database.createObjectStore('partials');
} });
export async function loadState(): Promise<LearningState> {
  const value = await (await db).get('state', 'learner');
  if (value && !validateBackup(value)) throw new Error('Stored progress is not valid. Export browser data before resetting.');
  return value ?? initialState();
}
export async function saveState(state: LearningState) { await (await db).put('state', state, 'learner'); }
export async function downloadedPacks(): Promise<(Pack & { sha256: string })[]> { return (await db).getAll('packs'); }
export async function deletePack(id: string) {
  const database = await db;
  const tx = database.transaction(['packs', 'downloads', 'partials'], 'readwrite');
  await Promise.all([tx.objectStore('packs').delete(id), tx.objectStore('downloads').delete(id), tx.objectStore('partials').delete(id)]); await tx.done;
}
export async function sha256(buffer: ArrayBuffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
export async function downloadPack(meta: PackMeta, signal: AbortSignal, onProgress: (n: number) => void): Promise<Pack> {
  const database = await db;
  let partial = await database.get('partials', meta.id) as { hash: string; bytes: Uint8Array } | undefined;
  if (partial?.hash !== meta.sha256) partial = undefined;
  const offset = partial?.bytes.length ?? 0;
  const response = await fetch(meta.url, { signal, headers: offset ? { Range: `bytes=${offset}-` } : {} });
  if (!response.ok) throw new Error(`Download failed (${response.status}). Retry when connected.`);
  const resume = response.status === 206 && response.headers.get('content-range')?.startsWith(`bytes ${offset}-`);
  const chunks: Uint8Array[] = resume && partial ? [partial.bytes] : [];
  let size = resume ? offset : 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Streaming downloads are not supported by this browser.');
  const join = () => { const bytes = new Uint8Array(size); let position = 0; for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.length; } return bytes; };
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      chunks.push(value); size += value.length;
      if (size > meta.size + 1024) throw new Error('Pack exceeds its declared size.');
      onProgress(Math.min(99, Math.round(size / meta.size * 100)));
    }
  } catch (error) { await database.put('partials', { hash: meta.sha256, bytes: join() }, meta.id); throw error; }
  const bytes = join();
  if (size !== meta.size || await sha256(bytes.buffer) !== meta.sha256) { await database.delete('partials', meta.id); throw new Error('Integrity check failed. No content installed. Please retry.'); }
  const pack = JSON.parse(new TextDecoder().decode(bytes)) as Pack;
  if (pack.id !== meta.id || !Array.isArray(pack.questions) || pack.questions.length !== meta.questionCount || !Array.isArray(pack.factCards) || !Array.isArray(pack.sources) || pack.questions.some(q => !q.id || !q.question?.en || !q.question?.hi || q.options?.length !== 4 || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3 || !q.factCardIds?.length || q.factCardIds.some(id => !pack.factCards.some(f => f.id === id)))) throw new Error('Pack schema mismatch.');
  const tx = database.transaction(['packs', 'downloads', 'partials'], 'readwrite');
  await tx.objectStore('packs').put({ ...pack, sha256: meta.sha256 });
  await tx.objectStore('downloads').put({ ...meta, installedAt: Date.now() });
  await tx.objectStore('partials').delete(meta.id); await tx.done;
  onProgress(100); return pack;
}
export async function saveVideo(url: string, expectedHash: string, expectedSize: number) {
  const response = await fetch(url); if (!response.ok) throw new Error('Video download failed.');
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== expectedSize || await sha256(buffer) !== expectedHash) throw new Error('Video integrity failed.');
  await (await caches.open('cr-selected-videos')).put(url, new Response(buffer, { headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(buffer.byteLength) } }));
}
