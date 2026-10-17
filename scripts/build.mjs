#!/usr/bin/env node
/** Production client build (run after `tsc -b`). */
import { spawnSync } from 'node:child_process';
const result = spawnSync('npx', ['vite', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
