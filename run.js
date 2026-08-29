#!/usr/bin/env node
/**
 * Runs gold_commerce (:3000) and gold_wallet (:3001) side by side.
 *
 * No dependencies -- Node built-ins only, so there is nothing to install.
 *
 *   node run.js            # npm run dev in both apps
 *   node run.js build      # npm run build in both apps
 *   node run.js start      # npm run start in both apps
 *   node run.js dev wallet # only gold_wallet
 */

const { spawn } = require("node:child_process");
const path = require("node:path");

const APPS = [
  { name: "commerce", dir: "gold_commerce", color: "\x1b[33m" }, // yellow
  { name: "wallet", dir: "gold_wallet", color: "\x1b[36m" }, // cyan
];

const RESET = "\x1b[0m";
const GRAY = "\x1b[90m";
const isWindows = process.platform === "win32";

const [scriptArg, ...filters] = process.argv.slice(2);
const script = scriptArg || "dev";

// npm.cmd needs shell:true on Windows, so keep the script name to plain
// package.json-script characters rather than concatenating anything into a shell.
if (!/^[a-zA-Z0-9:_-]+$/.test(script)) {
  console.error(`Invalid script name: ${script}`);
  process.exit(1);
}

const selected = filters.length
  ? APPS.filter((app) => filters.some((f) => app.name.includes(f) || app.dir.includes(f)))
  : APPS;

if (!selected.length) {
  console.error(`No app matches ${filters.join(", ")}. Known: ${APPS.map((a) => a.name).join(", ")}`);
  process.exit(1);
}

const width = Math.max(...selected.map((a) => a.name.length));
const children = [];
let shuttingDown = false;
let running = selected.length;
let worstCode = 0;

// dev/start stay up forever, so one dying means the pair is broken -- stop both.
// build/lint are one-shot: let each finish and report the worst exit code.
const longRunning = script === "dev" || script === "start";

/** Prefix every line of a chunk with the app name so both logs stay readable. */
function pipe(stream, app, target) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      target.write(`${app.color}${app.name.padEnd(width)}${RESET} ${GRAY}|${RESET} ${line}\n`);
    }
  });
  stream.on("end", () => {
    if (buffer) target.write(`${app.color}${app.name.padEnd(width)}${RESET} ${GRAY}|${RESET} ${buffer}\n`);
  });
}

function start(app) {
  const cwd = path.join(__dirname, app.dir);
  const child = spawn("npm", ["run", script], {
    cwd,
    shell: isWindows, // npm is npm.cmd on Windows and needs a shell to resolve
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  pipe(child.stdout, app, process.stdout);
  pipe(child.stderr, app, process.stderr);

  child.on("error", (err) => {
    console.error(`${app.color}${app.name}${RESET} failed to start: ${err.message}`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    running -= 1;
    if (code) worstCode = code;

    if (longRunning) {
      console.log(`${app.color}${app.name}${RESET} exited (${signal || `code ${code}`}) -- stopping the other app too.`);
      shutdown(code ?? 1);
      return;
    }

    console.log(`${app.color}${app.name}${RESET} finished (${signal || `code ${code}`}).`);
    if (running === 0) process.exit(worstCode);
  });

  children.push(child);
  console.log(`${app.color}${app.name.padEnd(width)}${RESET} ${GRAY}|${RESET} npm run ${script} (${app.dir})`);
}

function kill(child) {
  if (child.exitCode !== null || child.signalCode) return;
  if (isWindows) {
    // npm spawns next as a grandchild; /T kills the whole tree.
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) kill(child);
  setTimeout(() => process.exit(code), 300).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

selected.forEach(start);
