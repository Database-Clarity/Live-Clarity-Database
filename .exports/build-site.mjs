// packages/export/src/site/build-site.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync2, mkdtempSync, readdirSync, readFileSync as readFileSync5, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as join3 } from "node:path";
import { fileURLToPath, pathToFileURL as pathToFileURL3 } from "node:url";

// packages/export/src/site/pages.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
async function api(path, token) {
  let last;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
        headers: { authorization: `Bearer ${token}` }
      });
      const body = await response.json();
      if (!response.ok || !body.success)
        throw new Error(
          `Pages API ${response.status}: ${JSON.stringify(body.errors ?? null).slice(0, 300)}`
        );
      return body.result;
    } catch (error) {
      last = error;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
function checkDeploymentUrl(url, project) {
  const parsed = new URL(url);
  const host = parsed.hostname;
  if (parsed.protocol !== "https:" || !(host === `${project}.pages.dev` || host.endsWith(`.${project}.pages.dev`)))
    throw new Error(`Unexpected deployment URL ${url}`);
  return `${parsed.origin}/`;
}
async function locatePages(accountId, project, token) {
  if (!/^[0-9a-f]{32}$/.test(accountId) || !/^[a-z0-9-]{1,58}$/.test(project))
    throw new Error("Bad account id or project name");
  const base = `/accounts/${accountId}/pages/projects/${project}`;
  const deployments = await api(
    `${base}/deployments?env=production&per_page=1`,
    token
  );
  const info = await api(base, token);
  const canonical = info.canonical_deployment;
  if (!deployments.length && !canonical) return { zeroDeployments: true, deployment: null };
  if (!canonical?.id || !canonical.url)
    throw new Error("The Pages project has deployments but no served deployment");
  return {
    zeroDeployments: false,
    deployment: { id: canonical.id, url: checkDeploymentUrl(canonical.url, project) }
  };
}
function locateSim(dir) {
  const canonicalPath = join(dir, "canonical");
  if (!existsSync(canonicalPath)) {
    if (existsSync(join(dir, "deployments")))
      throw new Error("Simulated Pages has deployments but no served one");
    return { zeroDeployments: true, deployment: null };
  }
  const id = readFileSync(canonicalPath, "utf8").trim();
  if (!/^[0-9]{1,6}$/.test(id)) throw new Error("Bad simulated deployment id");
  return {
    zeroDeployments: false,
    deployment: { id, url: pathToFileURL(join(dir, "deployments", id)).href + "/" }
  };
}

// packages/export/src/site/pins.ts
import { existsSync as existsSync2, readFileSync as readFileSync3 } from "node:fs";
import { join as join2 } from "node:path";

// packages/export/src/site/util.ts
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync as readFileSync2, writeFileSync } from "node:fs";
import { dirname } from "node:path";
var sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
var isSha = (value) => typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
function gitBytes(cwd, args, input) {
  return execFileSync("git", args, {
    cwd,
    input,
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" }
  });
}
var git = (cwd, args, input) => gitBytes(cwd, args, input).toString("utf8").trim();
function gitShow(cwd, commit, path) {
  if (!isSha(commit)) throw new Error(`Not a commit id: ${commit}`);
  try {
    gitBytes(cwd, ["cat-file", "-e", `${commit}:${path}`]);
  } catch {
    return void 0;
  }
  return gitBytes(cwd, ["cat-file", "blob", `${commit}:${path}`]);
}
function ensureCommit(cwd, commit) {
  if (!isSha(commit)) throw new Error(`Not a commit id: ${commit}`);
  try {
    gitBytes(cwd, ["cat-file", "-e", `${commit}^{commit}`]);
  } catch {
    gitBytes(cwd, ["fetch", "--no-tags", "--quiet", "origin", commit]);
  }
}
function isAncestor(cwd, ancestor, descendant) {
  try {
    gitBytes(cwd, ["merge-base", "--is-ancestor", ancestor, descendant]);
    return true;
  } catch (error) {
    if (error.status === 1) return false;
    throw error;
  }
}
function writeFile(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}
var readJson = (path) => JSON.parse(readFileSync2(path, "utf8"));
var json = (value) => JSON.stringify(value, null, 2) + "\n";
function parseArgs(argv) {
  const options = {};
  let command;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      const value = argv[index + 1];
      if (value === void 0 || value.startsWith("--")) options[arg.slice(2)] = "true";
      else {
        options[arg.slice(2)] = value;
        index += 1;
      }
    } else if (command === void 0) command = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return { command, options };
}
function required(options, name) {
  const value = options[name];
  if (!value || value === "true") throw new Error(`--${name} is required`);
  return value;
}
function intOption(options, name, fallback) {
  const value = options[name];
  if (value === void 0) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`--${name} must be an integer`);
  return number;
}
async function fetchBytes(url, tries = 3) {
  if (url.startsWith("file:")) return readFileSync2(new URL(url));
  let last;
  for (let attempt = 0; attempt < tries; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { "cache-control": "no-cache", pragma: "no-cache" }
      });
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      last = error;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
function stepSummary(markdown) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (path) writeFileSync(path, markdown + "\n", { flag: "a" });
}

