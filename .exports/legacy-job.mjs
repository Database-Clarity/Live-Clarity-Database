// packages/export/src/site/legacy-job.ts
import { existsSync as existsSync2, readFileSync as readFileSync3, rmSync } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// packages/export/src/site/pins.ts
import { existsSync, readFileSync as readFileSync2 } from "node:fs";
import { join } from "node:path";

// packages/export/src/site/util.ts
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
var readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
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
function stepSummary(markdown) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (path) writeFileSync(path, markdown + "\n", { flag: "a" });
}

// packages/export/src/site/pins.ts
var pinIdPattern = /^[0-9a-f]{40}-[0-9]{1,20}-[0-9]{1,6}$/;
var isPinId = (value) => typeof value === "string" && pinIdPattern.test(value);
function makePinId(converterSha, runId, attempt) {
  const pinId = `${converterSha}-${runId}-${attempt}`;
  if (!isPinId(pinId)) throw new Error(`Bad pin id parts: ${pinId}`);
  return pinId;
}
function checkPin(value, where) {
  const pin = value;
  const ok = pin && typeof pin === "object" && isPinId(pin.pinId) && isSha(pin.converterSha) && pin.pinId.startsWith(pin.converterSha) && /^[0-9a-f]{64}$/.test(pin.inputSha256) && typeof pin.manifestVersion === "string" && Array.isArray(pin.hashes) && pin.hashes.every((hash) => Number.isSafeInteger(hash)) && typeof pin.engine === "string" && isSha(pin.generatorSha) && (pin.liveCommit === void 0 || isSha(pin.liveCommit)) && Array.isArray(pin.files) && pin.files.every(
    (file) => /^[A-Za-z0-9]+\.json$/.test(file.name) && /^[0-9a-f]{64}$/.test(file.sha256) && ["built", "carried", "frozen"].includes(file.outcome) && isSha(file.sourceConverterSha)
  );
  if (!ok) throw new Error(`Malformed pin ${where}`);
  return pin;
}
function deployMessage(repo, converterSha, pinId) {
  const lines = [
    `Deploying to live from @ ${repo}@${converterSha} \u{1F680}`,
    "",
    `Export-Converter: ${converterSha}`
  ];
  if (pinId) lines.push(`Export-Pin: ${pinId}`);
  return lines.join("\n") + "\n";
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
  const full = join(pinsDir, path);
  if (!existsSync(full)) return void 0;
  return checkPin(JSON.parse(readFileSync2(full, "utf8")), path);
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
var bot = [
  "-c",
  "user.name=github-actions[bot]",
  "-c",
  "user.email=41898282+github-actions[bot]@users.noreply.github.com"
];
function commitAndPush(pinsDir, paths, message, branch) {
  git(pinsDir, ["add", "--", ...paths]);
  git(pinsDir, [...bot, "commit", "--quiet", "-m", message]);
  git(pinsDir, ["push", "--quiet", "origin", `HEAD:refs/heads/${branch}`]);
}
function writePending(pinsDir, pin, branch = "export-pins") {
  if (pin.liveCommit !== void 0) throw new Error("A pending pin has no liveCommit");
  const path = pinPaths.pending(pin.pinId);
  if (existsSync(join(pinsDir, path))) throw new Error(`${path} exists already`);
  writeFile(join(pinsDir, path), json(pin));
  commitAndPush(pinsDir, [path], `Pending pin ${pin.pinId}`, branch);
}
function writePromoted(pinsDir, liveDir, pin, branch = "export-pins") {
  const paths = [];
  const path = pinPaths.promoted(pin.liveCommit);
  if (!existsSync(join(pinsDir, path))) {
    writeFile(join(pinsDir, path), json(pin));
    paths.push(path);
  }
  const latest = readPin(pinsDir, pinPaths.latest);
  if (!latest?.liveCommit || latest.liveCommit !== pin.liveCommit && isAncestor(liveDir, latest.liveCommit, pin.liveCommit)) {
    writeFile(join(pinsDir, pinPaths.latest), json(pin));
    paths.push(pinPaths.latest);
  }
  if (paths.length)
    commitAndPush(pinsDir, paths, `Pin ${pin.pinId} at live ${pin.liveCommit}`, branch);
}

// packages/export/src/site/legacy-job.ts
var bungie = "https://www.bungie.net";
async function loadManifest(file) {
  if (file) {
    if (!existsSync2(file)) return void 0;
    return readJson(file);
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const index = await (await fetch(`${bungie}/Platform/Destiny2/Manifest/`)).json();
      const version = index.Response?.version;
      const path = index.Response?.jsonWorldComponentContentPaths?.en?.DestinyInventoryItemDefinition;
      if (!version || !path?.startsWith("/"))
        throw new Error("Manifest index without inventory items");
      const response = await fetch(`${bungie}${path}`);
      if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
      return { version, inventoryItem: await response.json() };
    } catch (error) {
      console.log(`Bungie manifest attempt ${attempt + 1} failed: ${error.message}`);
    }
  }
  return void 0;
}
function generatorSha(converterDir, converterSha, engineDir) {
  const listing = git(converterDir, [
    "ls-tree",
    "-r",
    "--name-only",
    converterSha,
    "--",
    ".publish/receipts"
  ]);
  const receipts = listing ? listing.split("\n").filter((path) => path.endsWith(".json")).sort() : [];
  const month = receipts.at(-1)?.split("/").slice(0, -1).join("/");
  let best;
  for (const path of receipts.filter((candidate) => candidate.startsWith(`${month}/`))) {
    const receipt = JSON.parse(gitShow(converterDir, converterSha, path).toString("utf8"));
    if (typeof receipt.now === "number" && isSha(receipt.generatorSha) && (!best || receipt.now > best.now))
      best = { now: receipt.now, generatorSha: receipt.generatorSha };
  }
  if (best) return best.generatorSha;
  const config = join2(engineDir, "config.json");
  const pinned = existsSync2(config) ? readJson(config).generatorSha : void 0;
  if (!isSha(pinned))
    throw new Error("No publish receipt and no generatorSha in .exports/config.json");
  return pinned;
}
var loadEngine = async (engineDir) => await import(pathToFileURL(join2(engineDir, "engine.mjs")).href);
function buildSeven(engine, input, identical) {
  return engine.deployedLegacyPresets.map((preset) => {
    const name = engine.legacyFileName(preset);
    const file = { id: preset.toLowerCase(), formatVersion: 1, preset };
    try {
      const plan = engine.compile(input, file, {
        catalog: { items: {}, categories: [] },
        identical
      });
      const parsed = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(plan.bytes)
      );
      return {
        name,
        preset,
        bytes: plan.bytes,
        markers: engine.markerSet(parsed, engine.outputTokens(file))
      };
    } catch (error) {
      return { name, preset, error: error.message.slice(0, 500) };
    }
  });
}
async function runLegacy(options) {
  const engineDir = options["engine-dir"] ?? dirname2(fileURLToPath(import.meta.url));
  const converterDir = required(options, "converter");
  const liveDir = required(options, "live");
  const pinsDir = required(options, "pins");
  const repo = options.repo ?? "Database-Clarity/Live-Clarity-Database";
  const runId = required(options, "run-id");
  const attempt = required(options, "attempt");
  const pinsBranch = options["pins-branch"] ?? "export-pins";
  const notices = [];
  const report = (outcome) => {
    console.log(outcome);
    stepSummary(
      [`### Legacy outputs: ${outcome}`, "", ...notices.map((notice) => `- ${notice}`)].join("\n")
    );
    if (options.result) writeFile(options.result, json({ outcome, notices }));
  };
  const engine = await loadEngine(engineDir);
  const enginePin = existsSync2(join2(engineDir, "PIN")) ? readFileSync3(join2(engineDir, "PIN"), "utf8").trim() : "unpinned";
  const liveHead = git(liveDir, ["rev-parse", "HEAD"]);
  const effective = effectivePin(pinsDir, liveDir, liveHead);
  if (effective?.promote) {
    writePromoted(pinsDir, liveDir, effective.promote.pin, pinsBranch);
    notices.push(
      `Promoted pin ${effective.promote.pin.pinId} (live ${effective.promote.pin.liveCommit})`
    );
  }
  const converterSha = git(converterDir, ["rev-parse", "HEAD"]);
  const installedPin = gitShow(converterDir, converterSha, ".exports/PIN")?.toString("utf8").trim();
  if (installedPin !== enginePin)
    throw new Error(
      `This engine (${enginePin}) is not .exports/PIN at ${converterSha} (${installedPin ?? "none"})`
    );
  const last = lastDeploy(liveDir, liveHead);
  if (last && last.converterSha !== converterSha) {
    let newer = false;
    try {
      ensureCommit(converterDir, last.converterSha);
      newer = isAncestor(converterDir, last.converterSha, converterSha);
    } catch {
      newer = false;
    }
    if (!newer) {
      notices.push(
        `live was deployed from ${last.converterSha}, which ${converterSha} does not descend from`
      );
      return report("stale: nothing deployed");
    }
  }
  const inputBytes = gitShow(converterDir, converterSha, "liveDescriptions.json");
  if (!inputBytes) throw new Error(`No liveDescriptions.json at ${converterSha}`);
  const input = JSON.parse(inputBytes.toString("utf8"));
  const manifest = await loadManifest(options["manifest-file"]);
  if (!manifest) {
    notices.push(
      "Bungie manifest fetch failed: every legacy file stays as it is; the next publish retries"
    );
    return report("manifest failed: nothing deployed");
  }
  const identical = engine.bungieIdentical(input, manifest.inventoryItem).map(Number).sort((a, b) => a - b);
  const vocab = options.vocab && existsSync2(options.vocab) ? readJson(options.vocab).presets ?? {} : {};
  const previousFiles = new Map((effective?.pin.files ?? []).map((file) => [file.name, file]));
  const files = [];
  for (const built of buildSeven(engine, input, identical)) {
    let outcome = "built";
    let bytes = built.bytes;
    const baseline = vocab[built.preset];
    if (bytes && baseline) {
      const change = engine.markerChange(baseline, built.markers);
      if (change) {
        outcome = "frozen";
        notices.push(
          `${built.name} frozen: breaking change (added ${change.added.slice(0, 5).join(", ") || "none"}; removed ${change.removed.slice(0, 5).join(", ") || "none"})`
        );
      }
    }
    if (!bytes) {
      outcome = "carried";
      notices.push(`${built.name} failed to build: ${built.error}`);
    }
    if (outcome !== "built") {
      bytes = gitShow(liveDir, liveHead, `descriptions/${built.name}`);
      if (!bytes) {
        notices.push(`${built.name} is not on live either: it stays absent`);
        continue;
      }
    }
    const source = outcome === "built" ? converterSha : previousFiles.get(built.name)?.sourceConverterSha ?? last?.converterSha ?? converterSha;
    files.push({
      name: built.name,
      sha256: sha256(bytes),
      outcome,
      sourceConverterSha: source,
      bytes
    });
  }
  const versionsBytes = gitShow(liveDir, liveHead, "versions.json");
  if (!versionsBytes) throw new Error("live has no versions.json");
  const versions = engine.nextVersions(
    JSON.parse(versionsBytes.toString("utf8"))
  );
  const pin = {
    pinId: makePinId(converterSha, runId, attempt),
    converterSha,
    inputSha256: sha256(inputBytes),
    manifestVersion: manifest.version,
    hashes: identical,
    engine: enginePin,
    generatorSha: generatorSha(converterDir, converterSha, engineDir),
    files: files.map(({ name, sha256: hash, outcome, sourceConverterSha }) => ({
      name,
      sha256: hash,
      outcome,
      sourceConverterSha
    }))
  };
  writePending(pinsDir, pin, pinsBranch);
  rmSync(join2(liveDir, "descriptions"), { recursive: true, force: true });
  for (const file of files) writeFile(join2(liveDir, "descriptions", file.name), file.bytes);
  writeFile(join2(liveDir, "versions.json"), versions.bytes);
  git(liveDir, ["add", "-A", "--", "descriptions", "versions.json"]);
  git(
    liveDir,
    [
      "-c",
      "user.name=github-actions[bot]",
      "-c",
      "user.email=41898282+github-actions[bot]@users.noreply.github.com",
      "commit",
      "--quiet",
      "--allow-empty",
      "-F",
      "-"
    ],
    new TextEncoder().encode(deployMessage(repo, converterSha, pin.pinId))
  );
  git(liveDir, [
    "push",
    "--quiet",
    "origin",
    `HEAD:refs/heads/${options["live-branch"] ?? "live"}`
  ]);
  const liveCommit = git(liveDir, ["rev-parse", "HEAD"]);
  writePromoted(pinsDir, liveDir, { ...pin, liveCommit }, pinsBranch);
  report(
    `deployed ${liveCommit} from ${converterSha} (pin ${pin.pinId}; ${files.map((file) => `${file.name} ${file.outcome}`).join(", ")})`
  );
}
async function captureVocab(options) {
  const engineDir = options["engine-dir"] ?? dirname2(fileURLToPath(import.meta.url));
  const engine = await loadEngine(engineDir);
  const converterDir = required(options, "converter");
  const converterSha = git(converterDir, ["rev-parse", "HEAD"]);
  const input = JSON.parse(
    gitShow(converterDir, converterSha, "liveDescriptions.json").toString("utf8")
  );
  const manifest = await loadManifest(options["manifest-file"]);
  if (!manifest) throw new Error("Bungie manifest fetch failed");
  const identical = engine.bungieIdentical(input, manifest.inventoryItem).map(Number);
  const presets = {};
  for (const built of buildSeven(engine, input, identical)) {
    if (!built.markers) throw new Error(`${built.name}: ${built.error}`);
    presets[built.preset] = built.markers;
  }
  writeFile(
    required(options, "out"),
    json({ converterSha, manifestVersion: manifest.version, presets })
  );
}
async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  if (command === "run") return runLegacy(options);
  if (command === "vocab") return captureVocab(options);
  throw new Error("Usage: legacy-job.mjs run|vocab [--options]");
}

// packages/export/src/site/legacy-job-cli.ts
main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
