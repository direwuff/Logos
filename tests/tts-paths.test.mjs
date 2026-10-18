import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../kokoro-worker-persistent.cjs", import.meta.url), "utf8");

function workerHarness(missing = [], failure = "ENOENT", directory = false) {
  const workerDir = "/vault/" + "中文路径".repeat(30) + "/.obsidian/plugins/logos";
  const responses = [];
  const configs = [];
  let cwd;
  let handler;
  const fs = {
    constants: { R_OK: 4 },
    accessSync(file) {
      if (missing.some(name => file.endsWith(name))) throw new Error(failure + ": original filesystem diagnostic");
    },
    statSync: () => ({ isFile: () => !directory })
  };
  const sherpa = {
    OfflineTts: class {
      constructor(config) { configs.push(config); }
      generate() { return { samples: new Float32Array(240), sampleRate: 24000 }; }
    },
    GenerationConfig: class { constructor(config) { Object.assign(this, config); } },
    writeWave() {}
  };
  vm.runInNewContext(source, {
    __dirname: workerDir,
    require(id) {
      if (id === "sherpa-onnx-node") return sherpa;
      if (id === "path") return path;
      if (id === "fs") return fs;
      if (id === "readline") return { createInterface: () => ({ on: (_, fn) => { handler = fn; } }) };
      throw new Error("Unexpected module: " + id);
    },
    process: {
      chdir(dir) { cwd = dir; },
      stdin: {},
      stdout: { write(line) { responses.push(JSON.parse(line)); } }
    }
  });
  return {
    configs, responses, workerDir,
    get cwd() { return cwd; },
    request(pack) {
      handler(JSON.stringify({ id: 1, pack, text: "Hello", output: "/tmp/test.wav" }));
      return responses.at(-1);
    }
  };
}

test("all voice packs use short relative native paths under a long Chinese vault path", () => {
  for (const pack of ["kokoro-en", "kokoro-multi", "kokoro-multi-fast", "kokoro-legacy", "vctk"]) {
    const worker = workerHarness();
    assert.equal(worker.cwd, worker.workerDir);
    assert.equal(worker.request(pack).success, true);
    const model = worker.configs[0].model;
    for (const [key, value] of Object.entries(model.kokoro || model.vits)) {
      if (typeof value !== "string") continue;
      for (const file of key === "lexicon" ? value.split(",") : [value]) {
        assert.equal(path.isAbsolute(file), false);
        assert.match(file, /^models[/\\]/);
        assert.equal(Buffer.byteLength(file), file.length);
      }
    }
  }
});

test("missing speech data is reported before the native engine can fall back to Linux paths", () => {
  const worker = workerHarness(["phontab"]);
  const result = worker.request("kokoro-en");
  assert.equal(result.success, false);
  assert.match(result.error, /Model files are missing or unreadable/);
  assert.match(result.error, /espeak-ng-data[/\\]phontab/);
  assert.doesNotMatch(result.error, /\/usr\/share/);
  assert.equal(worker.configs.length, 0);
});

test("missing multilingual model names the requested pack and exact file", () => {
  const worker = workerHarness(["model.int8.onnx"]);
  const result = worker.request("kokoro-multi-fast");
  assert.equal(result.success, false);
  assert.match(result.error, /kokoro-int8-multi-lang-v1_1[/\\]model.int8.onnx/);
  assert.equal(worker.configs.length, 0);
});

for (const code of ["ENOENT", "EACCES", "EPERM"]) {
  test(`preflight retains ${code}, original stack and all failed paths`, () => {
    const worker = workerHarness(["phontab", "phondata"], code);
    const result = worker.request("kokoro-en");
    assert.equal(result.success, false);
    assert.match(result.error, new RegExp(code + ": original filesystem diagnostic"));
    assert.match(result.error, /at Object.accessSync/);
    assert.match(result.error, /phontab/);
    assert.match(result.error, /phondata/);
    assert.equal(worker.configs.length, 0);
  });
}
test("preflight distinguishes directories from missing files", () => {
  const worker = workerHarness([], "ENOENT", true);
  const result = worker.request("kokoro-en");
  assert.match(result.error, /Not a file/);
  assert.match(result.error, /model.onnx/);
  assert.equal(worker.configs.length, 0);
});


test("preflight resolves diagnostics against virtual worker directory, not host cwd", () => {
  const worker = workerHarness(["phontab"]);
  const result = worker.request("kokoro-en");
  const relative = "models/kokoro-en-v0_19/espeak-ng-data/phontab";
  assert.ok(result.error.includes(path.resolve(worker.workerDir, relative)));
  assert.ok(!result.error.includes(path.resolve(relative)));
});