// packages/export/src/site/pins.ts
var pinIdPattern = /^[0-9a-f]{40}-[0-9]{1,20}-[0-9]{1,6}$/;
var isPinId = (value) => typeof value === "string" && pinIdPattern.test(value);
function checkPin(value, where) {
  const pin = value;
  const ok = pin && typeof pin === "object" && isPinId(pin.pinId) && isSha(pin.converterSha) && pin.pinId.startsWith(pin.converterSha) && /^[0-9a-f]{64}$/.test(pin.inputSha256) && typeof pin.manifestVersion === "string" && Array.isArray(pin.hashes) && pin.hashes.every((hash) => Number.isSafeInteger(hash)) && typeof pin.engine === "string" && isSha(pin.generatorSha) && (pin.liveCommit === void 0 || isSha(pin.liveCommit)) && Array.isArray(pin.files) && pin.files.every(
    (file) => /^[A-Za-z0-9]+\.json$/.test(file.name) && /^[0-9a-f]{64}$/.test(file.sha256) && ["built", "carried", "frozen"].includes(file.outcome) && isSha(file.sourceConverterSha)
  );
  if (!ok) throw new Error(`Malformed pin ${where}`);
  return pin;
}
function parseDeployMessage(message) {
  const trailer = /^Export-Converter: ([0-9a-f]{40})$/m.exec(message)?.[1];
  const pinId = /^Export-Pin: (\S+)$/m.exec(message)?.[1];
  const subject = /^Deploying to live from @ \S+@([0-9a-f]{40}) /.exec(message)?.[1];
  const converterSha = trailer ?? subject;
  if (!converterSha) return void 0;
  return isPinId(pinId) ? { converterSha, pinId } : { converterSha };
}
function lastDeploy(liveDir, head) {
  const log = git(liveDir, ["log", "--first-parent", "-n", "500", "--format=%H%x00%B%x1e", head]);
  for (const record of log.split("")) {
    const [commit, message] = record.replace(/^\s+/, "").split("\0");
    if (!commit || message === void 0) continue;
    const parsed = parseDeployMessage(message);
    if (parsed) return { commit, ...parsed };
  }
  return void 0;
}
var readPin = (pinsDir, path) => {
  const full = join2(pinsDir, path);
  if (!existsSync2(full)) return void 0;
  return checkPin(JSON.parse(readFileSync3(full, "utf8")), path);
};
var pinPaths = {
  pending: (pinId) => `pending/${pinId}.json`,
  promoted: (liveCommit) => `pins/${liveCommit}.json`,
  latest: "pins/latest.json"
};
function effectivePin(pinsDir, liveDir, liveHead) {
  const latest = readPin(pinsDir, pinPaths.latest);
  if (latest) {
    if (!latest.liveCommit) throw new Error("pins/latest.json has no liveCommit");
    if (!isAncestor(liveDir, latest.liveCommit, liveHead))
      throw new Error(`pins/latest.json (${latest.liveCommit}) is not on live`);
  }
  const landed = lastDeploy(liveDir, liveHead);
  if (landed?.pinId) {
    const promoted = readPin(pinsDir, pinPaths.promoted(landed.commit));
    if (promoted) {
      if (promoted.pinId !== landed.pinId || promoted.liveCommit !== landed.commit)
        throw new Error(`pins/${landed.commit}.json does not match the live commit`);
      const pin = promoted;
      const advanceLatest = latest?.liveCommit !== landed.commit;
      return {
        pin,
        source: "promoted",
        promote: advanceLatest ? { pin, advanceLatest } : void 0
      };
    }
    const pending = readPin(pinsDir, pinPaths.pending(landed.pinId));
    if (pending && (!latest || latest.liveCommit !== landed.commit)) {
      if (pending.liveCommit !== void 0) throw new Error("A pending pin has a liveCommit");
      verifyAgainstLive(liveDir, landed.commit, pending);
      const pin = { ...pending, liveCommit: landed.commit };
      return { pin, source: "pending", promote: { pin, advanceLatest: true } };
    }
  }
  if (!latest) return void 0;
  return { pin: latest, source: "promoted" };
}
function verifyAgainstLive(liveDir, liveCommit, pin) {
  for (const file of pin.files) {
    const bytes = gitShow(liveDir, liveCommit, `descriptions/${file.name}`);
    if (!bytes || sha256(bytes) !== file.sha256)
      throw new Error(`Pin ${pin.pinId}: ${file.name} differs from live ${liveCommit}`);
  }
}

