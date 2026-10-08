const sherpa = require("sherpa-onnx-node");
const path = require("path");
const readline = require("readline");

const modelsDir =
  path.join(__dirname, "models");

let currentPack = null;
let currentTts = null;

function buildModelConfig(pack) {
  if (pack === "kokoro-en") {
    const base = path.join(
      modelsDir,
      "kokoro-en-v0_19"
    );

    return {
      kokoro: {
        model: path.join(
          base,
          "model.onnx"
        ),
        voices: path.join(
          base,
          "voices.bin"
        ),
        tokens: path.join(
          base,
          "tokens.txt"
        ),
        dataDir: path.join(
          base,
          "espeak-ng-data"
        )
      },
      numThreads: 4,
      debug: false,
      provider: "cpu"
    };
  }

  if (pack === "kokoro-multi") {
    const base = path.join(
      modelsDir,
      "kokoro-multi-lang-v1_1"
    );

    return {
      kokoro: {
        model: path.join(
          base,
          "model.onnx"
        ),
        voices: path.join(
          base,
          "voices.bin"
        ),
        tokens: path.join(
          base,
          "tokens.txt"
        ),
        dataDir: path.join(
          base,
          "espeak-ng-data"
        ),
        lexicon: [
          path.join(
            base,
            "lexicon-us-en.txt"
          ),
          path.join(
            base,
            "lexicon-zh.txt"
          )
        ].join(",")
      },
      numThreads: 4,
      debug: false,
      provider: "cpu"
    };
  }

  if (
    pack ===
    "kokoro-multi-fast"
  ) {
    const base = path.join(
      modelsDir,
      "kokoro-int8-multi-lang-v1_1"
    );

    return {
      kokoro: {
        model: path.join(
          base,
          "model.int8.onnx"
        ),
        voices: path.join(
          base,
          "voices.bin"
        ),
        tokens: path.join(
          base,
          "tokens.txt"
        ),
        dataDir: path.join(
          base,
          "espeak-ng-data"
        ),
        lexicon: [
          path.join(
            base,
            "lexicon-us-en.txt"
          ),
          path.join(
            base,
            "lexicon-zh.txt"
          )
        ].join(",")
      },
      numThreads: 4,
      debug: false,
      provider: "cpu"
    };
  }

  if (
    pack ===
    "kokoro-legacy"
  ) {
    const base = path.join(
      modelsDir,
      "kokoro-multi-lang-v1_0"
    );

    return {
      kokoro: {
        model: path.join(
          base,
          "model.onnx"
        ),
        voices: path.join(
          base,
          "voices.bin"
        ),
        tokens: path.join(
          base,
          "tokens.txt"
        ),
        dataDir: path.join(
          base,
          "espeak-ng-data"
        ),
        lexicon: [
          path.join(
            base,
            "lexicon-us-en.txt"
          ),
          path.join(
            base,
            "lexicon-zh.txt"
          )
        ].join(",")
      },
      numThreads: 4,
      debug: false,
      provider: "cpu"
    };
  }

  if (pack === "vctk") {
    const base = path.join(
      modelsDir,
      "vits-vctk"
    );

    return {
      vits: {
        model: path.join(
          base,
          "vits-vctk.int8.onnx"
        ),
        lexicon: path.join(
          base,
          "lexicon.txt"
        ),
        tokens: path.join(
          base,
          "tokens.txt"
        ),
        noiseScale: 0.667,
        noiseScaleW: 0.8,
        lengthScale: 1.0
      },
      numThreads: 4,
      debug: false,
      provider: "cpu"
    };
  }

  throw new Error(
    `Unknown voice pack: ${pack}`
  );
}

function getTts(pack) {
  if (
    currentTts &&
    currentPack === pack
  ) {
    return {
      tts: currentTts,
      loaded: false
    };
  }

  const modelConfig =
    buildModelConfig(pack);

  const config = {
    model: modelConfig,
    maxNumSentences: 1,
    silenceScale: 0.2
  };

  currentTts =
    new sherpa.OfflineTts(
      config
    );

  currentPack = pack;

  return {
    tts: currentTts,
    loaded: true
  };
}

function respond(data) {
  process.stdout.write(
    JSON.stringify(data) + "\n"
  );
}

function handleRequest(request) {
  const id =
    request.id ?? null;

  try {
    if (
      request.action ===
      "shutdown"
    ) {
      respond({
        id,
        success: true,
        action: "shutdown"
      });

      process.exit(0);
    }

    if (
      request.action === "ping"
    ) {
      respond({
        id,
        success: true,
        action: "pong",
        loadedPack:
          currentPack
      });

      return;
    }

    if (!request.text) {
      throw new Error(
        "Missing TTS text"
      );
    }

    if (!request.output) {
      throw new Error(
        "Missing output path"
      );
    }

    const pack =
      request.pack ||
      "kokoro-en";

    const loadStarted =
      Date.now();

    const {
      tts,
      loaded
    } = getTts(pack);

    const loadMs =
      Date.now() -
      loadStarted;

    const generationConfig =
      new sherpa.GenerationConfig({
        sid:
          request.sid ?? 0,
        speed:
          request.speed ?? 1.0,
        silenceScale: 0.2
      });

    const synthStarted =
      Date.now();

    const audio =
      tts.generate({
        text: request.text,
        generationConfig
      });

    const synthMs =
      Date.now() -
      synthStarted;

    const outputPath =
      path.resolve(
        request.output
      );

    sherpa.writeWave(
      outputPath,
      {
        samples:
          audio.samples,
        sampleRate:
          audio.sampleRate
      }
    );

    respond({
      id,
      success: true,
      pack,
      sid:
        request.sid ?? 0,
      output:
        outputPath,
      duration:
        audio.samples.length /
        audio.sampleRate,
      sampleRate:
        audio.sampleRate,
      modelLoaded:
        loaded,
      loadMs,
      synthMs
    });

  } catch (error) {
    respond({
      id,
      success: false,
      error:
        error &&
        error.stack
          ? error.stack
          : String(error)
    });
  }
}

const rl =
  readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity
  });

rl.on(
  "line",
  line => {
    const trimmed =
      line.trim();

    if (!trimmed) {
      return;
    }

    try {
      const request =
        JSON.parse(trimmed);

      handleRequest(request);

    } catch (error) {
      respond({
        id: null,
        success: false,
        error:
          error &&
          error.stack
            ? error.stack
            : String(error)
      });
    }
  }
);
