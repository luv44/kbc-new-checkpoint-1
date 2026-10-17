import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const norm = (value) => String(value ?? '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export const words = (value) => new Set((String(value ?? '').toLowerCase().match(/[a-z0-9]{3,}/g) || []));
export const hasDevanagari = (value) => /[\u0900-\u097f]/.test(String(value ?? ''));
export const truncate = (value, max) => {
  const text = String(value ?? '').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
};

export function jaccard(a, b) {
  const left = words(a);
  const right = words(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / (left.size + right.size - shared);
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}

export function readJsonAuto(file, fallback = null) {
  if (fs.existsSync(`${file}.gz`)) {
    try {
      return JSON.parse(zlib.gunzipSync(fs.readFileSync(`${file}.gz`)).toString('utf8'));
    } catch {
      return fallback;
    }
  }
  return readJson(file, fallback);
}

export function writeJson(file, value, { pretty = false } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
  fs.writeFileSync(`${file}.tmp`, `${body}\n`, 'utf8');
  fs.renameSync(`${file}.tmp`, file);
}

export function writeJsonGz(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, zlib.gzipSync(JSON.stringify(value), { level: 9 }));
  fs.renameSync(`${file}.tmp`, file);
}

export const hashId = (value, length = 16) => crypto.createHash('md5').update(String(value)).digest('hex').slice(0, length);
export const sha256File = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shuffle(rng, list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickSimilarLength(pool, targetLength, count, rng, avoid = new Set()) {
  const candidates = pool.filter((item) => {
    const key = norm(item.en ?? item);
    return key && !avoid.has(key);
  });
  return candidates
    .map((item) => ({ item, distance: Math.abs(String(item.en ?? item).length - targetLength) + rng() * 6 }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((entry) => entry.item);
}

/** "English / हिंदी" → [english, hindi]; falls back to [text, text]. */
export function splitBilingual(line) {
  const text = String(line ?? '').trim();
  const parts = text.split(/\s+\/\s+/);
  if (parts.length < 2) return [text, text];
  for (let index = 1; index < parts.length; index += 1) {
    const left = parts.slice(0, index).join(' / ');
    const right = parts.slice(index).join(' / ');
    if (hasDevanagari(right) && !hasDevanagari(left)) return [left.trim(), right.trim()];
  }
  return [parts[0].trim(), parts.slice(1).join(' / ').trim()];
}

/** Strip leading numbering ("5.", "1)") that catalogue concepts sometimes keep. */
export function cleanConcept(text) {
  return String(text ?? '').replace(/^\s*\d+[.)]\s*/, '').trim();
}