// packages/export/src/site/pool.ts
import { fork } from "node:child_process";
import { readFileSync as readFileSync4, writeFileSync as writeFileSync2 } from "node:fs";
import { pathToFileURL as pathToFileURL2 } from "node:url";
async function childMain() {
  let engine;
  let input;
  let options;
  const send = (message) => process.send(message);
  process.on("message", async (message) => {
    if (message.type === "init" && message.init) {
      const init = message.init;
      engine = await import(pathToFileURL2(`${init.engineDir}/engine.mjs`).href);
      input = JSON.parse(readFileSync4(init.inputPath, "utf8"));
      options = {
        catalog: JSON.parse(readFileSync4(init.catalogPath, "utf8")),
        identical: JSON.parse(readFileSync4(init.identicalPath, "utf8"))
      };
      send({ type: "ready" });
      return;
    }
    if (message.type === "build" && message.job)
      send({ type: "done", result: buildOne(message.job) });
  });
  function buildOne(job) {
    let bytes;
    let notices;
    try {
      const plan = engine.compile(input, job.file, options);
      bytes = plan.bytes;
      notices = plan.notices;
    } catch (error) {
      return { key: job.key, ok: false, reason: "failed", error: messageOf(error) };
    }
    try {
      if (!job.path.startsWith(`${job.projectId}/`) || job.path.split("/").some((part) => part === ".." || part === "" || part === "."))
        throw new Error(`Path ${job.path} is outside project ${job.projectId}`);
      if (bytes.byteLength > job.maxBytes)
        throw new Error(`${bytes.byteLength} bytes is over the ${job.maxBytes}-byte limit`);
      const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      if (!engine.isLegacyFile(job.file)) engine.validateV1(parsed);
      const markers = engine.markerSet(parsed, engine.outputTokens(job.file));
      writeFileSync2(job.outPath, bytes);
      return {
        key: job.key,
        ok: true,
        sha256: sha256(bytes),
        bytes: bytes.byteLength,
        markers,
        notices
      };
    } catch (error) {
      return { key: job.key, ok: false, reason: "invalid", error: messageOf(error) };
    }
  }
}
var messageOf = (error) => (error instanceof Error ? error.message : String(error)).slice(0, 500);
function childEnv() {
  const keep = [
    "PATH",
    "Path",
    "SYSTEMROOT",
    "SystemRoot",
    "TEMP",
    "TMP",
    "TMPDIR",
    "HOME",
    "USERPROFILE"
  ];
  return Object.fromEntries(
    keep.flatMap((name) => process.env[name] ? [[name, process.env[name]]] : [])
  );
}
var BuildPool = class {
  constructor(script, init, size, timeoutMs) {
    this.script = script;
    this.init = init;
    this.size = size;
    this.timeoutMs = timeoutMs;
  }
  script;
  init;
  size;
  timeoutMs;
  workers = [];
  closed = false;
  spawn() {
    const child = fork(this.script, ["child"], {
      env: childEnv(),
      stdio: ["ignore", "inherit", "inherit", "ipc"],
      serialization: "json"
    });
    const ready = new Promise((resolve, reject) => {
      const onMessage = (message) => {
        if (message.type === "ready") {
          child.off("message", onMessage);
          child.off("exit", onExit);
          resolve();
        }
      };
      const onExit = (code) => reject(new Error(`Build child exited during start (${code})`));
      child.on("message", onMessage);
      child.once("exit", onExit);
    });
    child.send({ type: "init", init: this.init });
    return { child, ready, busy: false };
  }
  take() {
    let worker = this.workers.find(
      (candidate) => !candidate.busy && candidate.child.exitCode === null && !candidate.child.killed
    );
    if (!worker) {
      if (this.workers.length >= this.size) throw new Error("Pool is full");
      worker = this.spawn();
      this.workers.push(worker);
    }
    worker.busy = true;
    return worker;
  }
  retire(worker) {
    worker.child.kill("SIGKILL");
    this.workers = this.workers.filter((candidate) => candidate !== worker);
  }
  get idle() {
    return this.size - this.workers.filter((worker) => worker.busy).length;
  }
  /** Builds one file; never rejects (a failure, timeout, or crash is a result). */
  async run(job) {
    if (this.closed) return { key: job.key, ok: false, reason: "crashed", error: "Pool closed" };
    const worker = this.take();
    try {
      await worker.ready;
    } catch (error) {
      this.retire(worker);
      return { key: job.key, ok: false, reason: "crashed", error: messageOf(error) };
    }
    return new Promise((resolve) => {
      const { child } = worker;
      const finish = (result, kill) => {
        clearTimeout(timer);
        child.off("message", onMessage);
        child.off("exit", onExit);
        if (kill) this.retire(worker);
        else worker.busy = false;
        resolve(result);
      };
      const onMessage = (message) => {
        if (message.type === "done" && message.result?.key === job.key)
          finish(message.result, false);
      };
      const onExit = (code, signal) => finish(
        {
          key: job.key,
          ok: false,
          reason: "crashed",
          error: `Build child exited (${code ?? signal})`
        },
        true
      );
      const timer = setTimeout(
        () => finish(
          { key: job.key, ok: false, reason: "timeout", error: `Over ${this.timeoutMs} ms` },
          true
        ),
        this.timeoutMs
      );
      child.on("message", onMessage);
      child.once("exit", onExit);
      child.send({ type: "build", job });
    });
  }
  /** Kills every child (used at the end and when the job budget runs out). */
  close() {
    this.closed = true;
    for (const worker of this.workers) worker.child.kill("SIGKILL");
    this.workers = [];
  }
};

