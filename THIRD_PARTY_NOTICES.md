# Third-Party Notices

Logos includes, bundles, or uses third-party software, runtime components, speech models, dictionaries, corpora, and derived language data.

This document provides a human-readable attribution index. The original license, notice, README, or model-card files that accompany bundled components should also be preserved in releases whenever available.

## Speech synthesis and runtime

### sherpa-onnx

- Project: sherpa-onnx
- Maintainer: k2-fsa
- Role in Logos: local/offline text-to-speech runtime and native speech libraries
- License: Apache License 2.0

Logos redistributes sherpa-onnx JavaScript/native runtime components for supported platforms.

### ONNX Runtime

- Project: ONNX Runtime
- Maintainer: Microsoft
- Role in Logos: inference runtime used by sherpa-onnx native packages
- License: MIT License

ONNX Runtime also publishes third-party notices for software bundled into the runtime. Preserve those notices when included with redistributed binaries.

### Node.js

- Project: Node.js
- Role in Logos: private bundled JavaScript runtime used by Logos workers
- License: Node.js is distributed under the MIT License together with additional third-party license notices

Logos bundles a private Node.js runtime so users do not need to install Node.js separately.

For release packaging, preserve the complete `LICENSE` file from the exact Node.js binary distribution used to build that Logos release.

## Speech models and voice data

### Kokoro-family TTS models

Logos currently bundles Kokoro-family speech models, including:

- `kokoro-en-v0_19`
- `kokoro-int8-multi-lang-v1_1`
- `kokoro-multi-lang-v1_0`
- `kokoro-multi-lang-v1_1`

Role in Logos: English and multilingual speech generation.

Model licenses may differ between exact model packages or conversions. Preserve the `LICENSE`, `README`, model card, and other notices shipped with each exact model directory. Do not assume one Kokoro model license automatically applies to every converted or multilingual package.

### VITS-VCTK / VCTK-derived voice model

- Role in Logos: additional English speakers / voice selection
- Source corpus/model family: VCTK-derived

The corpus and trained model can have separate attribution or redistribution requirements. Preserve the exact license and README files supplied with the bundled `vits-vctk` model and verify the terms associated with the exact model artifact before public binary distribution.

## Dictionary and language resources

### Princeton WordNet

- Resource: WordNet
- Maintainer/source: Princeton University
- Role in Logos: English lexical and dictionary information
- License: WordNet License

Redistributions of WordNet-derived material should preserve the WordNet copyright notice, license conditions, and disclaimer associated with the dataset version used.

### CC-CEDICT

- Resource: CC-CEDICT
- Role in Logos: Chinese-English dictionary data

Preserve the license and attribution notice associated with the exact CC-CEDICT snapshot used to build the Logos dictionary database.

### Tatoeba

- Resource: Tatoeba
- Role in Logos: example sentence data

Tatoeba textual sentences can carry Creative Commons licenses and attribution obligations. Preserve the license/author attribution information associated with the exact sentence export used by Logos.

### Logos Learner Expressions

- Resource: `dictionaries/core/learner-expressions.json`
- Role in Logos: learner-focused abbreviations, idioms, phrasal verbs, and conversational expressions

This Logos-specific learner-expression resource was prepared for the project and is not intended to replace attribution required by third-party dictionary or corpus data.

## PDF support

### Mozilla PDF.js / pdfjs-dist

- Project: Mozilla PDF.js
- Package: `pdfjs-dist`
- Role in Logos: PDF text extraction and PDF reading support
- License: Apache License 2.0

Preserve the upstream license when redistributing `pdfjs-dist`.

## Audio export

### @breezystack/lamejs

- Package: `@breezystack/lamejs`
- Based on: lamejs
- Role in Logos: MP3 audio encoding/export
- License: LGPL-3.0

Because Logos bundles this library into generated JavaScript, the exact LGPL redistribution obligations should be reviewed for the final release format. Preserve the upstream LGPL license and source/relinking information required by that license.

## Obsidian

Logos is an independent community plugin for Obsidian.

Obsidian is a product of Dynalist Inc. Logos is not endorsed by or affiliated with Obsidian unless explicitly stated otherwise.

## OpenAI ChatGPT

OpenAI ChatGPT was used as a development assistant for programming, debugging, documentation, packaging, installer workflows, UI planning, and release preparation.

OpenAI does not own or maintain Logos solely because ChatGPT was used during development.

## Authors of Logos

Logos was created and developed by:

- CourtneyJr (`@direwuff` on GitHub)
- 珑珑王

## Release-license checklist

Before publishing a public binary release, confirm that the release contains or preserves the exact notices required by the bundled versions of:

- sherpa-onnx
- ONNX Runtime and its third-party notices
- Node.js and its third-party notices
- PDF.js / pdfjs-dist
- @breezystack/lamejs / LGPL-3.0
- WordNet
- CC-CEDICT
- Tatoeba-derived data
- every Kokoro model package
- VITS-VCTK / VCTK-derived model data

Where a model or dataset directory already contains a `LICENSE`, `NOTICE`, `COPYING`, `README`, or model card, keep that file with the distributed artifact.
