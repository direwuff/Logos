# Logos

<img width="1672" height="941" alt="8888e3bc-1ed8-425d-84da-cc7ccf89def7" src="https://github.com/user-attachments/assets/fecda308-b407-4bfc-aa11-b728d3e47daa" />


**Logos** is a local-first language-learning and text-to-speech plugin for Obsidian.

Created and developed by **CourtneyJr (@direwuff)** and **王珑珑**.  
Developed with programming, debugging, documentation, packaging, and design assistance from **OpenAI ChatGPT**.


If you'd like to support continued development of Logos and our future projects, you can buy me a coffee below. Thank you!

<h2>☕ Support the Project</h2>

<p align="center">
  <a href="https://buymeacoffee.com/direwuff">
    <img src="docs/images/buy-me-a-coffee-banner.png"
         alt="Support Direwuff on Buy Me a Coffee"
         width="900">
  </a>
</p>

## Features

- Local/offline text-to-speech
- English and multilingual Kokoro voices
- VCTK English speaker support
- Voice filtering by available accent / gender metadata
- Voice previews and favorites
- Reader modes:
  - Entire note
  - Selected text
  - Current paragraph
  - From cursor
- Play, pause, resume, stop, speed control, and seeking
- Long-text chunking and pipelined playback
- WAV and MP3 export
- Long-form audio merging
- Note-adjacent `Logos Audio` exports for Markdown notes
- Automatic audio embedding into Markdown notes
- Searchable PDF text reading
- Direct PDF text-selection reading
- English and Chinese dictionary lookup
- English morphology / lemma routing
- Idioms, phrasal verbs, abbreviations, and learner expressions
- Right-click selected-text lookup and speech
- Ctrl-hover dictionary popup
- Multi-word expression recognition
- Pronunciation practice
- Saved vocabulary
- Vocabulary status: Learning / Known
- Flashcard study mode
- Flashcard filters: Due / All / Learning / Known
- Spaced review:
  - Again · 10m
  - Good · 1d+
  - Easy · 3d+
- Local bundled runtime
- No separate Node.js installation required
- Windows x64 standalone installer
- macOS universal package for Apple Silicon and Intel

## Download

Use the **Releases** section of this repository.

### Windows

Download all three files and keep them in the same folder:

- `Install Logos.exe`
- `Install Logos-1.bin`
- `Install Logos-2.bin`

Then double-click:

`Install Logos.exe`

Choose your main Obsidian vault folder when prompted. Do **not** choose the `.obsidian` folder itself.

After installation:

1. Open Obsidian
2. Open **Settings**
3. Open **Community plugins**
4. Enable **Logos**

### macOS

Download:

- `Logos-Mac-Easy-Install-Part-1.zip`
- `Logos-Mac-Easy-Install-Part-2.zip`

Then:

1. Double-click both ZIP files
2. Keep the extracted folders beside each other
3. Open `Logos Mac Installer`
4. Double-click `Install Logos.command`
5. Choose your main Obsidian vault folder
6. Open Obsidian → **Settings → Community plugins**
7. Enable **Logos**

If macOS blocks the installer because it is from an unidentified developer, Control-click `Install Logos.command`, choose **Open**, then choose **Open** again.

## Updating Logos

For a clean update:

1. Open Obsidian
2. Go to **Settings → Community plugins → Logos**
3. Uninstall the previous version
4. Close Obsidian
5. Install the new version
6. Reopen Obsidian and enable Logos

## User Manuals

This release includes user manuals in:

- English
- Simplified Chinese

## Privacy

Logos is designed to perform its core speech synthesis and dictionary functions locally using bundled resources.

No separate paid TTS API is required for the bundled local voices.

Users should review Obsidian and any other installed plugins separately for their own privacy and network behavior.

## Requirements

- Obsidian
- Windows x64, or
- macOS Apple Silicon / Intel

Logos includes its own runtime. Users do **not** need to install Node.js, npm, Python, or Sherpa-ONNX separately.

## Known limitations

- The current macOS installer is unsigned and may require Control-click → Open the first time.
- Installer packages are large because speech models and local runtime components are bundled.
- Image-only / scanned PDFs cannot be read as selectable text unless they already contain a usable text layer.
- Switching between some speech models may require model reload time.
- Direct PDF audio export does not behave exactly like Markdown note audio embedding.

## Acknowledgements

Logos builds on the work of many open-source projects and language resources.

Special thanks to:

- **sherpa-onnx** by k2-fsa for the local speech-synthesis runtime
- **ONNX Runtime** for local model inference
- **Node.js** for the bundled worker runtime
- **Kokoro-family TTS models** for English and multilingual speech
- **VCTK / VITS-VCTK-derived resources** for additional English voices
- **Princeton WordNet** for English lexical information
- **CC-CEDICT** for Chinese-English dictionary data
- **Tatoeba** for example-sentence data
- **Mozilla PDF.js / pdfjs-dist** for PDF text support
- **@breezystack/lamejs** for MP3 encoding

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for licensing and attribution details.

Logos was created and developed by **CourtneyJr (@direwuff)** and **珑珑王**, with development assistance from **OpenAI ChatGPT**.

## Authors

**CourtneyJr (@direwuff)**  
**王珑珑***

OpenAI ChatGPT was used as a development assistant for programming, debugging, documentation, installer workflows, packaging, UI planning, and release preparation.

## License

The original Logos source code is released under the MIT License.

Bundled third-party libraries, runtimes, models, corpora, dictionaries, and data remain subject to their own licenses. See `THIRD_PARTY_NOTICES.md`.

## Support

Please use GitHub Issues for:

- Bug reports
- Installation problems
- Feature requests
- Voice/model issues

When reporting a bug, include:

- Operating system
- Obsidian version
- Logos version
- What you were doing
- Exact error message
- Screenshot if useful


