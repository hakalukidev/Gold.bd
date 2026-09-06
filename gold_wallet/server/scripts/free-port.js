#!/usr/bin/env node
/**
 * Prestart guard: kills any stale process already bound to our PORT before
 * the server tries to listen. Protects against EADDRINUSE from a previous
 * run that was force-stopped (terminal closed, killed background task, hard
 * crash) and never got to run the SIGINT/SIGTERM handler in src/index.js.
 *
 * Safety: only kills processes that are actually `node`, and only reports/acts
 * on the exact port we're about to use — it never touches unrelated services.
 */
const { execSync } = require("child_process");

const PORT = process.env.PORT || 5000;

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

function freePortWindows(port) {
  const out = run(`netstat -ano -p tcp`);
  const pids = new Set();
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*TCP\s+\S*[:.](\d+)\s+\S+\s+LISTENING\s+(\d+)/i);
    if (m && Number(m[1]) === Number(port)) pids.add(m[2]);
  }
  for (const pid of pids) {
    const info = run(`tasklist /fi "PID eq ${pid}" /fo csv /nh`);
    if (!/^"node\.exe"/i.test(info.trim())) {
      console.warn(`[free-port] port ${port} is held by PID ${pid} (not node) — leaving it alone`);
      continue;
    }
    console.log(`[free-port] killing stale node process PID ${pid} on port ${port}`);
    run(`taskkill /PID ${pid} /F`);
  }
}

function freePortPosix(port) {
  const out = run(`lsof -ti tcp:${port}`);
  const pids = out.split("\n").map((s) => s.trim()).filter(Boolean);
  for (const pid of pids) {
    const info = run(`ps -o comm= -p ${pid}`).trim();
    if (!/node/i.test(info)) {
      console.warn(`[free-port] port ${port} is held by PID ${pid} (${info || "unknown"}) — leaving it alone`);
      continue;
    }
    console.log(`[free-port] killing stale node process PID ${pid} on port ${port}`);
    run(`kill -9 ${pid}`);
  }
}

if (process.platform === "win32") {
  freePortWindows(PORT);
} else {
  freePortPosix(PORT);
}
