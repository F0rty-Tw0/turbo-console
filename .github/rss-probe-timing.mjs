// Throwaway: times the RSS probe that rss-probe.ts runs, 100 times in a row against a live child, on this runner.
import { execFile, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SAMPLES = 100;
const INTERVAL_MS = { linux: 100, darwin: 250, win32: 500 }[process.platform];

const target = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
const pid = target.pid;

const run = (file, args) =>
  new Promise((resolve) => {
    execFile(file, args, { encoding: 'utf8', timeout: 2000, maxBuffer: 64 * 1024, windowsHide: true }, (error, stdout) =>
      resolve(error === null ? stdout : `ERROR ${error.message}`)
    );
  });

const probe = () => {
  if (process.platform === 'darwin') return run('/bin/ps', ['-o', 'rss=', '-p', String(pid)]);
  if (process.platform === 'win32') {
    const tasklist = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tasklist.exe');

    return run(tasklist, ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH']);
  }

  return readFile(`/proc/${pid}/status`, 'utf8');
};

await new Promise((resolve) => setTimeout(resolve, 500));

const times = [];
let lastOutput = '';

for (let index = 0; index < SAMPLES; index += 1) {
  const start = process.hrtime.bigint();

  lastOutput = await probe();
  times.push(Number(process.hrtime.bigint() - start) / 1e6);
}

target.kill();

const cold = times[0];
const sorted = times.slice(1).sort((a, b) => a - b);
const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const median = at(0.5);
const share = ((median / INTERVAL_MS) * 100).toFixed(1);

console.log(`probe-output ${JSON.stringify(lastOutput.trim().split('\n')[0])}`);
console.log(
  `rss-probe-timing ${process.platform} cold=${cold.toFixed(1)}ms median=${median.toFixed(1)}ms ` +
    `p95=${at(0.95).toFixed(1)}ms max=${sorted.at(-1).toFixed(1)}ms interval=${INTERVAL_MS}ms busy=${share}%`
);