// packages/export/src/site/build-site.ts
var siteLimits = {
  projects: 40,
  maxBytes: 25 * 1024 * 1024,
  fileTimeoutMs: 2e4,
  pool: 2,
  carryAfterMs: 8 * 6e4,
  budgetMs: 10 * 6e4,
  snapshotsCarried: 3
};
var manifestVersion = 1;
var snapshotNames = ["engine.mjs", "input.json", "identical.json", "catalog.json"];
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var isIsoTime = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value) && !Number.isNaN(Date.parse(value));
var isStrings = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
var isManifestFile = (file) => isRecord(file) && typeof file.sha256 === "string" && /^[0-9a-f]{64}$/.test(file.sha256) && Number.isSafeInteger(file.bytes) && file.bytes >= 0 && isIsoTime(file.lastUpdate) && (file.lastBuilt === void 0 || isIsoTime(file.lastBuilt)) && ["built", "carried", "frozen"].includes(file.outcome) && (file.retainUntil === void 0 || typeof file.retainUntil === "string") && (file.markers === void 0 || isStrings(file.markers)) && (file.baseline === void 0 || isStrings(file.baseline));
function checkManifest(value) {
  const manifest = value;
  const ok = isRecord(value) && manifest.manifestVersion === manifestVersion && typeof manifest.buildId === "string" && /^[0-9a-f]{16}$/.test(manifest.buildId) && isIsoTime(manifest.builtAt) && isPinId(manifest.pinId) && isRecord(manifest.files) && Object.entries(manifest.files).every(
    ([path, file]) => safeSitePath(path) && isManifestFile(file)
  ) && (manifest.attempts === void 0 || isRecord(manifest.attempts) && Object.entries(manifest.attempts).every(
    ([path, time]) => safeSitePath(path) && isIsoTime(time)
  )) && Array.isArray(manifest.snapshots) && manifest.snapshots.length > 0 && manifest.snapshots.length <= siteLimits.snapshotsCarried + 1 && manifest.snapshots.every(
    (snapshot) => isRecord(snapshot) && typeof snapshot.buildId === "string" && /^[0-9a-f]{16}$/.test(snapshot.buildId) && isRecord(snapshot.files) && snapshotNames.every((name) => /^[0-9a-f]{64}$/.test(String(snapshot.files[name] ?? "")))
  ) && manifest.snapshots[0].buildId === manifest.buildId;
  if (!ok) throw new Error("The current site manifest is malformed");
  return manifest;
}
var safeSitePath = (path) => /^[A-Za-z0-9_][A-Za-z0-9_.-]*(\/[A-Za-z0-9_][A-Za-z0-9_.-]*)*$/.test(path) && !path.split("/").includes("..");
async function locate(options) {
  const out = required(options, "out");
  let state;
  if (options["pages-sim"]) state = locateSim(options["pages-sim"]);
  else {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!token || !account)
      throw new Error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required");
    state = await locatePages(account, required(options, "pages-project"), token);
  }
  writeFile(out, json(state));
  console.log(
    state.zeroDeployments ? "Pages project has zero deployments (bootstrap)" : `Served deployment ${state.deployment.id}`
  );
}
async function buildSite(options) {
  const started = Date.now();
  const now = options.now ? new Date(options.now) : /* @__PURE__ */ new Date();
  if (Number.isNaN(now.getTime())) throw new Error("--now must be an ISO time");
  const nowIso = now.toISOString();
  const limits = {
    ...siteLimits,
    projects: intOption(options, "projects", siteLimits.projects),
    maxBytes: intOption(options, "max-bytes", siteLimits.maxBytes),
    fileTimeoutMs: intOption(options, "file-timeout", siteLimits.fileTimeoutMs),
    pool: intOption(options, "pool", siteLimits.pool) || 1,
    carryAfterMs: intOption(options, "carry-after", siteLimits.carryAfterMs),
    budgetMs: intOption(options, "budget", siteLimits.budgetMs)
  };
  const script = options.script ?? fileURLToPath(import.meta.url);
  const out = required(options, "out");
  const resultPath = options.result;
  const notices = [];
  const finish = (result2) => {
    if (resultPath) writeFile(resultPath, json(result2));
    const output = process.env.GITHUB_OUTPUT;
    if (output) writeFile(output, `deploy=${result2.deploy === true}
`);
  };
  const state = readJson(required(options, "state"));
  const liveDir = required(options, "live");
  const pinsDir = required(options, "pins");
  const converterDir = required(options, "converter");
  const generatorDir = required(options, "generator");
  const exportsDir = required(options, "exports");
  let previous;
  const previousUrl = state.zeroDeployments ? void 0 : state.deployment.url;
  if (previousUrl) {
    const bytes = await fetchBytes(`${previousUrl}_build/manifest.json`);
    previous = checkManifest(JSON.parse(new TextDecoder().decode(bytes)));
  }
  const liveHead = git(liveDir, ["rev-parse", "HEAD"]);
  const effective = effectivePin(pinsDir, liveDir, liveHead);
  if (!effective) {
    console.log("No publish pin yet: the site waits for the first legacy run");
    finish({ deploy: false, reason: "no-pin" });
    return;
  }
  const pin = effective.pin;
  ensureCommit(converterDir, pin.converterSha);
  const inputBytes = gitShow(converterDir, pin.converterSha, "liveDescriptions.json");
  if (!inputBytes || sha256(inputBytes) !== pin.inputSha256)
    throw new Error(`liveDescriptions.json at ${pin.converterSha} does not match the pin`);
  ensureCommit(generatorDir, pin.generatorSha);
  const catalogPart = (name) => {
    const bytes = gitShow(generatorDir, pin.generatorSha, `templates/v2/${name}`);
    if (!bytes) throw new Error(`templates/v2/${name} is missing at generator ${pin.generatorSha}`);
    return JSON.parse(bytes.toString("utf8"));
  };
  const catalog = { items: catalogPart("items.json"), categories: catalogPart("categories.json") };
  const work = mkdtempSync(join3(tmpdir(), "build-site-"));
  const engineDir = join3(work, "engine");
  const exportsListing = git(converterDir, [
    "ls-tree",
    "--name-only",
    `${pin.converterSha}:.exports`
  ]);
  for (const name of exportsListing.split(/\r?\n/).filter((file) => /^[A-Za-z0-9._-]+$/.test(file))) {
    const bytes = gitShow(converterDir, pin.converterSha, `.exports/${name}`);
    if (bytes) writeFile(join3(engineDir, name), bytes);
  }
  if (!existsSync3(join3(engineDir, "engine.mjs")) || !existsSync3(join3(engineDir, "config.mjs")))
    throw new Error(`.exports/ at converter ${pin.converterSha} has no engine`);
  const enginePin = existsSync3(join3(engineDir, "PIN")) ? readFileSync5(join3(engineDir, "PIN"), "utf8").trim() : "";
  if (enginePin !== pin.engine)
    throw new Error(
      `The engine at ${pin.converterSha} (${enginePin}) is not the pinned one (${pin.engine})`
    );
  const snapshotBytes = {
    "engine.mjs": readFileSync5(join3(engineDir, "engine.mjs")),
    "input.json": inputBytes,
    "identical.json": new TextEncoder().encode(JSON.stringify(pin.hashes)),
    "catalog.json": new TextEncoder().encode(JSON.stringify(catalog))
  };
  const snapshotShas = Object.fromEntries(
    snapshotNames.map((name) => [name, sha256(snapshotBytes[name])])
  );
  const buildId = sha256(snapshotNames.map((name) => snapshotShas[name]).join("\n")).slice(0, 16);
  const engine = await import(pathToFileURL3(join3(engineDir, "engine.mjs")).href);
  const config = await import(pathToFileURL3(join3(engineDir, "config.mjs")).href);
  if (existsSync3(out) && readdirSync(out).length) throw new Error(`${out} is not empty`);
  mkdirSync2(out, { recursive: true });
  for (const name of snapshotNames) writeFile(join3(work, name), snapshotBytes[name]);
  const projectsDir = join3(exportsDir, "projects");
  const configFiles = existsSync3(projectsDir) ? readdirSync(projectsDir).filter((name) => name.endsWith(".json")).sort() : [];
  const published = (id) => Object.keys(previous?.files ?? {}).some((path) => path.startsWith(`${id}/`));
  const parsedConfigs = [];
  for (const name of configFiles) {
    const id = name.slice(0, -".json".length);
    if (!engine.isValidId(id)) {
      notices.push({
        project: id,
        kind: "invalid-config",
        message: `${name}: not a valid project id`
      });
      continue;
    }
    try {
      const parsed = config.migrateConfig(
        JSON.parse(readFileSync5(join3(projectsDir, name), "utf8"))
      );
      if (parsed.id !== id) throw new Error(`id "${parsed.id}" differs from the file name`);
      parsedConfigs.push({ id, name, parsed });
    } catch (error) {
      parsedConfigs.push({ id, name, error: error.message.slice(0, 300) });
    }
  }
  parsedConfigs.sort(
    (a, b) => Number(published(b.id)) - Number(published(a.id)) || a.id.localeCompare(b.id)
  );
  const configs = [];
  const brokenProjects = [];
  let slots = 0;
  for (const { id, name, parsed, error } of parsedConfigs) {
    if (!parsed && !published(id)) {
      notices.push({ project: id, kind: "invalid-config", message: `${name}: ${error}` });
      continue;
    }
    if (slots >= limits.projects) {
      notices.push({
        project: id,
        kind: "over-limit",
        message: `More than ${limits.projects} projects: not built or served`
      });
      continue;
    }
    slots += 1;
    if (!parsed) {
      brokenProjects.push(id);
      notices.push({ project: id, kind: "invalid-config", message: `${name}: ${error}` });
      continue;
    }
    configs.push(parsed);
    const unknown = config.unknownCategories(
      parsed,
      catalog.categories.map((category) => category.id)
    );
    if (unknown.length)
      notices.push({
        project: id,
        kind: "compile",
        message: `Categories the pinned catalog lacks: ${unknown.join(", ")}`
      });
  }
  const entries = [];
  for (const project of configs) {
    for (const file of project.files)
      entries.push({
        project: project.id,
        path: engine.filePath(project.id, file),
        fileId: file.id,
        file,
        kind: "active"
      });
    for (const entry of project.retained ?? []) {
      const expired = Date.parse(entry.until) <= now.getTime();
      entries.push({
        project: project.id,
        path: entry.path,
        fileId: entry.snapshot.id,
        file: entry.snapshot,
        kind: expired ? "expired" : "retained",
        until: entry.until
      });
      if (!expired)
        notices.push({
          project: project.id,
          file: entry.snapshot.id,
          path: entry.path,
          kind: "retained-ends",
          message: `Keeps updating until ${entry.until}`
        });
    }
  }
  for (const entry of entries)
    if (!safeSitePath(entry.path) || !entry.path.startsWith(`${entry.project}/`))
      throw new Error(`Path ${entry.path} is outside project ${entry.project}`);
  const outcomes = /* @__PURE__ */ new Map();
  const legacyByName = new Map(pin.files.map((file) => [file.name, file]));
  const deployed = new Set(engine.deployedLegacyPresets);
  const carried = async (path) => {
    const record2 = previous.files[path];
    const bytes = await fetchBytes(`${previousUrl}${path}`);
    if (sha256(bytes) !== record2.sha256)
      throw new Error(`Carried file ${path} does not match the manifest sha256`);
    return bytes;
  };
  const carryOrDrop = async (entry, kind, reason, frozen = false) => {
    const record2 = previous?.files[entry.path];
    if (record2) {
      const bytes = await carried(entry.path);
      outcomes.set(entry.path, {
        bytes,
        file: { ...record2, outcome: frozen ? "frozen" : "carried" }
      });
      notices.push({
        project: entry.project,
        file: entry.fileId,
        path: entry.path,
        kind,
        message: `${reason}; the last published file stays`
      });
    } else {
      notices.push({
        project: entry.project,
        file: entry.fileId,
        path: entry.path,
        kind: "not-published",
        message: `${reason}; not published yet (404)`
      });
    }
  };
  for (const project of brokenProjects)
    for (const path of Object.keys(previous?.files ?? {}).filter(
      (path2) => path2.startsWith(`${project}/`)
    ))
      await carryOrDrop(
        {
          project,
          fileId: path.split("/").pop().replace(/\.json$/, ""),
          path
        },
        "carried-forward",
        "The project config is invalid"
      );
  const builds = [];
  for (const entry of entries) {
    if (entry.kind === "expired") {
      await carryOrDrop(entry, "frozen", `Retained until ${entry.until}: frozen`, true);
      continue;
    }
    if (engine.isLegacyFile(entry.file) && deployed.has(entry.file.preset)) {
      const name = engine.legacyFileName(entry.file.preset);
      const bytes = gitShow(liveDir, pin.liveCommit, `descriptions/${name}`);
      const record2 = legacyByName.get(name);
      if (!bytes || !record2 || sha256(bytes) !== record2.sha256) {
        await carryOrDrop(entry, "build-failed", `live has no pinned ${name} at ${pin.liveCommit}`);
        continue;
      }
      if (bytes.byteLength > limits.maxBytes) {
        await carryOrDrop(
          entry,
          "build-failed",
          `${name} is over the ${limits.maxBytes}-byte limit`
        );
        continue;
      }
      let markers;
      try {
        markers = engine.markerSet(
          JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
          engine.outputTokens(entry.file)
        );
      } catch (error) {
        await carryOrDrop(
          entry,
          "build-failed",
          `${name} is not valid JSON: ${error.message}`
        );
        continue;
      }
      const old = previous?.files[entry.path];
      let baseline;
      if (entry.kind === "retained") {
        baseline = old?.baseline ?? old?.markers ?? markers;
        const change = engine.markerChange(baseline, markers);
        if (change) {
          await carryOrDrop(entry, "frozen", breakingMessage(change), true);
          const kept = outcomes.get(entry.path);
          if (kept) kept.file = { ...kept.file, baseline };
          continue;
        }
      }
      const hash = sha256(bytes);
      outcomes.set(entry.path, {
        bytes,
        file: {
          sha256: hash,
          bytes: bytes.byteLength,
          lastUpdate: old?.sha256 === hash ? old.lastUpdate : nowIso,
          lastBuilt: nowIso,
          outcome: record2.outcome,
          ...entry.until ? { retainUntil: entry.until } : {},
          markers,
          ...baseline ? { baseline } : {}
        }
      });
      if (record2.outcome !== "built")
        notices.push({
          project: entry.project,
          file: entry.fileId,
          path: entry.path,
          kind: record2.outcome === "frozen" ? "frozen" : "carried-forward",
          message: `${name} is ${record2.outcome} at the old URL; this copy matches it`
        });
      continue;
    }
    builds.push(entry);
  }
  const lastAttempt = (path) => previous?.attempts?.[path] ?? previous?.files[path]?.lastBuilt ?? "";
  const attempts = {};
  builds.sort((a, b) => {
    const at = lastAttempt(a.path);
    const bt = lastAttempt(b.path);
    return at === bt ? a.path.localeCompare(b.path) : at < bt ? -1 : 1;
  });
  const pool = new BuildPool(
    script,
    {
      engineDir,
      inputPath: join3(work, "input.json"),
      catalogPath: join3(work, "catalog.json"),
      identicalPath: join3(work, "identical.json")
    },
    limits.pool,
    limits.fileTimeoutMs
  );
  const results = /* @__PURE__ */ new Map();
  const outPaths = /* @__PURE__ */ new Map();
  const skipped = [];
  const queue = [...builds];
  const running = /* @__PURE__ */ new Map();
  let budgetHit = false;
  const elapsed = () => Date.now() - started;
  try {
    while (queue.length || running.size) {
      while (queue.length && running.size < limits.pool && elapsed() < limits.carryAfterMs) {
        const entry = queue.shift();
        attempts[entry.path] = nowIso;
        const outPath = join3(work, `out-${outPaths.size}.json`);
        outPaths.set(entry.path, outPath);
        const job = {
          key: entry.path,
          projectId: entry.project,
          path: entry.path,
          file: entry.file,
          outPath,
          maxBytes: limits.maxBytes
        };
        running.set(
          entry.path,
          pool.run(job).then((result2) => {
            results.set(entry.path, result2);
            return entry.path;
          })
        );
      }
      if (queue.length && elapsed() >= limits.carryAfterMs) {
        budgetHit = true;
        skipped.push(...queue.splice(0));
      }
      if (!running.size) continue;
      const untilBudget = Math.max(0, limits.budgetMs - elapsed());
      const untilCarry = Math.max(1, limits.carryAfterMs - elapsed());
      const wait = queue.length ? Math.min(untilBudget, untilCarry) : untilBudget;
      let timer;
      const done = await Promise.race([
        ...running.values(),
        new Promise((resolve) => timer = setTimeout(() => resolve(void 0), wait))
      ]);
      clearTimeout(timer);
      if (done !== void 0) running.delete(done);
      else if (elapsed() >= limits.budgetMs) {
        budgetHit = true;
        pool.close();
        for (const path of running.keys())
          skipped.push(builds.find((entry) => entry.path === path));
        running.clear();
      }
    }
  } finally {
    pool.close();
  }
  for (const entry of skipped) {
    results.delete(entry.path);
    const before = lastAttempt(entry.path);
    if (before) attempts[entry.path] = before;
    else delete attempts[entry.path];
    await carryOrDrop(
      entry,
      "budget",
      "Not built within this run's time budget (it builds first next run)"
    );
    const kept = outcomes.get(entry.path);
    if (kept) kept.file = { ...kept.file, lastBuilt: previous?.files[entry.path]?.lastBuilt };
  }
  for (const entry of builds) {
    const result2 = results.get(entry.path);
    if (!result2) continue;
    if (!result2.ok) {
      const label = result2.reason === "timeout" ? "Timed out" : result2.reason === "invalid" ? "Invalid output" : result2.reason === "crashed" ? "Build process crashed" : "Build failed";
      await carryOrDrop(entry, "build-failed", `${label}: ${result2.error}`);
      continue;
    }
    const old = previous?.files[entry.path];
    let baseline;
    if (entry.kind === "retained") {
      baseline = old?.baseline ?? old?.markers ?? result2.markers;
      const change = engine.markerChange(baseline, result2.markers);
      if (change) {
        await carryOrDrop(entry, "frozen", breakingMessage(change), true);
        const kept = outcomes.get(entry.path);
        if (kept) kept.file = { ...kept.file, baseline };
        continue;
      }
    }
    for (const notice of result2.notices)
      notices.push({
        project: entry.project,
        file: entry.fileId,
        path: entry.path,
        kind: "compile",
        message: JSON.stringify(notice).slice(0, 300),
        detail: notice
      });
    outcomes.set(entry.path, {
      from: outPaths.get(entry.path),
      file: {
        sha256: result2.sha256,
        bytes: result2.bytes,
        lastUpdate: old?.sha256 === result2.sha256 ? old.lastUpdate : nowIso,
        lastBuilt: nowIso,
        outcome: "built",
        ...entry.until ? { retainUntil: entry.until } : {},
        markers: result2.markers,
        ...baseline ? { baseline } : {}
      }
    });
  }
  const files = {};
  const put = (path, bytes) => writeFile(join3(out, ...path.split("/")), bytes);
  for (const [path, outcome] of outcomes) {
    const bytes = outcome.bytes ?? readFileSync5(outcome.from);
    if (sha256(bytes) !== outcome.file.sha256) throw new Error(`${path} changed after its build`);
    put(path, bytes);
    files[path] = outcome.file;
  }
  const encoder = new TextEncoder();
  const record = (path, bytes, outcome = "built") => {
    const old = previous?.files[path];
    const hash = sha256(bytes);
    put(path, bytes);
    files[path] = {
      sha256: hash,
      bytes: bytes.byteLength,
      lastUpdate: old?.sha256 === hash ? old.lastUpdate : nowIso,
      outcome
    };
  };
  const projectNotices = (project) => notices.filter((notice) => notice.project === project && notice.file !== void 0);
  for (const project of configs) {
    const built = {};
    for (const [path, file] of Object.entries(files))
      if (path.startsWith(`${project.id}/`))
        built[path] = {
          sha256: file.sha256,
          bytes: file.bytes,
          lastUpdate: file.lastUpdate,
          outcome: file.outcome
        };
    const index = engine.projectIndex(
      project,
      built,
      projectNotices(project.id).map(
        (notice) => notice.detail ? { ...notice.detail, file: notice.file } : { kind: notice.kind, file: notice.file, message: notice.message }
      )
    );
    record(`${project.id}/index.json`, encoder.encode(JSON.stringify(index)));
  }
  for (const project of brokenProjects)
    if (previous?.files[`${project}/index.json`]) {
      const path = `${project}/index.json`;
      put(path, await carried(path));
      files[path] = { ...previous.files[path], outcome: "carried" };
    }
  const changelogPath = join3(exportsDir, "changelog.json");
  const changelog = existsSync3(changelogPath) ? checkChangelog(readFileSync5(changelogPath, "utf8")) : { entries: [] };
  if (changelog) record("changelog.json", encoder.encode(JSON.stringify(changelog)));
  else {
    notices.push({
      kind: "invalid-changelog",
      message: "exports/changelog.json is invalid; the published one stays"
    });
    if (previous?.files["changelog.json"]) {
      put("changelog.json", await carried("changelog.json"));
      files["changelog.json"] = { ...previous.files["changelog.json"], outcome: "carried" };
    } else record("changelog.json", encoder.encode(JSON.stringify({ entries: [] })));
  }
  const snapshots = [{ buildId, files: snapshotShas }];
  for (const name of snapshotNames) put(`_build/${buildId}/${name}`, snapshotBytes[name]);
  for (const snapshot of previous?.snapshots ?? []) {
    if (snapshots.length > siteLimits.snapshotsCarried) break;
    if (snapshots.some((kept) => kept.buildId === snapshot.buildId)) continue;
    for (const name of snapshotNames) {
      const bytes = await fetchBytes(`${previousUrl}_build/${snapshot.buildId}/${name}`);
      if (sha256(bytes) !== snapshot.files[name])
        throw new Error(`Carried snapshot ${snapshot.buildId}/${name} does not match`);
      put(`_build/${snapshot.buildId}/${name}`, bytes);
    }
    snapshots.push(snapshot);
  }
  const status = {
    buildId,
    builtAt: nowIso,
    files: snapshotShas,
    engine: enginePin,
    converterSha: pin.converterSha,
    generatorSha: pin.generatorSha,
    manifestVersion: pin.manifestVersion,
    pinId: pin.pinId,
    liveCommit: pin.liveCommit,
    legacy: Object.fromEntries(
      pin.files.map((file) => [file.name, { sha256: file.sha256, outcome: file.outcome }])
    )
  };
  const manifest = {
    manifestVersion,
    buildId,
    builtAt: nowIso,
    pinId: pin.pinId,
    files,
    attempts,
    snapshots
  };
  put("_build/status.json", encoder.encode(json(status)));
  put("_build/notices.json", encoder.encode(json(notices)));
  put("_build/manifest.json", encoder.encode(json(manifest)));
  put("_headers", encoder.encode(headersFile(snapshots.map((snapshot) => snapshot.buildId))));
  rmSync(work, { recursive: true, force: true });
  const counts = { built: 0, carried: 0, frozen: 0 };
  for (const [path, file] of Object.entries(files))
    if (!path.endsWith("index.json") && path !== "changelog.json") counts[file.outcome] += 1;
  const result = {
    deploy: true,
    buildId,
    pinId: pin.pinId,
    pinSource: effective.source,
    bootstrap: state.zeroDeployments,
    budgetHit,
    counts,
    notices: notices.length,
    elapsedMs: Date.now() - started
  };
  finish(result);
  console.log(JSON.stringify(result));
  stepSummary(
    [
      `### data site build ${buildId}`,
      "",
      `Pin ${pin.pinId} (${effective.source}); built ${counts.built}, carried ${counts.carried}, frozen ${counts.frozen}; ${notices.length} notices.`,
      "",
      ...notices.slice(0, 50).map(
        (notice) => `- ${notice.kind} ${notice.path ?? notice.project ?? ""}: ${notice.message.replace(/[\r\n|<>`]/g, " ")}`
      )
    ].join("\n")
  );
}
var breakingMessage = (change) => {
  const list = (items) => items.slice(0, 5).join(", ") || "none";
  return `Breaking change (added ${list(change.added)}; removed ${list(change.removed)})`;
};
function checkChangelog(text) {
  try {
    const value = JSON.parse(text);
    const keys = Object.keys(value ?? {});
    if (keys.length !== 1 || !Array.isArray(value.entries) || value.entries.length > 500)
      return void 0;
    for (const entry of value.entries) {
      if (!entry || typeof entry !== "object" || Object.keys(entry).sort().join() !== "date,text")
        return void 0;
      if (typeof entry.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date))
        return void 0;
      if (typeof entry.text !== "string" || entry.text.length > 1e3 || // Control characters other than a line break.
      [...entry.text].some((char) => {
        const code = char.charCodeAt(0);
        return code < 32 && code !== 10 || code === 127;
      }))
        return void 0;
    }
    return value;
  } catch {
    return void 0;
  }
}
function headersFile(buildIds) {
  const rule = (path, cache, detach) => [path, ...detach ? ["  ! Cache-Control"] : [], `  Cache-Control: ${cache}`].join("\n");
  return [
    ["/*", "  Access-Control-Allow-Origin: *", "  Cache-Control: public, max-age=300"].join("\n"),
    ...["status.json", "manifest.json", "notices.json"].map(
      (name) => rule(`/_build/${name}`, "no-cache", true)
    ),
    ...buildIds.map((id) => rule(`/_build/${id}/*`, "public, max-age=31536000, immutable", true))
  ].join("\n") + "\n";
}
async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  if (command === "child") return childMain();
  if (command === "locate") return locate(options);
  if (command === "build") return buildSite(options);
  throw new Error("Usage: build-site.mjs locate|build [--options]");
}

// packages/export/src/site/build-site-cli.ts
main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
