# Changelog

All notable changes to Logos will be documented in this file.

The project follows a simple versioned release history.

## [0.1.1] - 2026-10-08

### Improved

- Improved text-to-speech pacing for more natural reading
- Added clearer pauses between Markdown bullet-list items
- Added natural speech boundaries for numbered lists
- Added natural speech boundaries for Markdown task lists
- Added natural pauses after Markdown headings
- Added natural pauses between blockquote lines
- Slightly increased pauses at prose commas while preserving numeric formatting such as `1,000`

### Fixed

- Fixed list items running together during text-to-speech playback
- Fixed Markdown structure being stripped without preserving appropriate spoken boundaries

## [0.1.0] - 2026-10-07

### Added

- Local/offline text-to-speech in Obsidian
- Reader tab with:
  - Entire note
  - Selected text
  - Current paragraph
  - From cursor
- Play / Pause / Resume / Stop controls
- Seeking and speech-speed controls
- Normalize / Raw text handling
- Kokoro English voices
- Kokoro multilingual voices
- Fast multilingual model option
- VCTK speaker support
- Voice metadata, previews, and favorites
- Automatic Chinese text routing to multilingual speech
- Persistent local TTS worker
- Long-text chunking and pipelined playback
- WAV export
- MP3 export
- Long-form audio merging
- Note-adjacent `Logos Audio` folder workflow
- Markdown audio embedding
- Searchable PDF text extraction
- Direct PDF text-selection reading
- English dictionary support
- Chinese dictionary support
- WordNet-derived dictionary data
- CC-CEDICT-derived dictionary data
- Tatoeba-derived examples
- English morphology / lemma lookup
- Learner expressions database
- Idiom lookup
- Phrasal verb lookup
- Abbreviation lookup
- Conversational expression lookup
- Right-click selected-text lookup and speech
- Ctrl-hover dictionary popup
- Multi-word expression recognition
- Pronunciation Practice
- Saved Vocabulary
- Learning / Known vocabulary status
- Flashcard Study Mode
- Due / All / Learning / Known flashcard filters
- Spaced-review scheduling:
  - Again · 10m
  - Good · 1d+
  - Easy · 3d+
- Windows x64 standalone installer
- macOS universal package for Apple Silicon and Intel
- English user manual
- Simplified Chinese user manual
- Authorship and credits files

### Known limitations

- macOS installer is not yet signed or notarized
- Release packages are large because they include local speech models and runtimes
- Scanned/image-only PDFs require a text layer before Logos can read them
- Some model switches require reload time
