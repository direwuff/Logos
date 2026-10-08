import {
  Editor,
  FileSystemAdapter,
  ItemView,
  MarkdownView,
  Notice,
  Plugin,
  WorkspaceLeaf
} from "obsidian";

import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

interface VctkSpeaker {
  sid: number;
  id: string;
  gender: string;
  accent: string;
  region: string;
}

import * as lame from "@breezystack/lamejs";

const LOGOS_VIEW_TYPE = "logos-player-view";

type ReadingMode =
  | "note"
  | "selection"
  | "paragraph"
  | "cursor";

type VoicePack =
  | "kokoro-en"
  | "kokoro-multi"
  | "kokoro-multi-fast"
  | "vctk";

interface LogosVoice {
  id: number;
  name: string;
}

interface SavedVocabularyItem {
  key: string;
  word: string;
  language: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  source: string;
  savedAt: string;
  status: "learning" | "known";

  reviewCount?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  reviewIntervalDays?: number;
}

interface LogosSettings {
  readingMode: ReadingMode;
  voicePack: VoicePack;
  speakerId: number;
  speechRate: number;
  audioProcessing: "raw" | "normalize";
  vctkAccent: string;
  vctkGender: string;
  favoriteVoices: string[];
  voiceListMode: "all" | "favorites";
  savedVocabulary: SavedVocabularyItem[];
}

const DEFAULT_SETTINGS: LogosSettings = {
  readingMode: "note",
  voicePack: "kokoro-en",
  speakerId: 0,
  speechRate: 1.0,
  audioProcessing: "normalize",
  vctkAccent: "All",
  vctkGender: "All",
  favoriteVoices: [],
  voiceListMode: "all",
  savedVocabulary: []
};

class LogosPlayerView extends ItemView {
  plugin: LogosPlugin;

  constructor(
    leaf: WorkspaceLeaf,
    plugin: LogosPlugin
  ) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return LOGOS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Logos";
  }

  getIcon(): string {
    return "audio-lines";
  }

  async onOpen() {
    this.render();
  }

  render() {
    const container =
      this.containerEl.children[1];

    container.empty();
    container.addClass("logos-player");

    container.createEl("h2", {
      text: "Logos"
    });

    container.createEl("p", {
      text:
        "Local multilingual text-to-speech and pronunciation tools."
    });

    const modeTabs =
      container.createDiv({
        cls: "logos-mode-tabs"
      });

    const readerTab =
      modeTabs.createEl(
        "button",
        {
          text: "Reader"
        }
      );

    const dictionaryTab =
      modeTabs.createEl(
        "button",
        {
          text: "Dictionary"
        }
      );

    const vocabularyTab =
      modeTabs.createEl(
        "button",
        {
          text: "Vocabulary"
        }
      );

    const readerContainer =
      container.createDiv({
        cls: "logos-reader-container"
      });

    const dictionaryContainer =
      container.createDiv({
        cls:
          "logos-dictionary-container"
      });

    const vocabularyContainer =
      container.createDiv({
        cls:
          "logos-vocabulary-container"
      });

    // LOGOS_DICTIONARY_UI_START

    dictionaryContainer.createEl(
      "h3",
      {
        text: "Dictionary"
      }
    );

    const dictionarySearch =
      dictionaryContainer.createEl(
        "input"
      );

    dictionarySearch.type = "text";

    dictionarySearch.placeholder =
      "Search word, pinyin, or definition...";

    dictionarySearch.addClass(
      "logos-dictionary-search"
    );

    const dictionaryOptions =
      dictionaryContainer.createDiv({
        cls: "logos-dictionary-options"
      });

    dictionaryOptions.createEl(
      "label",
      {
        text: "Language"
      }
    );

    const languageSelect =
      dictionaryOptions.createEl(
        "select"
      );

    const languages = [
      ["all", "All languages"],
      ["en", "English"],
      ["zh-Hans", "Chinese (Simplified)"],
      ["zh-Hant", "Chinese (Traditional)"]
    ];

    for (
      const [value, label]
      of languages
    ) {
      const option =
        languageSelect.createEl(
          "option"
        );

      option.value = value;
      option.text = label;

      if (
        value ===
        this.plugin.dictionaryLanguage
      ) {
        option.selected = true;
      }
    }

    dictionaryOptions.createEl(
      "label",
      {
        text: "Match"
      }
    );

    const matchSelect =
      dictionaryOptions.createEl(
        "select"
      );

    const matchModes = [
      ["smart", "Smart"],
      ["exact", "Exact"],
      ["contains", "Contains"]
    ];

    for (
      const [value, label]
      of matchModes
    ) {
      const option =
        matchSelect.createEl(
          "option"
        );

      option.value = value;
      option.text = label;

      if (
        value ===
        this.plugin.dictionaryMatchMode
      ) {
        option.selected = true;
      }
    }

    languageSelect.onchange =
      () => {
        this.plugin.dictionaryLanguage =
          languageSelect.value;
      };

    matchSelect.onchange =
      () => {
        this.plugin.dictionaryMatchMode =
          matchSelect.value as
            "smart" |
            "exact" |
            "contains";
      };

    const dictionarySearchButton =
      dictionaryContainer.createEl(
        "button",
        {
          text: "Search"
        }
      );

    const resultsContainer =
      dictionaryContainer.createDiv({
        cls: "logos-dictionary-results"
      });

    const runDictionarySearch =
      async () => {

        const query =
          dictionarySearch.value.trim();

        resultsContainer.empty();

        if (!query) {
          resultsContainer.createEl(
            "p",
            {
              text:
                "Enter a word to search."
            }
          );

          return;
        }

        resultsContainer.createEl(
          "p",
          {
            text: "Searching..."
          }
        );

        const results =
          await this.plugin
            .searchDictionary(
              query
            );

        resultsContainer.empty();

        if (
          results.length === 0
        ) {
          resultsContainer.createEl(
            "p",
            {
              text:
                "No dictionary entries found."
            }
          );

          return;
        }

        const languageNames:
          Record<string, string> = {
            "en": "English",
            "zh-Hans": "Chinese · Simplified",
            "zh-Hant": "Chinese · Traditional"
          };

        const normalizedQuery =
          query.toLocaleLowerCase();

        const exactResults =
          results.filter(
            result =>
              String(result.word)
                .toLocaleLowerCase() ===
              normalizedQuery
          );

        const relatedResults =
          results.filter(
            result =>
              String(result.word)
                .toLocaleLowerCase() !==
              normalizedQuery
          );

        const renderResultGroups = (
          resultList: any[],
          related = false
        ) => {

          const wordGroups =
            new Map<string, any[]>();

          for (
            const result of resultList
          ) {
            const key =
              `${result.language}::${result.word}`;

            if (!wordGroups.has(key)) {
              wordGroups.set(
                key,
                []
              );
            }

            wordGroups
              .get(key)!
              .push(result);
          }

          for (
            const [, group]
            of wordGroups
          ) {
            const first =
              group[0];

            const card =
              resultsContainer.createDiv({
                cls:
                  related
                    ? "logos-dictionary-entry logos-dictionary-related"
                    : "logos-dictionary-entry"
              });

            card.createEl(
              related ? "h5" : "h4",
              {
                text:
                  first.word
              }
            );


            const queryWord =
              query
                .trim()
                .toLocaleLowerCase();

            const resultWord =
              String(
                first.word || ""
              )
                .trim()
                .toLocaleLowerCase();

            if (
              first.language === "en" &&
              queryWord &&
              resultWord &&
              this.plugin
                .isPlausibleEnglishLemma(
                  query,
                  String(
                    first.word || ""
                  )
                )
            ) {
              card.createDiv({
                cls:
                  "logos-dictionary-base-form",
                text:
                  `${query} → base form: ${first.word}`
              });
            }


            const actions =
              card.createDiv({
                cls:
                  "logos-dictionary-actions"
              });

            const speakButton =
              actions.createEl(
                "button",
                {
                  text:
                    "🔊 Speak"
                }
              );

            speakButton.onclick =
              async () => {
                await this.plugin
                  .speakDictionaryEntry(
                    first.word,
                    first.language
                  );
              };


            const saveButton =
              actions.createEl(
                "button"
              );

            const updateSaveButton =
              () => {
                saveButton.setText(
                  this.plugin
                    .isVocabularySaved(
                      first.word,
                      first.language
                    )
                    ? "★ Saved"
                    : "☆ Save"
                );
              };

            updateSaveButton();

            saveButton.onclick =
              async () => {

                const firstDefinition =
                  group.find(
                    item =>
                      String(
                        item.definition ||
                        ""
                      ).trim()
                  );

                const firstPos =
                  group.find(
                    item =>
                      String(
                        item.part_of_speech ||
                        ""
                      ).trim()
                  );

                let firstExample = "";

                for (
                  const entry
                  of group
                ) {
                  const examples =
                    Array.isArray(
                      entry.examples
                    )
                      ? entry.examples
                      : [];

                  const example =
                    examples.find(
                      item =>
                        String(
                          item.sentence ||
                          ""
                        ).trim()
                    );

                  if (example) {
                    firstExample =
                      String(
                        example.sentence
                      ).trim();

                    break;
                  }
                }

                await this.plugin
                  .saveVocabularyItem({
                    word:
                      String(
                        first.word ||
                        ""
                      ).trim(),

                    language:
                      String(
                        first.language ||
                        ""
                      ).trim(),

                    pronunciation:
                      String(
                        first.pronunciation ||
                        ""
                      ).trim(),

                    partOfSpeech:
                      String(
                        firstPos
                          ?.part_of_speech ||
                        ""
                      ).trim(),

                    definition:
                      String(
                        firstDefinition
                          ?.definition ||
                        ""
                      ).trim(),

                    example:
                      firstExample,

                    source:
                      String(
                        first.source ||
                        ""
                      ).trim()
                  });

                updateSaveButton();
              };

            card.createEl(
              "div",
              {
                cls:
                  "logos-dictionary-meta",
                text:
                  languageNames[
                    first.language
                  ] ||
                  first.language
              }
            );

            if (
              first.pronunciation
            ) {
              card.createEl(
                "div",
                {
                  cls:
                    "logos-dictionary-pronunciation",
                  text:
                    first.pronunciation
                }
              );
            }

            const posGroups =
              new Map<
                string,
                any[]
              >();

            for (
              const result of group
            ) {
              const pos =
                result.part_of_speech ||
                "meaning";

              if (
                !posGroups.has(pos)
              ) {
                posGroups.set(
                  pos,
                  []
                );
              }

              posGroups
                .get(pos)!
                .push(result);
            }

            for (
              const [
                pos,
                senses
              ]
              of posGroups
            ) {
              if (
                pos !== "meaning"
              ) {
                card.createEl(
                  "div",
                  {
                    cls:
                      "logos-dictionary-pos",
                    text:
                      pos.toUpperCase()
                  }
                );
              }

              const senseList =
                card.createEl(
                  "ol",
                  {
                    cls:
                      "logos-dictionary-senses"
                  }
                );

              const seenDefinitions =
                new Set<string>();

              for (
                const sense
                of senses
              ) {
                const definition =
                  String(
                    sense.definition ||
                    ""
                  ).trim();

                if (
                  !definition ||
                  seenDefinitions.has(
                    definition
                  )
                ) {
                  continue;
                }

                seenDefinitions.add(
                  definition
                );

                const item =
                  senseList.createEl(
                    "li"
                  );

                item.setText(
                  definition
                );

                const examples =
                  Array.isArray(
                    sense.examples
                  )
                    ? sense.examples
                    : [];

                if (
                  examples.length > 0
                ) {
                  const exampleList =
                    item.createDiv({
                      cls:
                        "logos-sense-examples"
                    });

                  for (
                    const example
                    of examples
                  ) {
                    const exampleRow =
                      exampleList.createDiv({
                        cls:
                          "logos-example-row"
                      });

                    const exampleText =
                      exampleRow.createDiv({
                        cls:
                          "logos-example-text"
                      });

                    exampleText.createSpan({
                      cls:
                        "logos-example-label",
                      text:
                        "Example: "
                    });

                    exampleText.createSpan({
                      text:
                        example.sentence
                    });

                    const exampleSpeak =
                      exampleRow.createEl(
                        "button",
                        {
                          text: "🔊"
                        }
                      );

                    exampleSpeak.title =
                      "Hear example";

                    exampleSpeak.onclick =
                      async () => {
                        await this.plugin
                          .speakDictionaryEntry(
                            example.sentence,
                            sense.language
                          );
                      };

                    if (
                      example.translation
                    ) {
                      exampleRow.createDiv({
                        cls:
                          "logos-example-translation",
                        text:
                          example.translation
                      });
                    }
                  }
                }

              }
            }

            const bilingualExamples =
              Array.isArray(
                first.bilingualExamples
              )
                ? first.bilingualExamples
                : [];

            if (
              bilingualExamples.length > 0
            ) {
              card.createEl(
                "div",
                {
                  cls:
                    "logos-bilingual-heading",
                  text:
                    "Bilingual examples"
                }
              );

              for (
                const pair
                of bilingualExamples
              ) {
                const pairBox =
                  card.createDiv({
                    cls:
                      "logos-bilingual-pair"
                  });

                const englishRow =
                  pairBox.createDiv({
                    cls:
                      "logos-bilingual-row"
                  });

                englishRow.createSpan({
                  cls:
                    "logos-bilingual-language",
                  text:
                    "English"
                });

                englishRow.createDiv({
                  cls:
                    "logos-bilingual-sentence",
                  text:
                    pair.english_sentence
                });

                const englishSpeak =
                  englishRow.createEl(
                    "button",
                    {
                      text: "🔊"
                    }
                  );

                englishSpeak.title =
                  "Hear English example";

                englishSpeak.onclick =
                  async () => {
                    await this.plugin
                      .speakDictionaryEntry(
                        pair.english_sentence,
                        "en"
                      );
                  };

                const chineseRow =
                  pairBox.createDiv({
                    cls:
                      "logos-bilingual-row"
                  });

                chineseRow.createSpan({
                  cls:
                    "logos-bilingual-language",
                  text:
                    "中文"
                });

                chineseRow.createDiv({
                  cls:
                    "logos-bilingual-sentence",
                  text:
                    pair.chinese_sentence
                });

                const chineseSpeak =
                  chineseRow.createEl(
                    "button",
                    {
                      text: "🔊"
                    }
                  );

                chineseSpeak.title =
                  "Hear Chinese example";

                chineseSpeak.onclick =
                  async () => {
                    await this.plugin
                      .speakDictionaryEntry(
                        pair.chinese_sentence,
                        "zh-Hans"
                      );
                  };
              }
            }

            card.createEl(
              "small",
              {
                cls:
                  "logos-dictionary-source",
                text:
                  `Source: ${first.source}`
              }
            );

          }
        };

        if (
          exactResults.length > 0
        ) {
          renderResultGroups(
            exactResults
          );
        }

        if (
          relatedResults.length > 0
        ) {
          if (
            exactResults.length > 0
          ) {
            resultsContainer.createEl(
              "h4",
              {
                cls:
                  "logos-related-heading",
                text:
                  "Related results"
              }
            );
          }

          renderResultGroups(
            relatedResults,
            true
          );
        }
      };

    dictionarySearchButton.onclick =
      () => {
        void runDictionarySearch();
      };

    dictionarySearch.onkeydown =
      event => {

        if (
          event.key === "Enter"
        ) {
          event.preventDefault();

          void runDictionarySearch();
        }
      };

    const pendingDictionaryLookup =
      this.plugin
        .pendingDictionaryLookup;

    if (
      pendingDictionaryLookup
    ) {
      dictionarySearch.value =
        pendingDictionaryLookup;

      this.plugin
        .pendingDictionaryLookup =
        null;

      void runDictionarySearch();
    }

    // LOGOS_DICTIONARY_UI_END

    let vocabularyViewMode:
      "list" | "flashcards" =
        "list";

    let flashcardIndex = 0;

    let flashcardRevealed =
      false;

    let flashcardOrder:
      string[] = [];

    let vocabularyStudyFilter:
      "due" |
      "all" |
      "learning" |
      "known" =
        "due";

    const isVocabularyDue =
      (
        item:
          SavedVocabularyItem
      ) => {

        if (
          !item.nextReviewAt
        ) {
          return true;
        }

        const next =
          Date.parse(
            item.nextReviewAt
          );

        if (
          Number.isNaN(next)
        ) {
          return true;
        }

        return (
          next <= Date.now()
        );
      };

    const scheduleVocabularyReview =
      async (
        item:
          SavedVocabularyItem,
        rating:
          "again" |
          "good" |
          "easy"
      ) => {

        const now =
          new Date();

        const oldInterval =
          Math.max(
            0,
            Number(
              item.reviewIntervalDays ||
              0
            )
          );

        let nextInterval = 0;

        if (
          rating === "again"
        ) {
          nextInterval = 0;

          item.status =
            "learning";

        } else if (
          rating === "good"
        ) {
          nextInterval =
            oldInterval <= 1
              ? 1
              : Math.max(
                  1,
                  Math.round(
                    oldInterval *
                    1.8
                  )
                );

          item.status =
            "learning";

        } else {
          nextInterval =
            oldInterval <= 1
              ? 3
              : Math.max(
                  3,
                  Math.round(
                    oldInterval *
                    2.5
                  )
                );

          if (
            nextInterval >= 7
          ) {
            item.status =
              "known";
          }
        }

        const next =
          new Date(
            now.getTime()
          );

        if (
          rating === "again"
        ) {
          // Keep it due today.
          next.setMinutes(
            next.getMinutes() +
            10
          );

        } else {
          next.setDate(
            next.getDate() +
            nextInterval
          );
        }

        item.reviewCount =
          Number(
            item.reviewCount ||
            0
          ) + 1;

        item.lastReviewedAt =
          now.toISOString();

        item.reviewIntervalDays =
          nextInterval;

        item.nextReviewAt =
          next.toISOString();

        await this.plugin
          .saveSettings();
      };

    const getFlashcardItems =
      () => {

        const allItems =
          this.plugin
            .savedVocabulary;

        const items =
          vocabularyStudyFilter ===
            "all"
            ? allItems
            : vocabularyStudyFilter ===
                "due"
              ? allItems.filter(
                  item =>
                    isVocabularyDue(
                      item
                    )
                )
              : allItems.filter(
                  item =>
                    item.status ===
                      vocabularyStudyFilter
                );

        if (
          flashcardOrder.length !==
            items.length ||
          flashcardOrder.some(
            key =>
              !items.some(
                item =>
                  item.key === key
              )
          )
        ) {
          flashcardOrder =
            items.map(
              item => item.key
            );
        }

        return flashcardOrder
          .map(
            key =>
              items.find(
                item =>
                  item.key === key
              )
          )
          .filter(
            (
              item
            ): item is SavedVocabularyItem =>
              Boolean(item)
          );
      };

    const renderVocabulary =
      () => {

        vocabularyContainer.empty();

        vocabularyContainer.createEl(
          "h3",
          {
            text:
              "Saved Vocabulary"
          }
        );

        const count =
          this.plugin
            .savedVocabulary
            .length;

        vocabularyContainer.createEl(
          "p",
          {
            cls:
              "logos-vocabulary-count",
            text:
              `${count} saved ${
                count === 1
                  ? "word"
                  : "words"
              }`
          }
        );

        const modeRow =
          vocabularyContainer
            .createDiv({
              cls:
                "logos-vocabulary-mode-row"
            });

        modeRow.style.display =
          "flex";

        modeRow.style.gap =
          "6px";

        modeRow.style.marginBottom =
          "12px";

        const listButton =
          modeRow.createEl(
            "button",
            {
              text: "List"
            }
          );

        const flashcardsButton =
          modeRow.createEl(
            "button",
            {
              text:
                "Flashcards"
            }
          );

        if (
          vocabularyViewMode ===
          "list"
        ) {
          listButton.addClass(
            "is-active"
          );
        } else {
          flashcardsButton.addClass(
            "is-active"
          );
        }

        listButton.onclick =
          () => {
            vocabularyViewMode =
              "list";

            renderVocabulary();
          };

        flashcardsButton.onclick =
          () => {
            vocabularyViewMode =
              "flashcards";

            flashcardRevealed =
              false;

            renderVocabulary();
          };

        if (
          vocabularyViewMode ===
          "flashcards"
        ) {
          const dueCount =
            this.plugin
              .savedVocabulary
              .filter(
                item =>
                  isVocabularyDue(
                    item
                  )
              )
              .length;

          const learningCount =
            this.plugin
              .savedVocabulary
              .filter(
                item =>
                  item.status ===
                    "learning"
              )
              .length;

          const knownCount =
            this.plugin
              .savedVocabulary
              .filter(
                item =>
                  item.status ===
                    "known"
              )
              .length;

          const filterRow =
            vocabularyContainer
              .createDiv({
                cls:
                  "logos-flashcard-filter-row"
              });

          filterRow.style.display =
            "flex";

          filterRow.style.gap =
            "6px";

          filterRow.style.flexWrap =
            "wrap";

          filterRow.style.marginBottom =
            "12px";

          const filters = [
            {
              value: "due",
              label:
                `Due (${dueCount})`
            },
            {
              value: "all",
              label:
                `All (${count})`
            },
            {
              value: "learning",
              label:
                `Learning (${learningCount})`
            },
            {
              value: "known",
              label:
                `Known (${knownCount})`
            }
          ] as const;

          for (
            const filter
            of filters
          ) {
            const button =
              filterRow.createEl(
                "button",
                {
                  text:
                    filter.label
                }
              );

            if (
              vocabularyStudyFilter ===
                filter.value
            ) {
              button.addClass(
                "is-active"
              );
            }

            button.onclick =
              () => {

                vocabularyStudyFilter =
                  filter.value;

                flashcardOrder = [];

                flashcardIndex = 0;

                flashcardRevealed =
                  false;

                renderVocabulary();
              };
          }
        }

        if (count === 0) {
          vocabularyContainer
            .createEl(
              "p",
              {
                text:
                  "No vocabulary saved yet. Use ☆ Save in the Dictionary."
              }
            );

          return;
        }

        // =================================
        // FLASHCARD STUDY MODE
        // =================================

        if (
          vocabularyViewMode ===
          "flashcards"
        ) {
          const studyItems =
            getFlashcardItems();

          if (
            flashcardIndex >=
            studyItems.length
          ) {
            flashcardIndex =
              Math.max(
                0,
                studyItems.length -
                  1
              );
          }

          const item =
            studyItems[
              flashcardIndex
            ];

          if (!item) {
            vocabularyContainer
              .createEl(
                "p",
                {
                  cls:
                    "logos-flashcard-empty",
                  text:
                    vocabularyStudyFilter ===
                      "due"
                      ? "You're caught up. No cards are due right now."
                      : vocabularyStudyFilter ===
                          "known"
                        ? "No known cards yet."
                        : vocabularyStudyFilter ===
                            "learning"
                          ? "No learning cards right now."
                          : "No flashcards available."
                }
              );

            return;
          }

          const progress =
            vocabularyContainer
              .createDiv({
                cls:
                  "logos-flashcard-progress",
                text:
                  `${
                    flashcardIndex + 1
                  } / ${
                    studyItems.length
                  }`
              });

          progress.style.textAlign =
            "center";

          progress.style.opacity =
            "0.7";

          progress.style.marginBottom =
            "8px";

          const card =
            vocabularyContainer
              .createDiv({
                cls:
                  "logos-flashcard"
              });

          card.style.border =
            "1px solid var(--background-modifier-border)";

          card.style.borderRadius =
            "10px";

          card.style.padding =
            "20px";

          card.style.minHeight =
            "180px";

          card.style.textAlign =
            "center";

          card.style.display =
            "flex";

          card.style.flexDirection =
            "column";

          card.style.justifyContent =
            "center";

          card.style.marginBottom =
            "10px";

          const word =
            card.createEl(
              "h2",
              {
                text:
                  item.word
              }
            );

          word.style.margin =
            "0 0 10px 0";

          if (
            !flashcardRevealed
          ) {
            const hint =
              card.createDiv({
                text:
                  "Think of the meaning, then reveal the answer."
              });

            hint.style.opacity =
              "0.65";

            hint.style.marginBottom =
              "12px";

            const reveal =
              card.createEl(
                "button",
                {
                  text:
                    "Reveal"
                }
              );

            reveal.onclick =
              () => {
                flashcardRevealed =
                  true;

                renderVocabulary();
              };

          } else {

            if (
              item.pronunciation
            ) {
              card.createDiv({
                cls:
                  "logos-flashcard-pronunciation",
                text:
                  item.pronunciation
              });
            }

            if (
              item.partOfSpeech
            ) {
              const pos =
                card.createDiv({
                  cls:
                    "logos-flashcard-pos",
                  text:
                    item.partOfSpeech
                      .toUpperCase()
                });

              pos.style.opacity =
                "0.7";

              pos.style.marginTop =
                "6px";
            }

            if (
              item.definition
            ) {
              const definition =
                card.createDiv({
                  cls:
                    "logos-flashcard-definition",
                  text:
                    item.definition
                });

              definition.style.marginTop =
                "12px";

              definition.style.whiteSpace =
                "pre-line";
            }

            if (
              item.example
            ) {
              const example =
                card.createDiv({
                  cls:
                    "logos-flashcard-example",
                  text:
                    `Example: ${
                      item.example
                    }`
                });

              example.style.marginTop =
                "12px";

              example.style.fontStyle =
                "italic";
            }
          }

          if (
            flashcardRevealed
          ) {
            const reviewRow =
              vocabularyContainer
                .createDiv({
                  cls:
                    "logos-flashcard-review-actions"
                });

            reviewRow.style.display =
              "flex";

            reviewRow.style.gap =
              "6px";

            reviewRow.style.justifyContent =
              "center";

            reviewRow.style.flexWrap =
              "wrap";

            reviewRow.style.marginBottom =
              "10px";

            const again =
              reviewRow.createEl(
                "button",
                {
                  text:
                    "Again · 10m"
                }
              );

            const good =
              reviewRow.createEl(
                "button",
                {
                  text:
                    "Good · 1d+"
                }
              );

            const easy =
              reviewRow.createEl(
                "button",
                {
                  text:
                    "Easy · 3d+"
                }
              );

            const completeReview =
              async (
                rating:
                  "again" |
                  "good" |
                  "easy"
              ) => {

                await scheduleVocabularyReview(
                  item,
                  rating
                );

                flashcardRevealed =
                  false;

                flashcardOrder = [];

                const remaining =
                  getFlashcardItems();

                if (
                  remaining.length === 0
                ) {
                  flashcardIndex = 0;

                } else if (
                  flashcardIndex >=
                    remaining.length
                ) {
                  flashcardIndex =
                    remaining.length -
                    1;
                }

                renderVocabulary();
              };

            again.onclick =
              () => {
                void completeReview(
                  "again"
                );
              };

            good.onclick =
              () => {
                void completeReview(
                  "good"
                );
              };

            easy.onclick =
              () => {
                void completeReview(
                  "easy"
                );
              };
          }

          const primaryActions =
            vocabularyContainer
              .createDiv({
                cls:
                  "logos-flashcard-actions"
              });

          primaryActions.style.display =
            "flex";

          primaryActions.style.gap =
            "6px";

          primaryActions.style.flexWrap =
            "wrap";

          primaryActions.style.justifyContent =
            "center";

          const speak =
            primaryActions
              .createEl(
                "button",
                {
                  text:
                    "🔊 Speak"
                }
              );

          speak.onclick =
            async () => {
              await this.plugin
                .speakDictionaryEntry(
                  item.word,
                  item.language
                );
            };

          const status =
            primaryActions
              .createEl(
                "button",
                {
                  text:
                    item.status ===
                      "known"
                      ? "✓ Known"
                      : "Learning"
                }
              );

          status.onclick =
            async () => {

              item.status =
                item.status ===
                  "known"
                  ? "learning"
                  : "known";

              await this.plugin
                .saveSettings();

              renderVocabulary();
            };

          const shuffle =
            primaryActions
              .createEl(
                "button",
                {
                  text:
                    "🔀 Shuffle"
                }
              );

          shuffle.onclick =
            () => {

              const keys =
                this.plugin
                  .savedVocabulary
                  .map(
                    saved =>
                      saved.key
                  );

              for (
                let index =
                  keys.length - 1;
                index > 0;
                index -= 1
              ) {
                const swapIndex =
                  Math.floor(
                    Math.random() *
                      (index + 1)
                  );

                [
                  keys[index],
                  keys[swapIndex]
                ] = [
                  keys[swapIndex],
                  keys[index]
                ];
              }

              flashcardOrder =
                keys;

              flashcardIndex = 0;

              flashcardRevealed =
                false;

              renderVocabulary();
            };

          const navigation =
            vocabularyContainer
              .createDiv({
                cls:
                  "logos-flashcard-navigation"
              });

          navigation.style.display =
            "flex";

          navigation.style.alignItems =
            "center";

          navigation.style.justifyContent =
            "space-between";

          navigation.style.gap =
            "8px";

          navigation.style.marginTop =
            "10px";

          const previous =
            navigation.createEl(
              "button",
              {
                text:
                  "← Previous"
              }
            );

          previous.disabled =
            studyItems.length <= 1;

          previous.onclick =
            () => {

              flashcardIndex =
                (
                  flashcardIndex -
                  1 +
                  studyItems.length
                ) %
                studyItems.length;

              flashcardRevealed =
                false;

              renderVocabulary();
            };

          navigation.createSpan({
            text:
              `${
                flashcardIndex + 1
              } / ${
                studyItems.length
              }`
          });

          const next =
            navigation.createEl(
              "button",
              {
                text:
                  "Next →"
              }
            );

          next.disabled =
            studyItems.length <= 1;

          next.onclick =
            () => {

              flashcardIndex =
                (
                  flashcardIndex +
                  1
                ) %
                studyItems.length;

              flashcardRevealed =
                false;

              renderVocabulary();
            };

          return;
        }

        // =================================
        // NORMAL VOCABULARY LIST
        // =================================

        const sorted =
          [
            ...this.plugin
              .savedVocabulary
          ]
            .sort(
              (a, b) =>
                a.word.localeCompare(
                  b.word
                )
            );

        for (
          const item
          of sorted
        ) {
          const card =
            vocabularyContainer
              .createDiv({
                cls:
                  "logos-vocabulary-entry"
              });

          const headingRow =
            card.createDiv({
              cls:
                "logos-vocabulary-heading"
            });

          headingRow.createEl(
            "h4",
            {
              text:
                item.word
            }
          );

          headingRow.createSpan({
            cls:
              "logos-vocabulary-language",
            text:
              item.language === "en"
                ? "English"
                : item.language ===
                    "zh-Hans"
                  ? "中文 · 简体"
                  : item.language ===
                      "zh-Hant"
                    ? "中文 · 繁體"
                    : item.language
          });

          if (
            item.pronunciation
          ) {
            card.createDiv({
              cls:
                "logos-vocabulary-pronunciation",
              text:
                item.pronunciation
            });
          }

          if (
            item.partOfSpeech
          ) {
            card.createDiv({
              cls:
                "logos-vocabulary-pos",
              text:
                item.partOfSpeech
                  .toUpperCase()
            });
          }

          if (
            item.definition
          ) {
            const definition =
              card.createDiv({
                cls:
                  "logos-vocabulary-definition",
                text:
                  item.definition
              });

            definition.style.whiteSpace =
              "pre-line";
          }

          if (
            item.example
          ) {
            const example =
              card.createDiv({
                cls:
                  "logos-vocabulary-example"
              });

            example.createSpan({
              text:
                "Example: "
            });

            example.createSpan({
              text:
                item.example
            });
          }

          const actions =
            card.createDiv({
              cls:
                "logos-vocabulary-actions"
            });

          const speak =
            actions.createEl(
              "button",
              {
                text:
                  "🔊 Speak"
              }
            );

          speak.onclick =
            async () => {
              await this.plugin
                .speakDictionaryEntry(
                  item.word,
                  item.language
                );
            };

          const status =
            actions.createEl(
              "button",
              {
                text:
                  item.status ===
                    "known"
                    ? "✓ Known"
                    : "Learning"
              }
            );

          status.onclick =
            async () => {

              item.status =
                item.status ===
                  "known"
                  ? "learning"
                  : "known";

              await this.plugin
                .saveSettings();

              renderVocabulary();
            };

          const remove =
            actions.createEl(
              "button",
              {
                text:
                  "Remove"
              }
            );

          remove.onclick =
            async () => {

              this.plugin
                .savedVocabulary =
                this.plugin
                  .savedVocabulary
                  .filter(
                    saved =>
                      saved.key !==
                      item.key
                  );

              flashcardOrder =
                flashcardOrder.filter(
                  key =>
                    key !==
                    item.key
                );

              if (
                flashcardIndex >=
                this.plugin
                  .savedVocabulary
                  .length
              ) {
                flashcardIndex =
                  Math.max(
                    0,
                    this.plugin
                      .savedVocabulary
                      .length -
                      1
                  );
              }

              await this.plugin
                .saveSettings();

              renderVocabulary();
            };
        }
      };

    const updateMainMode = () => {
      const mode =
        this.plugin.logosMode;

      const readerMode =
        mode === "reader";

      const dictionaryMode =
        mode === "dictionary";

      const vocabularyMode =
        mode === "vocabulary";

      readerContainer.style.display =
        readerMode
          ? ""
          : "none";

      dictionaryContainer.style.display =
        dictionaryMode
          ? ""
          : "none";

      vocabularyContainer.style.display =
        vocabularyMode
          ? ""
          : "none";

      readerTab.toggleClass(
        "is-active",
        readerMode
      );

      dictionaryTab.toggleClass(
        "is-active",
        dictionaryMode
      );

      vocabularyTab.toggleClass(
        "is-active",
        vocabularyMode
      );

      if (vocabularyMode) {
        renderVocabulary();
      }
    };

    readerTab.onclick = () => {
      this.plugin.logosMode =
        "reader";

      updateMainMode();
    };

    dictionaryTab.onclick = () => {
      this.plugin.logosMode =
        "dictionary";

      updateMainMode();
    };

    vocabularyTab.onclick = () => {
      this.plugin.logosMode =
        "vocabulary";

      updateMainMode();
    };

    updateMainMode();

    const statusEl =
      readerContainer.createDiv({
        cls: "logos-status"
      });

    statusEl.setText("Ready");

    // -------------------------
    // Reading mode
    // -------------------------

    const modeSection =
      readerContainer.createDiv({
        cls: "logos-mode-section"
      });

    modeSection.createEl("label", {
      text: "Read"
    });

    const modeSelect =
      modeSection.createEl("select");

    const modes: {
      value: ReadingMode;
      name: string;
    }[] = [
      {
        value: "note",
        name: "Entire note"
      },
      {
        value: "selection",
        name: "Selected text"
      },
      {
        value: "paragraph",
        name: "Current paragraph"
      },
      {
        value: "cursor",
        name: "From cursor"
      }
    ];

    for (const mode of modes) {
      const option =
        modeSelect.createEl("option");

      option.value = mode.value;
      option.text = mode.name;

      if (
        mode.value ===
        this.plugin.readingMode
      ) {
        option.selected = true;
      }
    }

    modeSelect.onchange = () => {
      this.plugin.readingMode =
        modeSelect.value as ReadingMode;

      void this.plugin.saveSettings();
    };

    // -------------------------
    // Voice pack
    // -------------------------

    const packSection =
      readerContainer.createDiv({
        cls: "logos-pack-section"
      });

    packSection.createEl("label", {
      text: "Voice Pack"
    });

    const packSelect =
      packSection.createEl("select");

    const packs: {
      value: VoicePack;
      name: string;
    }[] = [
      {
        value: "kokoro-en",
        name: "Kokoro English"
      },
      {
        value: "kokoro-multi",
        name: "Kokoro Multilingual"
      },
      {
        value: "kokoro-multi-fast",
        name:
          "Kokoro Multilingual - Fast"
      },
      {
        value: "vctk",
        name: "VCTK English Accents"
      }
    ];

    for (const pack of packs) {
      const option =
        packSelect.createEl("option");

      option.value = pack.value;
      option.text = pack.name;

      if (
        pack.value ===
        this.plugin.voicePack
      ) {
        option.selected = true;
      }
    }

    // -------------------------
    // VCTK filters
    // -------------------------

    const filterSection =
      readerContainer.createDiv({
        cls: "logos-vctk-filters"
      });

    filterSection.createEl("label", {
      text: "Accent"
    });

    const accentSelect =
      filterSection.createEl("select");

    filterSection.createEl("label", {
      text: "Gender"
    });

    const genderSelect =
      filterSection.createEl("select");

    const refreshVctkFilters = () => {
      accentSelect.empty();
      genderSelect.empty();

      const speakers =
        this.plugin.getVctkSpeakers();

      const accents =
        [
          "All",
          ...Array.from(
            new Set(
              speakers.map(
                speaker =>
                  speaker.accent
              )
            )
          ).sort()
        ];

      const genders =
        [
          "All",
          ...Array.from(
            new Set(
              speakers.map(
                speaker =>
                  speaker.gender
              )
            )
          ).sort()
        ];

      for (const accent of accents) {
        const option =
          accentSelect.createEl(
            "option"
          );

        option.value = accent;
        option.text = accent;

        if (
          accent ===
          this.plugin.vctkAccent
        ) {
          option.selected = true;
        }
      }

      for (const gender of genders) {
        const option =
          genderSelect.createEl(
            "option"
          );

        option.value = gender;
        option.text = gender;

        if (
          gender ===
          this.plugin.vctkGender
        ) {
          option.selected = true;
        }
      }
    };

    refreshVctkFilters();

    // -------------------------
    // Voice list filter
    // -------------------------

    const listFilterSection =
      readerContainer.createDiv({
        cls: "logos-list-filter"
      });

    listFilterSection.createEl("label", {
      text: "Show voices"
    });

    const listFilterSelect =
      listFilterSection.createEl("select");

    const listModes = [
      {
        value: "all",
        name: "All voices"
      },
      {
        value: "favorites",
        name: "Favorites only"
      }
    ];

    for (const mode of listModes) {
      const option =
        listFilterSelect.createEl("option");

      option.value = mode.value;
      option.text = mode.name;

      if (
        mode.value ===
        this.plugin.voiceListMode
      ) {
        option.selected = true;
      }
    }

    // -------------------------
    // Voice selector
    // -------------------------

    const voiceSection =
      readerContainer.createDiv({
        cls: "logos-voice-section"
      });

    voiceSection.createEl("label", {
      text: "Voice"
    });

    const voiceSelect =
      voiceSection.createEl("select");

    const updateVoices = () => {
      voiceSelect.empty();

      let voices =
        this.plugin.getVoicesForPack(
          this.plugin.voicePack
        );

      if (
        this.plugin.voiceListMode ===
        "favorites"
      ) {
        voices =
          voices.filter(
            voice =>
              this.plugin.isVoiceFavorite(
                this.plugin.voicePack,
                voice.id
              )
          );
      }

      if (voices.length === 0) {
        const option =
          voiceSelect.createEl("option");

        option.value = "";
        option.text =
          "No favorite voices yet";

        option.disabled = true;

        this.plugin.speakerId = 0;
        return;
      }

      for (const voice of voices) {
        const option =
          voiceSelect.createEl("option");

        option.value =
          voice.id.toString();

        option.text =
          voice.name;

        if (
          voice.id ===
          this.plugin.speakerId
        ) {
          option.selected = true;
        }
      }

      if (
        !voices.some(
          voice =>
            voice.id ===
            this.plugin.speakerId
        )
      ) {
        this.plugin.speakerId =
          voices[0]?.id ?? 0;

        voiceSelect.value =
          this.plugin.speakerId.toString();
      }
    };

    const updateFilterVisibility = () => {
      filterSection.style.display =
        this.plugin.voicePack === "vctk"
          ? ""
          : "none";
    };

    updateVoices();
    updateFilterVisibility();

    accentSelect.onchange = () => {
      this.plugin.vctkAccent =
        accentSelect.value;

      this.plugin.speakerId = 0;
      updateVoices();

      void this.plugin.saveSettings();
      updateFavoriteButton();
    };

    genderSelect.onchange = () => {
      this.plugin.vctkGender =
        genderSelect.value;

      this.plugin.speakerId = 0;
      updateVoices();

      void this.plugin.saveSettings();
      updateFavoriteButton();
    };

    listFilterSelect.onchange = () => {
      this.plugin.voiceListMode =
        listFilterSelect.value as
          "all" | "favorites";

      updateVoices();

      void this.plugin.saveSettings();
    };

    packSelect.onchange = () => {
      this.plugin.voicePack =
        packSelect.value as VoicePack;

      this.plugin.speakerId = 0;

      updateVoices();
      updateFilterVisibility();

      void this.plugin.saveSettings();
      updateFavoriteButton();
    };

    voiceSelect.onchange = () => {
      this.plugin.speakerId =
        Number(voiceSelect.value);

      void this.plugin.saveSettings();

      updateFavoriteButton();
    };

    // -------------------------
    // Voice preview
    // -------------------------

    const previewSection =
      readerContainer.createDiv({
        cls: "logos-preview-section"
      });

    const previewButton =
      previewSection.createEl("button", {
        text: "▶ Preview Voice"
      });

    const nextVoiceButton =
      previewSection.createEl("button", {
        text: "Next Voice"
      });

    const favoriteButton =
      previewSection.createEl("button");

    const updateFavoriteButton = () => {
      favoriteButton.setText(
        this.plugin.isCurrentVoiceFavorite()
          ? "★ Favorite"
          : "☆ Favorite"
      );
    };

    updateFavoriteButton();

    favoriteButton.onclick = async () => {
      await this.plugin
        .toggleCurrentVoiceFavorite();

      updateFavoriteButton();

      if (
        this.plugin.voiceListMode ===
        "favorites"
      ) {
        updateVoices();
      }
    };

    previewButton.onclick = async () => {
      statusEl.setText(
        "Generating voice preview..."
      );

      const ok =
        await this.plugin.previewVoice();

      statusEl.setText(
        ok ? "Playing preview" : "Ready"
      );
    };

    nextVoiceButton.onclick = async () => {
      const options =
        Array.from(
          voiceSelect.options
        );

      if (options.length === 0) {
        return;
      }

      let index =
        voiceSelect.selectedIndex;

      index =
        (index + 1) %
        options.length;

      voiceSelect.selectedIndex =
        index;

      this.plugin.speakerId =
        Number(
          voiceSelect.value
        );

      void this.plugin.saveSettings();
      updateFavoriteButton();

      statusEl.setText(
        "Generating voice preview..."
      );

      const ok =
        await this.plugin.previewVoice();

      statusEl.setText(
        ok ? "Playing preview" : "Ready"
      );
    };

    // -------------------------
    // Speed
    // -------------------------

    const speedSection =
      readerContainer.createDiv({
        cls: "logos-speed-section"
      });

    speedSection.createEl("label", {
      text: "Generation speed"
    });

    const speedValue =
      speedSection.createSpan({
        text:
          `${this.plugin.speechRate.toFixed(
            2
          )}×`
      });

    const speedSlider =
      speedSection.createEl("input");

    speedSlider.type = "range";
    speedSlider.min = "0.5";
    speedSlider.max = "2";
    speedSlider.step = "0.05";

    speedSlider.value =
      this.plugin.speechRate.toString();

    speedSlider.oninput = () => {
      this.plugin.speechRate =
        Number(speedSlider.value);

      speedValue.setText(
        `${this.plugin.speechRate.toFixed(
          2
        )}×`
      );

      void this.plugin.saveSettings();
    };

    // -------------------------
    // Audio processing
    // -------------------------

    const processingSection =
      readerContainer.createDiv({
        cls: "logos-processing-section"
      });

    processingSection.createEl("label", {
      text: "Audio"
    });

    const processingSelect =
      processingSection.createEl("select");

    const processingModes = [
      {
        value: "normalize",
        name: "Normalize loudness"
      },
      {
        value: "raw",
        name: "Preserve raw synthesis"
      }
    ];

    for (const mode of processingModes) {
      const option =
        processingSelect.createEl("option");

      option.value = mode.value;
      option.text = mode.name;

      if (
        mode.value ===
        this.plugin.audioProcessing
      ) {
        option.selected = true;
      }
    }

    processingSelect.onchange = () => {
      this.plugin.audioProcessing =
        processingSelect.value as
          "raw" | "normalize";

      void this.plugin.saveSettings();
    };

    // -------------------------
    // Pronunciation Practice
    // -------------------------

    const practiceSection =
      readerContainer.createDiv({
        cls: "logos-practice-section"
      });

    practiceSection.createEl("h3", {
      text: "Pronunciation Practice"
    });

    const practiceInput =
      practiceSection.createEl(
        "textarea"
      );

    practiceInput.placeholder =
      "Type a word, phrase, or sentence to practice...";

    practiceInput.rows = 3;

    const repeatRow =
      practiceSection.createDiv({
        cls: "logos-practice-repeat"
      });

    repeatRow.createEl("label", {
      text: "Repeat"
    });

    const repeatSelect =
      repeatRow.createEl("select");

    const repeatOptions = [
      { value: 1, label: "1 time" },
      { value: 2, label: "2 times" },
      { value: 3, label: "3 times" },
      { value: 5, label: "5 times" },
      { value: 10, label: "10 times" }
    ];

    for (const item of repeatOptions) {
      const option =
        repeatSelect.createEl("option");

      option.value =
        item.value.toString();

      option.text =
        item.label;

      if (
        item.value ===
        this.plugin.practiceRepeatCount
      ) {
        option.selected = true;
      }
    }

    repeatSelect.onchange = () => {
      this.plugin.practiceRepeatCount =
        Number(repeatSelect.value);
    };

    const practiceButton =
      practiceSection.createEl(
        "button",
        {
          text: "▶ Practice"
        }
      );

    practiceButton.onclick =
      async () => {
        const text =
          practiceInput.value.trim();

        if (!text) {
          new Notice(
            "Logos: Enter something to practice."
          );
          return;
        }

        statusEl.setText(
          "Generating practice audio..."
        );

        const ok =
          await this.plugin
            .practicePronunciation(
              text
            );

        if (ok) {
          statusEl.setText(
            `Practice ×${this.plugin.practiceRepeatCount}`
          );
        } else {
          statusEl.setText(
            "Ready"
          );
        }
      };

    // -------------------------
    // Playback
    // -------------------------

    const controls =
      readerContainer.createDiv({
        cls: "logos-controls"
      });

    const playButton =
      controls.createEl("button", {
        text: "▶ Play"
      });

    const pauseButton =
      controls.createEl("button", {
        text: "⏸ Pause"
      });

    const resumeButton =
      controls.createEl("button", {
        text: "▶ Resume"
      });

    const stopButton =
      controls.createEl("button", {
        text: "■ Stop"
      });

    playButton.onclick = async () => {
      statusEl.setText(
        "Generating speech..."
      );

      const ok =
        await this.plugin
          .speakCurrentMode();

      if (ok) {
        statusEl.setText("Playing");
      } else {
        statusEl.setText("Ready");
      }
    };

    pauseButton.onclick = () => {
      this.plugin.pauseSpeech();
      statusEl.setText("Paused");
    };

    resumeButton.onclick = () => {
      this.plugin.resumeSpeech();
      statusEl.setText("Playing");
    };

    stopButton.onclick = () => {
      this.plugin.stopSpeech();
      statusEl.setText("Stopped");
    };

    // -------------------------
    // Audio progress
    // -------------------------

    const progressSection =
      readerContainer.createDiv({
        cls: "logos-progress-section"
      });

    const timeRow =
      progressSection.createDiv({
        cls: "logos-time-row"
      });

    const currentTimeEl =
      timeRow.createSpan({
        text: "0:00"
      });

    const durationEl =
      timeRow.createSpan({
        text: "0:00"
      });

    const progressSlider =
      progressSection.createEl("input");

    progressSlider.type = "range";
    progressSlider.min = "0";
    progressSlider.max = "1000";
    progressSlider.value = "0";
    progressSlider.step = "1";

    this.plugin.setProgressElements(
      progressSlider,
      currentTimeEl,
      durationEl
    );

    progressSlider.oninput = () => {
      this.plugin.seekFromSlider(
        Number(progressSlider.value)
      );
    };

    // -------------------------
    // Export
    // -------------------------

    const exportSection =
      readerContainer.createDiv({
        cls: "logos-export-section"
      });

    exportSection.createEl("h3", {
      text: "Export"
    });

    const wavButton =
      exportSection.createEl("button", {
        text: "Save WAV"
      });

    const mp3Button =
      exportSection.createEl("button", {
        text: "Save MP3"
      });

    wavButton.onclick = async () => {
      await this.plugin.exportWav();
    };

    mp3Button.onclick = async () => {
      await this.plugin.exportMp3();
    };
  }

  async onClose() {}
}

export default class LogosPlugin
  extends Plugin {

  private playbackGeneration = 0;

  private activeTtsChild:
    ReturnType<typeof spawn> | null =
      null;

  private ttsRequestId = 0;

  private ttsStdoutBuffer = "";

  private ttsStderrBuffer = "";

  private pendingTtsRequests =
    new Map<
      number,
      {
        resolve:
          (value: any) => void;
        reject:
          (error: Error) => void;
      }
    >();

  private chunkPlaybackResolver:
    ((value: boolean) => void) | null =
      null;

  private currentSpeechChunkFiles:
    string[] = [];

  private currentSpeechSourcePath:
    string | null = null;

  private mergedLongSpeechWav:
    string | null = null;

  lastMarkdownView:
    MarkdownView | null = null;

  audioPlayer:
    HTMLAudioElement | null = null;

  audioObjectUrl:
    string | null = null;

  lastGeneratedWav:
    string | null = null;

  progressSlider:
    HTMLInputElement | null = null;

  currentTimeEl:
    HTMLSpanElement | null = null;

  durationEl:
    HTMLSpanElement | null = null;

  readingMode:
    ReadingMode = "note";

  voicePack:
    VoicePack = "kokoro-en";

  speakerId = 0;

  vctkAccent = "All";
  vctkGender = "All";

  speechRate = 1.0;

  logosMode:
    "reader" | "dictionary" | "vocabulary" =
      "reader";

  dictionaryLanguage =
    "all";

  dictionaryMatchMode:
    "smart" | "exact" | "contains" =
      "smart";

  practiceRepeatCount = 3;

  playbackRepeatsRemaining = 0;

  favoriteVoices:
    string[] = [];

  savedVocabulary:
    SavedVocabularyItem[] = [];

  pendingDictionaryLookup:
    string | null = null;

  hoverLookupTimer:
    ReturnType<typeof setTimeout> | null =
      null;

  hoverPopup:
    HTMLDivElement | null = null;

  hoverLookupWord:
    string | null = null;

  hoverDictionaryCache =
    new Map<string, any[]>();

  private learnerExpressionKeys:
    Set<string> | null = null;

  voiceListMode:
    "all" | "favorites" = "all";

  audioProcessing:
    "raw" | "normalize" = "normalize";

  async onload() {
    console.log("Logos loaded");

    await this.loadSettings();

    const initialView =
      this.app.workspace
        .getActiveViewOfType(
          MarkdownView
        );

    if (initialView) {
      this.lastMarkdownView =
        initialView;
    }

    this.registerEvent(
      this.app.workspace.on(
        "active-leaf-change",
        leaf => {
          if (
            leaf?.view instanceof
            MarkdownView
          ) {
            this.lastMarkdownView =
              leaf.view;
          }
        }
      )
    );

    this.registerEvent(
      this.app.workspace.on(
        "editor-menu",
        (
          menu,
          editor
        ) => {
          const selection =
            editor
              .getSelection()
              .trim();

          if (!selection) {
            return;
          }

          const displayText =
            selection.length > 40
              ? `${selection.slice(
                  0,
                  37
                )}...`
              : selection;

          menu.addItem(
            item => {
              item
                .setTitle(
                  `Logos: Look up “${displayText}”`
                )
                .setIcon(
                  "book-open"
                )
                .onClick(
                  async () => {
                    await this
                      .lookupDictionaryTerm(
                        selection
                      );
                  }
                );
            }
          );

          menu.addItem(
            item => {
              item
                .setTitle(
                  `Logos: Speak “${displayText}”`
                )
                .setIcon(
                  "volume-2"
                )
                .onClick(
                  async () => {
                    const language =
                      /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u
                        .test(
                          selection
                        )
                        ? "zh-Hans"
                        : "en";

                    await this
                      .speakDictionaryEntry(
                        selection,
                        language
                      );
                  }
                );
            }
          );
        }
      )
    );

    this.registerDomEvent(
      document,
      "mousemove",
      event => {
        this.handleHoverDictionary(
          event
        );
      }
    );

    this.registerDomEvent(
      document,
      "mousedown",
      event => {
        const target =
          event.target;

        if (!this.hoverPopup) {
          return;
        }

        if (
          target instanceof
            HTMLElement &&
          target.closest(
            ".logos-hover-popup"
          )
        ) {
          return;
        }

        this.hideHoverDictionary();
      }
    );

    this.registerDomEvent(
      document,
      "keydown",
      event => {
        if (
          event.key === "Escape" &&
          this.hoverPopup
        ) {
          this.hideHoverDictionary();
        }
      }
    );

    this.registerView(
      LOGOS_VIEW_TYPE,
      leaf =>
        new LogosPlayerView(
          leaf,
          this
        )
    );

    this.addRibbonIcon(
      "audio-lines",
      "Open Logos",
      async () => {
        await this.activateView();
      }
    );

    this.addCommand({
      id: "open-logos-player",
      name: "Open player",
      callback: async () => {
        await this.activateView();
      }
    });

    this.addCommand({
      id: "read-current-mode",
      name:
        "Read using current mode",
      callback: async () => {
        await this.speakCurrentMode();
      }
    });

    this.addCommand({
      id: "stop-speaking",
      name: "Stop speaking",
      callback: () => {
        this.stopSpeech();
      }
    });
  }

  async loadSettings() {
    const saved =
      await this.loadData();

    const settings: LogosSettings = {
      ...DEFAULT_SETTINGS,
      ...(saved || {})
    };

    this.readingMode =
      settings.readingMode;

    this.voicePack =
      settings.voicePack;

    this.speakerId =
      settings.speakerId;

    this.speechRate =
      settings.speechRate;

    this.audioProcessing =
      settings.audioProcessing;

    this.vctkAccent =
      settings.vctkAccent;

    this.vctkGender =
      settings.vctkGender;

    this.favoriteVoices =
      settings.favoriteVoices || [];

    this.voiceListMode =
      settings.voiceListMode || "all";

    this.savedVocabulary =
      settings.savedVocabulary || [];
  }

  async saveSettings() {
    await this.saveData({
      readingMode:
        this.readingMode,
      voicePack:
        this.voicePack,
      speakerId:
        this.speakerId,
      speechRate:
        this.speechRate,
      audioProcessing:
        this.audioProcessing,
      vctkAccent:
        this.vctkAccent,
      vctkGender:
        this.vctkGender,
      favoriteVoices:
        this.favoriteVoices,
      voiceListMode:
        this.voiceListMode,
      savedVocabulary:
        this.savedVocabulary
    } satisfies LogosSettings);
  }

  getVoiceKey(): string {
    return `${this.voicePack}:${this.speakerId}`;
  }

  isVoiceFavorite(
    pack: VoicePack,
    speakerId: number
  ): boolean {
    return this.favoriteVoices.includes(
      `${pack}:${speakerId}`
    );
  }

  isCurrentVoiceFavorite(): boolean {
    return this.favoriteVoices.includes(
      this.getVoiceKey()
    );
  }

  async toggleCurrentVoiceFavorite() {
    const key =
      this.getVoiceKey();

    if (
      this.favoriteVoices.includes(key)
    ) {
      this.favoriteVoices =
        this.favoriteVoices.filter(
          item => item !== key
        );
    } else {
      this.favoriteVoices.push(key);
    }

    await this.saveSettings();
  }

  private getVocabularyKey(
    word: string,
    language: string
  ): string {
    return `${language}::${word
      .trim()
      .toLocaleLowerCase()}`;
  }

  isVocabularySaved(
    word: string,
    language: string
  ): boolean {

    const key =
      this.getVocabularyKey(
        word,
        language
      );

    return this.savedVocabulary
      .some(
        item =>
          item.key === key
      );
  }

  async saveVocabularyItem(
    item: Omit<
      SavedVocabularyItem,
      "key" |
      "savedAt" |
      "status"
    >
  ): Promise<boolean> {

    const key =
      this.getVocabularyKey(
        item.word,
        item.language
      );

    if (
      this.savedVocabulary
        .some(
          saved =>
            saved.key === key
        )
    ) {
      new Notice(
        `${item.word} is already saved.`
      );

      return false;
    }

    this.savedVocabulary.push({
      ...item,
      key,
      savedAt:
        new Date().toISOString(),
      status:
        "learning"
    });

    await this.saveSettings();

    new Notice(
      `Saved "${item.word}" to Vocabulary.`
    );

    return true;
  }

  // -------------------------
  // Voice definitions
  // -------------------------

  getVctkSpeakers(): VctkSpeaker[] {
    try {
      const adapter =
        this.app.vault.adapter;

      if (
        adapter instanceof
        FileSystemAdapter
      ) {
        const pluginPath =
          path.join(
            adapter.getBasePath(),
            this.app.vault.configDir,
            "plugins",
            "logos"
          );

        const metadataPath =
          path.join(
            pluginPath,
            "vctk-speakers.json"
          );

        return JSON.parse(
          fs.readFileSync(
            metadataPath,
            "utf8"
          )
        ) as VctkSpeaker[];
      }
    } catch (error) {
      console.error(
        "Could not load VCTK metadata:",
        error
      );
    }

    return [];
  }

  getVoicesForPack(
    pack: VoicePack
  ): LogosVoice[] {

    if (pack === "kokoro-en") {
      return [
        {
          id: 0,
          name: "AF - US Female"
        },
        {
          id: 1,
          name: "Bella - US Female"
        },
        {
          id: 2,
          name: "Nicole - US Female"
        },
        {
          id: 3,
          name: "Sarah - US Female"
        },
        {
          id: 4,
          name: "Sky - US Female"
        },
        {
          id: 5,
          name: "Adam - US Male"
        },
        {
          id: 6,
          name: "Michael - US Male"
        },
        {
          id: 7,
          name: "Emma - UK Female"
        },
        {
          id: 8,
          name:
            "Isabella - UK Female"
        },
        {
          id: 9,
          name: "George - UK Male"
        },
        {
          id: 10,
          name: "Lewis - UK Male"
        }
      ];
    }

    if (
      pack === "kokoro-multi" ||
      pack === "kokoro-multi-fast"
    ) {
      const voices:
        LogosVoice[] = [];

      for (
        let id = 0;
        id <= 102;
        id++
      ) {
        voices.push({
          id,
          name:
            `Multilingual Speaker ${
              id + 1
            }`
        });
      }

      return voices;
    }

    if (pack === "vctk") {
      const speakers =
        this.getVctkSpeakers();

      const filtered =
        speakers.filter(
          speaker => {
            const accentMatch =
              this.vctkAccent === "All" ||
              speaker.accent ===
                this.vctkAccent;

            const genderMatch =
              this.vctkGender === "All" ||
              speaker.gender ===
                this.vctkGender;

            return (
              accentMatch &&
              genderMatch
            );
          }
        );

      if (filtered.length > 0) {
        return filtered.map(
          speaker => ({
            id: speaker.sid,
            name:
              `${speaker.id} - ${speaker.region}`
          })
        );
      }

      return [];
    }

    return [
      {
        id: 0,
        name: "Speaker 1"
      }
    ];
  }

  async searchDictionary(
    query: string
  ): Promise<any[]> {

    const adapter =
      this.app.vault.adapter;

    if (
      !(
        adapter instanceof
        FileSystemAdapter
      )
    ) {
      return [];
    }

    const vaultPath =
      adapter.getBasePath();

    const pluginPath =
      path.join(
        vaultPath,
        this.app.vault.configDir,
        "plugins",
        "logos"
      );

    const workerPath =
      path.join(
        pluginPath,
        "dictionary-worker.cjs"
      );

    const nodePath =
      this.getBundledNodePath(
        pluginPath
      );

    return await new Promise(
      resolve => {

        const child =
          spawn(
            nodePath,
            [workerPath],
            {
              cwd: pluginPath,
              windowsHide: true,
              env: this.getWorkerEnv(
                pluginPath
              )
            }
          );

        let stdout = "";
        let stderr = "";

        child.stdout.on(
          "data",
          data => {
            stdout +=
              data.toString();
          }
        );

        child.stderr.on(
          "data",
          data => {
            stderr +=
              data.toString();
          }
        );

        child.on(
          "close",
          code => {

            if (code !== 0) {
              console.error(
                "Dictionary worker error:",
                stderr
              );

              new Notice(
                "Logos: Dictionary search failed."
              );

              resolve([]);
              return;
            }

            try {
              const response =
                JSON.parse(
                  stdout.trim()
                );

              resolve(
                response.results ||
                []
              );

            } catch (error) {
              console.error(
                "Dictionary response error:",
                error
              );

              resolve([]);
            }
          }
        );

        child.stdin.write(
          JSON.stringify({
            query,
            language:
              this.dictionaryLanguage,
            matchMode:
              this.dictionaryMatchMode,
            limit: 20
          })
        );

        child.stdin.end();
      }
    );
  }

  async speakDictionaryEntry(
    word: string,
    language: string
  ) {

    const originalPack =
      this.voicePack;

    const originalSpeaker =
      this.speakerId;

    if (
      language === "zh-Hans" ||
      language === "zh-Hant"
    ) {
      this.voicePack =
        "kokoro-multi-fast";

      this.speakerId = 0;
    }

    try {
      await this.speakWithLocalTts(
        word
      );
    } finally {
      this.voicePack =
        originalPack;

      this.speakerId =
        originalSpeaker;
    }
  }

  // -------------------------
  // Sidebar
  // -------------------------

  isPlausibleEnglishLemma(
    surface: string,
    lemma: string
  ): boolean {

    const q =
      surface
        .trim()
        .toLocaleLowerCase();

    const l =
      lemma
        .trim()
        .toLocaleLowerCase();

    if (
      !q ||
      !l ||
      q === l
    ) {
      return false;
    }

    const irregular:
      Record<string, string[]> = {
        am: ["be"],
        is: ["be"],
        are: ["be"],
        was: ["be"],
        were: ["be"],
        been: ["be"],
        being: ["be"],

        has: ["have"],
        had: ["have"],

        does: ["do"],
        did: ["do"],
        done: ["do"],

        went: ["go"],
        gone: ["go"],

        came: ["come"],
        saw: ["see"],
        seen: ["see"],

        took: ["take"],
        taken: ["take"],

        gave: ["give"],
        given: ["give"],

        got: ["get"],
        gotten: ["get"],

        made: ["make"],
        knew: ["know"],
        known: ["know"],

        thought: ["think"],
        brought: ["bring"],
        bought: ["buy"],
        taught: ["teach"],
        caught: ["catch"],
        found: ["find"],
        told: ["tell"],
        said: ["say"],

        spoke: ["speak"],
        spoken: ["speak"],

        wrote: ["write"],
        written: ["write"],

        ran: ["run"],

        ate: ["eat"],
        eaten: ["eat"],

        drank: ["drink"],
        drunk: ["drink"],

        drove: ["drive"],
        driven: ["drive"],

        chose: ["choose"],
        chosen: ["choose"],

        broke: ["break"],
        broken: ["break"],

        children: ["child"],
        mice: ["mouse"],
        men: ["man"],
        women: ["woman"],
        feet: ["foot"],
        teeth: ["tooth"],
        geese: ["goose"],

        better: ["good"],
        best: ["good"],
        worse: ["bad"],
        worst: ["bad"]
      };

    if (
      irregular[q]
        ?.includes(l)
    ) {
      return true;
    }

    const candidates =
      new Set<string>();

    if (
      q.endsWith("ies") &&
      q.length > 3
    ) {
      candidates.add(
        q.slice(0, -3) + "y"
      );
    }

    if (
      q.endsWith("ves") &&
      q.length > 3
    ) {
      candidates.add(
        q.slice(0, -3) + "f"
      );

      candidates.add(
        q.slice(0, -3) + "fe"
      );
    }

    if (
      q.endsWith("es") &&
      q.length > 3
    ) {
      candidates.add(
        q.slice(0, -2)
      );
    }

    if (
      q.endsWith("s") &&
      !q.endsWith("ss") &&
      q.length > 2
    ) {
      candidates.add(
        q.slice(0, -1)
      );
    }

    if (
      q.endsWith("ied") &&
      q.length > 3
    ) {
      candidates.add(
        q.slice(0, -3) + "y"
      );
    }

    if (
      q.endsWith("ed") &&
      q.length > 3
    ) {
      const stem =
        q.slice(0, -2);

      candidates.add(stem);
      candidates.add(
        stem + "e"
      );

      if (
        stem.length > 2 &&
        stem.at(-1) ===
          stem.at(-2)
      ) {
        candidates.add(
          stem.slice(0, -1)
        );
      }
    }

    if (
      q.endsWith("ing") &&
      q.length > 4
    ) {
      const stem =
        q.slice(0, -3);

      candidates.add(stem);
      candidates.add(
        stem + "e"
      );

      if (
        stem.length > 2 &&
        stem.at(-1) ===
          stem.at(-2)
      ) {
        candidates.add(
          stem.slice(0, -1)
        );
      }
    }

    return candidates.has(l);
  }

  private hideHoverDictionary() {
    if (this.hoverLookupTimer) {
      clearTimeout(
        this.hoverLookupTimer
      );

      this.hoverLookupTimer =
        null;
    }

    if (this.hoverPopup) {
      this.hoverPopup.remove();

      this.hoverPopup =
        null;
    }

    this.hoverLookupWord =
      null;
  }

  private getLearnerExpressionKeys():
    Set<string> {

    if (
      this.learnerExpressionKeys
    ) {
      return (
        this.learnerExpressionKeys
      );
    }

    const keys =
      new Set<string>();

    try {
      const fs =
        require("node:fs");

      const path =
        require("node:path");

      const adapter =
        this.app.vault.adapter as any;

      const basePath =
        typeof adapter
          .getBasePath ===
        "function"
          ? adapter.getBasePath()
          : null;

      const pluginDir =
        this.manifest.dir;

      if (
        !basePath ||
        !pluginDir
      ) {
        this.learnerExpressionKeys =
          keys;

        return keys;
      }

      const expressionsPath =
        path.join(
          basePath,
          pluginDir,
          "dictionaries",
          "core",
          "learner-expressions.json"
        );

      const raw =
        fs.readFileSync(
          expressionsPath,
          "utf8"
        );

      const parsed =
        JSON.parse(raw);

      const entries =
        Array.isArray(
          parsed?.entries
        )
          ? parsed.entries
          : [];

      const normalize =
        (value: unknown) =>
          String(value || "")
            .trim()
            .toLocaleLowerCase()
            .replace(
              /\s+/g,
              " "
            );

      for (
        const entry
        of entries
      ) {
        if (
          !entry ||
          !entry.expression
        ) {
          continue;
        }

        const candidates = [
          entry.expression,
          ...(
            Array.isArray(
              entry.aliases
            )
              ? entry.aliases
              : []
          )
        ];

        for (
          const candidate
          of candidates
        ) {
          const normalized =
            normalize(candidate);

          if (normalized) {
            keys.add(
              normalized
            );
          }
        }
      }

    } catch (error) {
      console.warn(
        "Logos: Could not load learner-expression keys.",
        error
      );
    }

    this.learnerExpressionKeys =
      keys;

    return keys;
  }

  private getWordAtPoint(
    x: number,
    y: number
  ): string | null {

    let node:
      Node | null = null;

    let offset = 0;

    const doc =
      document as any;

    if (
      typeof doc
        .caretPositionFromPoint ===
      "function"
    ) {
      const position =
        doc.caretPositionFromPoint(
          x,
          y
        );

      node =
        position?.offsetNode ??
        null;

      offset =
        position?.offset ??
        0;

    } else if (
      typeof doc
        .caretRangeFromPoint ===
      "function"
    ) {
      const range =
        doc.caretRangeFromPoint(
          x,
          y
        );

      node =
        range?.startContainer ??
        null;

      offset =
        range?.startOffset ??
        0;
    }

    if (
      !node ||
      node.nodeType !==
        Node.TEXT_NODE
    ) {
      return null;
    }

    const text =
      node.textContent || "";

    if (!text) {
      return null;
    }

    const isWordChar =
      (char: string) =>
        /[\p{L}\p{M}'’\-]/u
          .test(char);

    if (
      offset >= text.length
    ) {
      offset =
        text.length - 1;
    }

    if (
      offset < 0 ||
      !isWordChar(
        text[offset] || ""
      )
    ) {
      if (
        offset > 0 &&
        isWordChar(
          text[offset - 1] || ""
        )
      ) {
        offset--;
      } else {
        return null;
      }
    }

    let start = offset;
    let end =
      offset + 1;

    while (
      start > 0 &&
      isWordChar(
        text[start - 1]
      )
    ) {
      start--;
    }

    while (
      end < text.length &&
      isWordChar(
        text[end]
      )
    ) {
      end++;
    }

    const word =
      text.slice(
        start,
        end
      ).trim();

    if (
      !word ||
      word.length > 80
    ) {
      return null;
    }

    // -------------------------------------------------
    // Learner-expression recognition
    //
    // Prefer a known multi-word expression containing
    // the hovered word:
    //
    //   under the weather
    //   piece of cake
    //   look after
    //   give up
    //
    // Longest valid expression wins.
    // -------------------------------------------------

    const expressionKeys =
      this.getLearnerExpressionKeys();

    if (
      expressionKeys.size > 0
    ) {
      const tokens:
        Array<{
          text: string;
          start: number;
          end: number;
        }> = [];

      const tokenPattern =
        /[\p{L}\p{M}'’\-]+/gu;

      let match:
        RegExpExecArray | null;

      while (
        (
          match =
            tokenPattern.exec(text)
        ) !== null
      ) {
        tokens.push({
          text:
            match[0],

          start:
            match.index,

          end:
            match.index +
            match[0].length
        });
      }

      const hoveredTokenIndex =
        tokens.findIndex(
          token =>
            offset >=
              token.start &&
            offset <
              token.end
        );

      if (
        hoveredTokenIndex >= 0
      ) {
        const normalize =
          (value: string) =>
            value
              .trim()
              .toLocaleLowerCase()
              .replace(
                /\s+/g,
                " "
              );

        const maxWords =
          Math.min(
            6,
            tokens.length
          );

        for (
          let size = maxWords;
          size >= 2;
          size -= 1
        ) {
          const firstStart =
            Math.max(
              0,
              hoveredTokenIndex -
                size +
                1
            );

          const lastStart =
            Math.min(
              hoveredTokenIndex,
              tokens.length -
                size
            );

          for (
            let tokenStart =
              firstStart;
            tokenStart <=
              lastStart;
            tokenStart += 1
          ) {
            const tokenEnd =
              tokenStart +
              size -
              1;

            if (
              hoveredTokenIndex <
                tokenStart ||
              hoveredTokenIndex >
                tokenEnd
            ) {
              continue;
            }

            let validSpacing =
              true;

            for (
              let gapIndex =
                tokenStart;
              gapIndex <
                tokenEnd;
              gapIndex += 1
            ) {
              const gap =
                text.slice(
                  tokens[
                    gapIndex
                  ].end,
                  tokens[
                    gapIndex + 1
                  ].start
                );

              // Expressions may span spaces,
              // but not sentence punctuation.
              if (
                !/^\s+$/.test(
                  gap
                )
              ) {
                validSpacing =
                  false;

                break;
              }
            }

            if (
              !validSpacing
            ) {
              continue;
            }

            const candidate =
              text.slice(
                tokens[
                  tokenStart
                ].start,
                tokens[
                  tokenEnd
                ].end
              );

            const normalized =
              normalize(
                candidate
              );

            if (
              expressionKeys.has(
                normalized
              )
            ) {
              return (
                candidate.trim()
              );
            }
          }
        }
      }
    }

    return word;
  }

  private async showHoverDictionary(
    word: string,
    x: number,
    y: number
  ) {
    let results =
      this.hoverDictionaryCache
        .get(
          word.toLocaleLowerCase()
        );

    if (!results) {
      results =
        await this.searchDictionary(
          word
        );

      this.hoverDictionaryCache.set(
        word.toLocaleLowerCase(),
        results
      );
    }

    if (
      this.hoverLookupWord !==
      word
    ) {
      return;
    }

    if (
      !results ||
      results.length === 0
    ) {
      return;
    }

    const exact =
      results.filter(
        result =>
          String(
            result.word || ""
          )
            .toLocaleLowerCase() ===
          word.toLocaleLowerCase()
      );

    const chineseWord =
      /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u
        .test(word);

    const preferredLanguage =
      chineseWord
        ? "zh"
        : "en";

    const preferredExact =
      exact.filter(
        result => {
          const language =
            String(
              result.language || ""
            );

          return preferredLanguage === "zh"
            ? language.startsWith("zh")
            : language === "en";
        }
      );

    const preferredResults =
      results.filter(
        result => {
          const language =
            String(
              result.language || ""
            );

          return preferredLanguage === "zh"
            ? language.startsWith("zh")
            : language === "en";
        }
      );

    const group =
      preferredExact.length > 0
        ? preferredExact
        : exact.length > 0
          ? exact
          : preferredResults.length > 0
            ? preferredResults
            : results;

    const first =
      group[0];

    if (!first) {
      return;
    }

    const hoveredLooksEnglish =
      /^[A-Za-z][A-Za-z'’\-]*$/
        .test(word);

    if (
      hoveredLooksEnglish &&
      first.language === "en"
    ) {
      const returnedWord =
        String(
          first.word || ""
        ).trim();

      const exactWord =
        returnedWord
          .toLocaleLowerCase() ===
        word
          .trim()
          .toLocaleLowerCase();

      const validLemma =
        this.isPlausibleEnglishLemma(
          word,
          returnedWord
        );

      if (
        !exactWord &&
        !validLemma
      ) {
        return;
      }
    }

    if (this.hoverPopup) {
      this.hoverPopup.remove();
    }

    const popup =
      document.createElement(
        "div"
      );

    popup.addClass(
      "logos-hover-popup"
    );

    popup.style.position =
      "fixed";

    popup.style.zIndex =
      "10000";

    popup.style.maxWidth =
      "320px";

    popup.style.minWidth =
      "220px";

    popup.style.padding =
      "12px";

    popup.style.borderRadius =
      "8px";

    popup.style.background =
      "var(--background-primary)";

    popup.style.border =
      "1px solid var(--background-modifier-border)";

    popup.style.boxShadow =
      "0 6px 24px rgba(0,0,0,0.25)";

    popup.style.left =
      `${Math.min(
        x + 14,
        window.innerWidth - 340
      )}px`;

    popup.style.top =
      `${Math.min(
        y + 18,
        window.innerHeight - 240
      )}px`;

    const title =
      popup.createEl(
        "strong",
        {
          text:
            String(
              first.word ||
              word
            )
        }
      );

    title.style.fontSize =
      "1.05em";

    title.style.display =
      "block";

    const hoveredWord =
      word
        .trim()
        .toLocaleLowerCase();

    const resolvedWord =
      String(
        first.word || ""
      )
        .trim()
        .toLocaleLowerCase();

    if (
      first.language === "en" &&
      hoveredWord &&
      resolvedWord &&
      this.isPlausibleEnglishLemma(
        word,
        String(
          first.word || ""
        )
      )
    ) {
      const baseForm =
        popup.createDiv({
          cls:
            "logos-hover-base-form",
          text:
            `${word} → base form: ${first.word}`
        });

      baseForm.style.marginTop =
        "4px";

      baseForm.style.opacity =
        "0.8";
    }

    if (
      first.pronunciation
    ) {
      popup.createDiv({
        text:
          String(
            first.pronunciation
          ),
        cls:
          "logos-hover-pronunciation"
      });
    }

    const pos =
      group.find(
        item =>
          String(
            item.part_of_speech ||
            ""
          ).trim()
      );

    if (pos) {
      const posEl =
        popup.createDiv({
          text:
            String(
              pos.part_of_speech
            ).toUpperCase(),
          cls:
            "logos-hover-pos"
        });

      posEl.style.marginTop =
        "6px";

      posEl.style.opacity =
        "0.75";
    }

    const definitionResult =
      group.find(
        item =>
          String(
            item.definition ||
            ""
          ).trim()
      );

    if (definitionResult) {
      const definition =
        popup.createDiv({
          text:
            String(
              definitionResult
                .definition
            ),
          cls:
            "logos-hover-definition"
        });

      definition.style.marginTop =
        "8px";
    }

    const actions =
      popup.createDiv({
        cls:
          "logos-hover-actions"
      });

    actions.style.display =
      "flex";

    actions.style.gap =
      "6px";

    actions.style.marginTop =
      "10px";

    const speak =
      actions.createEl(
        "button",
        {
          text: "🔊 Speak"
        }
      );

    speak.onclick =
      async event => {
        event.stopPropagation();

        await this
          .speakDictionaryEntry(
            String(
              first.word ||
              word
            ),
            String(
              first.language ||
              "en"
            )
          );
      };

    const save =
      actions.createEl(
        "button"
      );

    const updateSave =
      () => {
        save.setText(
          this.isVocabularySaved(
            String(
              first.word ||
              word
            ),
            String(
              first.language ||
              "en"
            )
          )
            ? "★ Saved"
            : "☆ Save"
        );
      };

    updateSave();

    save.onclick =
      async event => {
        event.stopPropagation();

        let example =
          String(
            first.logos_example ||
            ""
          ).trim();

        if (!example) {
          for (
            const entry
            of group
          ) {
            const curatedExample =
              String(
                entry.logos_example ||
                ""
              ).trim();

            if (curatedExample) {
              example =
                curatedExample;

              break;
            }

            const examples =
              Array.isArray(
                entry.examples
              )
                ? entry.examples
                : [];

            const found =
              examples.find(
                item =>
                  String(
                    item.sentence ||
                    ""
                  ).trim()
              );

            if (found) {
              example =
                String(
                  found.sentence
                ).trim();

              break;
            }
          }
        }

        await this
          .saveVocabularyItem({
            word:
              String(
                first.word ||
                word
              ).trim(),

            language:
              String(
                first.language ||
                "en"
              ).trim(),

            pronunciation:
              String(
                first.pronunciation ||
                ""
              ).trim(),

            partOfSpeech:
              String(
                pos?.part_of_speech ||
                ""
              ).trim(),

            definition:
              String(
                definitionResult
                  ?.definition ||
                ""
              ).trim(),

            example,

            source:
              String(
                first.source ||
                ""
              ).trim()
          });

        updateSave();
      };

    document.body.appendChild(
      popup
    );

    this.hoverPopup =
      popup;
  }

  private handleHoverDictionary(
    event: MouseEvent
  ) {
    const target =
      event.target;

    if (
      target instanceof
        HTMLElement &&
      target.closest(
        ".logos-hover-popup"
      )
    ) {
      return;
    }

    if (!event.ctrlKey) {
      if (this.hoverPopup) {
        return;
      }

      this.hideHoverDictionary();
      return;
    }

    if (
      target instanceof
        HTMLElement
    ) {
      if (
        target.closest(
          ".logos-player"
        ) ||
        target.closest(
          "input, textarea, button, select"
        )
      ) {
        this.hideHoverDictionary();
        return;
      }
    }

    const word =
      this.getWordAtPoint(
        event.clientX,
        event.clientY
      );

    if (!word) {
      this.hideHoverDictionary();
      return;
    }

    if (
      this.hoverLookupWord ===
        word &&
      (
        this.hoverLookupTimer ||
        this.hoverPopup
      )
    ) {
      return;
    }

    this.hideHoverDictionary();

    this.hoverLookupWord =
      word;

    const x =
      event.clientX;

    const y =
      event.clientY;

    this.hoverLookupTimer =
      window.setTimeout(
        () => {
          this.hoverLookupTimer =
            null;

          void this
            .showHoverDictionary(
              word,
              x,
              y
            );
        },
        150
      );
  }

  async lookupDictionaryTerm(
    query: string
  ) {
    const cleaned =
      query.trim();

    if (!cleaned) {
      return;
    }

    this.pendingDictionaryLookup =
      cleaned;

    this.logosMode =
      "dictionary";

    await this.activateView();

    const leaves =
      this.app.workspace
        .getLeavesOfType(
          LOGOS_VIEW_TYPE
        );

    const view =
      leaves[0]?.view;

    if (
      view instanceof
      LogosPlayerView
    ) {
      view.render();
    }
  }

  async activateView() {
    const leaves =
      this.app.workspace
        .getLeavesOfType(
          LOGOS_VIEW_TYPE
        );

    if (leaves.length > 0) {
      this.app.workspace
        .revealLeaf(leaves[0]);
      return;
    }

    const leaf =
      this.app.workspace
        .getRightLeaf(false);

    if (!leaf) {
      new Notice(
        "Logos: Could not open player."
      );
      return;
    }

    await leaf.setViewState({
      type: LOGOS_VIEW_TYPE,
      active: true
    });

    this.app.workspace
      .revealLeaf(leaf);
  }

  // -------------------------
  // Editor handling
  // -------------------------

  getCurrentEditor():
    Editor | null {

    const active =
      this.app.workspace
        .getActiveViewOfType(
          MarkdownView
        );

    if (active) {
      this.lastMarkdownView =
        active;

      return active.editor;
    }

    if (this.lastMarkdownView) {
      return (
        this.lastMarkdownView.editor
      );
    }

    return null;
  }

  prepareTextForSpeech(
    text: string
  ): string {

    let cleaned = text;

    // Embedded attachments.
    // PDF embeds are expanded before this helper runs.
    cleaned = cleaned.replace(
      /!\[\[([^\]]+)\]\]/g,
      ""
    );

    // Markdown images: ![alt](url) -> alt
    cleaned = cleaned.replace(
      /!\[([^\]]*)\]\([^)]+\)/g,
      "$1"
    );

    // Markdown links: [text](url) -> text
    cleaned = cleaned.replace(
      /\[([^\]]+)\]\([^)]+\)/g,
      "$1"
    );

    // Wiki links with labels:
    // [[page|label]] -> label
    cleaned = cleaned.replace(
      /\[\[([^|\]]+)\|([^\]]+)\]\]/g,
      "$2"
    );

    // Wiki links: [[page]] -> page
    cleaned = cleaned.replace(
      /\[\[([^\]]+)\]\]/g,
      "$1"
    );

    // Bold.
    cleaned = cleaned.replace(
      /\*\*(.*?)\*\*/g,
      "$1"
    );

    cleaned = cleaned.replace(
      /__(.*?)__/g,
      "$1"
    );

    // Italic.
    cleaned = cleaned.replace(
      /\*(.*?)\*/g,
      "$1"
    );

    cleaned = cleaned.replace(
      /_(.*?)_/g,
      "$1"
    );

    // Strikethrough.
    cleaned = cleaned.replace(
      /~~(.*?)~~/g,
      "$1"
    );

    // Obsidian highlights.
    cleaned = cleaned.replace(
      /==(.*?)==/g,
      "$1"
    );

    // Inline code.
    cleaned = cleaned.replace(
      /`([^`]+)`/g,
      "$1"
    );

    // Headings.
    cleaned = cleaned.replace(
      /^#{1,6}\s+/gm,
      ""
    );

    // Blockquotes.
    cleaned = cleaned.replace(
      /^>\s?/gm,
      ""
    );

    // Unordered-list markers.
    cleaned = cleaned.replace(
      /^\s*[-*+]\s+/gm,
      ""
    );

    // Useful spoken symbols.
    const replacements:
      Array<[RegExp, string]> = [
        [/°C/g, " degrees Celsius "],
        [/°F/g, " degrees Fahrenheit "],
        [/±/g, " plus or minus "],
        [/≤/g, " less than or equal to "],
        [/≥/g, " greater than or equal to "],
        [/≠/g, " not equal to "],
        [/→/g, " leads to "],
        [/←/g, " comes from "],
        [/%/g, " percent "],
        [/&/g, " and "],
        [/\+/g, " plus "],
        [/=/g, " equals "],

        [/α/g, " alpha "],
        [/β/g, " beta "],
        [/γ/g, " gamma "],
        [/δ/g, " delta "],
        [/Δ/g, " delta "],
        [/σ/g, " sigma "],
        [/Σ/g, " sigma "],
        [/π/g, " pi "],
        [/λ/g, " lambda "],
        [/μ/g, " mu "],
        [/Ω/g, " omega "]
      ];

    for (
      const [pattern, replacement]
      of replacements
    ) {
      cleaned =
        cleaned.replace(
          pattern,
          replacement
        );
    }

    // Collapse excessive whitespace.
    cleaned = cleaned
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return cleaned;
  }

  async extractPdfText(
    pdfPath: string
  ): Promise<string | null> {

    const adapter =
      this.app.vault.adapter;

    if (
      !(
        adapter instanceof
        FileSystemAdapter
      )
    ) {
      new Notice(
        "Logos: PDF reading requires desktop Obsidian."
      );

      return null;
    }

    const vaultPath =
      adapter.getBasePath();

    const pluginPath =
      path.join(
        vaultPath,
        this.app.vault.configDir,
        "plugins",
        "logos"
      );

    const workerPath =
      path.join(
        pluginPath,
        "pdf-worker.cjs"
      );

    const nodePath =
      this.getBundledNodePath(
        pluginPath
      );

    const absolutePdfPath =
      path.join(
        vaultPath,
        pdfPath
      );

    return await new Promise(
      resolve => {

        const child =
          spawn(
            nodePath,
            [workerPath],
            {
              cwd: pluginPath,
              windowsHide: true,
              env: this.getWorkerEnv(
                pluginPath
              )
            }
          );

        let stdout = "";
        let stderr = "";

        child.stdout.on(
          "data",
          data => {
            stdout +=
              data.toString();
          }
        );

        child.stderr.on(
          "data",
          data => {
            stderr +=
              data.toString();
          }
        );

        child.on(
          "error",
          error => {
            console.error(
              "Logos PDF process error:",
              error
            );

            new Notice(
              `Logos: Could not start PDF reader: ${error.message}`
            );

            resolve(null);
          }
        );

        child.on(
          "close",
          code => {

            if (code !== 0) {
              console.error(
                "Logos PDF extraction error:",
                stderr
              );

              new Notice(
                "Logos: Could not extract text from PDF."
              );

              resolve(null);
              return;
            }

            try {
              const result =
                JSON.parse(
                  stdout.trim()
                );

              if (
                !result.success ||
                !result.text
              ) {
                new Notice(
                  "Logos: No readable text found in PDF."
                );

                resolve(null);
                return;
              }

              resolve(
                result.text.trim()
              );

            } catch (error) {
              console.error(
                "Logos PDF parsing error:",
                error
              );

              new Notice(
                "Logos: Could not parse PDF text."
              );

              resolve(null);
            }
          }
        );

        child.stdin.write(
          JSON.stringify({
            path:
              absolutePdfPath
          })
        );

        child.stdin.end();
      }
    );
  }

  async expandEmbeddedPdfs(
    text: string,
    sourcePath: string
  ): Promise<string> {

    const pdfEmbedPattern =
      /!\[\[([^\]]+?\.pdf)(?:#[^|\]]*)?(?:\|[^\]]*)?\]\]/gi;

    const matches =
      Array.from(
        text.matchAll(
          pdfEmbedPattern
        )
      );

    if (matches.length === 0) {
      return text;
    }

    let expanded = text;

    for (const match of matches) {
      const fullEmbed =
        match[0];

      const linkPath =
        match[1].trim();

      const pdfFile =
        this.app.metadataCache
          .getFirstLinkpathDest(
            linkPath,
            sourcePath
          );

      if (!pdfFile) {
        console.warn(
          "Logos: Could not resolve embedded PDF:",
          linkPath
        );

        continue;
      }

      const pdfText =
        await this.extractPdfText(
          pdfFile.path
        );

      if (!pdfText) {
        continue;
      }

      expanded =
        expanded.replace(
          fullEmbed,
          `\n\n${pdfText}\n\n`
        );
    }

    return expanded;
  }

  async prepareReadableText(
    text: string,
    sourcePath: string
  ): Promise<string> {

    const expanded =
      await this.expandEmbeddedPdfs(
        text,
        sourcePath
      );

    return this.prepareTextForSpeech(
      expanded
    );
  }

  async getTextForCurrentMode():
    Promise<string | null> {

    const activeFile =
      this.app.workspace
        .getActiveFile();

    // -------------------------
    // Directly opened PDF
    // -------------------------

    if (
      activeFile &&
      activeFile.extension
        .toLowerCase() ===
        "pdf"
    ) {
      if (
        this.readingMode ===
        "selection"
      ) {
        const selectedText =
          window
            .getSelection()
            ?.toString()
            .trim();

        if (selectedText) {
          return this.prepareTextForSpeech(
            selectedText
          );
        }

        new Notice(
          "Logos: Select text in the PDF first."
        );

        return null;
      }

      const pdfText =
        await this.extractPdfText(
          activeFile.path
        );

      if (!pdfText) {
        return null;
      }

      return this.prepareTextForSpeech(
        pdfText
      );
    }

    // -------------------------
    // Markdown note
    // -------------------------

    const editor =
      this.getCurrentEditor();

    if (!editor) {
      new Notice(
        "Logos: Open a Markdown note or PDF first."
      );

      return null;
    }

    const sourcePath =
      activeFile?.path ??
      this.lastMarkdownView?.file?.path ??
      "";

    if (
      this.readingMode ===
      "selection"
    ) {
      const text =
        editor.getSelection().trim();

      if (!text) {
        new Notice(
          "Logos: Select some text first."
        );

        return null;
      }

      return await
        this.prepareReadableText(
          text,
          sourcePath
        );
    }

    if (
      this.readingMode ===
      "paragraph"
    ) {
      const cursor =
        editor.getCursor();

      const text =
        editor
          .getLine(
            cursor.line
          )
          .trim();

      if (!text) {
        new Notice(
          "Logos: Current paragraph is empty."
        );

        return null;
      }

      return await
        this.prepareReadableText(
          text,
          sourcePath
        );
    }

    if (
      this.readingMode ===
      "cursor"
    ) {
      const cursor =
        editor.getCursor();

      const last =
        editor.lastLine();

      const text =
        editor
          .getRange(
            cursor,
            {
              line: last,
              ch:
                editor.getLine(
                  last
                ).length
            }
          )
          .trim();

      if (!text) {
        new Notice(
          "Logos: No text after cursor."
        );

        return null;
      }

      return await
        this.prepareReadableText(
          text,
          sourcePath
        );
    }

    const text =
      editor.getValue().trim();

    if (!text) {
      new Notice(
        "Logos: Current note is empty."
      );

      return null;
    }

    return await
      this.prepareReadableText(
        text,
        sourcePath
      );
  }

  // -------------------------
  // TTS
  // -------------------------

  async previewVoice():
    Promise<boolean> {

    let sampleText =
      "The quick brown fox jumps over the lazy dog. Clear speech makes every sound easier to hear.";

    if (
      this.voicePack ===
        "kokoro-multi" ||
      this.voicePack ===
        "kokoro-multi-fast"
    ) {
      sampleText =
        "Hello. Welcome to Logos. Clear speech helps us learn pronunciation. 你好，欢迎使用 Logos。";
    }

    return await
      this.speakWithLocalTts(
        sampleText
      );
  }

  async practicePronunciation(
    text: string
  ): Promise<boolean> {

    this.playbackRepeatsRemaining =
      Math.max(
        0,
        this.practiceRepeatCount - 1
      );

    return await
      this.speakWithLocalTts(
        text
      );
  }

  private splitTextForSpeech(
    text: string,
    maxChars = 1400
  ): string[] {

    if (
      text.length <= maxChars
    ) {
      return [text];
    }

    const chunks: string[] =
      [];

    let start = 0;

    while (
      start < text.length
    ) {
      let end =
        Math.min(
          start + maxChars,
          text.length
        );

      if (
        end < text.length
      ) {
        const minimumBreak =
          start +
          Math.floor(
            maxChars * 0.6
          );

        const window =
          text.slice(
            minimumBreak,
            end
          );

        let breakIndex =
          window.lastIndexOf(
            "\n\n"
          );

        if (
          breakIndex !== -1
        ) {
          end =
            minimumBreak +
            breakIndex + 2;
        } else {
          breakIndex =
            window.lastIndexOf(
              "\n"
            );

          if (
            breakIndex !== -1
          ) {
            end =
              minimumBreak +
              breakIndex + 1;
          } else {
            const whitespace =
              Math.max(
                window.lastIndexOf(
                  " "
                ),
                window.lastIndexOf(
                  "\t"
                )
              );

            if (
              whitespace !== -1
            ) {
              end =
                minimumBreak +
                whitespace + 1;
            }
          }
        }
      }

      if (
        end <= start
      ) {
        end =
          Math.min(
            start + maxChars,
            text.length
          );
      }

      const chunk =
        text.slice(
          start,
          end
        );

      if (
        chunk.length > 0
      ) {
        chunks.push(chunk);
      }

      start = end;
    }

    return chunks;
  }

  private getBundledNodePath(
    pluginPath: string
  ): string {

    if (process.platform === "win32") {
      return path.join(
        pluginPath,
        "runtime",
        "node.exe"
      );
    }

    if (process.platform === "darwin") {
      const runtimeDir =
        process.arch === "arm64"
          ? "darwin-arm64"
          : "darwin-x64";

      const nodePath =
        path.join(
          pluginPath,
          "runtime",
          runtimeDir,
          "node"
        );

      try {
        fs.chmodSync(
          nodePath,
          0o755
        );
      } catch {
        // Let spawn report the error if execution still fails.
      }

      return nodePath;
    }

    throw new Error(
      `Unsupported Logos platform: ${process.platform} ${process.arch}`
    );
  }

  private getWorkerEnv(
    pluginPath: string
  ) {

    const env = {
      ...process.env
    };

    if (
      process.platform === "darwin"
    ) {
      const nativePackage =
        process.arch === "arm64"
          ? "sherpa-onnx-darwin-arm64"
          : "sherpa-onnx-darwin-x64";

      const nativePath =
        path.join(
          pluginPath,
          "node_modules",
          nativePackage
        );

      env.DYLD_LIBRARY_PATH =
        env.DYLD_LIBRARY_PATH
          ? `${nativePath}:${env.DYLD_LIBRARY_PATH}`
          : nativePath;
    }

    return env;
  }

  private getTtsEnvironment():
    {
      pluginPath: string;
      nodePath: string;
      workerPath: string;
    } | null {

    const adapter =
      this.app.vault.adapter;

    if (
      !(
        adapter instanceof
        FileSystemAdapter
      )
    ) {
      return null;
    }

    const vaultPath =
      adapter.getBasePath();

    const pluginPath =
      path.join(
        vaultPath,
        this.app.vault.configDir,
        "plugins",
        "logos"
      );

    return {
      pluginPath,
      nodePath:
        this.getBundledNodePath(
          pluginPath
        ),
      workerPath:
        path.join(
          pluginPath,
          "kokoro-worker-persistent.cjs"
        )
    };
  }

  private async synthesizeSpeechChunk(
    text: string,
    chunkIndex: number,
    generation: number
  ): Promise<string | null> {

    const env =
      this.getTtsEnvironment();

    if (!env) {
      throw new Error(
        "Local TTS requires desktop Obsidian."
      );
    }

    if (
      generation !==
      this.playbackGeneration
    ) {
      return null;
    }

    const containsChinese =
      /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u
        .test(text);

    const effectivePack =
      containsChinese
        ? "kokoro-multi-fast"
        : this.voicePack;

    const effectiveSpeakerId =
      containsChinese
        ? 0
        : this.speakerId;

    const outputPath =
      path.join(
        env.pluginPath,
        `logos-chunk-${generation}-${chunkIndex}.wav`
      );

    const child =
      this.ensurePersistentTtsWorker(
        env.pluginPath,
        env.nodePath,
        env.workerPath
      );

    const result =
      await this.sendPersistentTtsRequest(
        child,
        {
          pack:
            effectivePack,
          text,
          output:
            outputPath,
          sid:
            effectiveSpeakerId,
          speed:
            this.speechRate
        }
      );

    if (
      generation !==
      this.playbackGeneration
    ) {
      return null;
    }

    console.log(
      `Logos chunk ${chunkIndex + 1}:`,
      result
    );

    if (
      this.audioProcessing ===
      "normalize"
    ) {
      this.normalizeWav16(
        outputPath
      );
    }

    if (
      !this.currentSpeechChunkFiles
        .includes(outputPath)
    ) {
      this.currentSpeechChunkFiles.push(
        outputPath
      );
    }

    return outputPath;
  }

  private async playSpeechChunk(
    outputPath: string,
    generation: number
  ): Promise<boolean> {

    if (
      generation !==
      this.playbackGeneration
    ) {
      return false;
    }

    const wavBuffer =
      fs.readFileSync(
        outputPath
      );

    const wavBytes =
      new Uint8Array(
        wavBuffer
      );

    const blob =
      new Blob(
        [wavBytes],
        {
          type:
            "audio/wav"
        }
      );

    this.cleanupAudio();

    this.audioObjectUrl =
      URL.createObjectURL(
        blob
      );

    const audioPlayer =
      new Audio(
        this.audioObjectUrl
      );

    this.audioPlayer =
      audioPlayer;

    this.attachAudioEvents();

    return await new Promise(
      resolve => {

        let finished =
          false;

        const finish =
          (value: boolean) => {

            if (finished) {
              return;
            }

            finished = true;

            if (
              this.chunkPlaybackResolver ===
              finish
            ) {
              this.chunkPlaybackResolver =
                null;
            }

            resolve(value);
          };

        this.chunkPlaybackResolver =
          finish;

        audioPlayer.onended =
          () => {

            if (
              generation !==
                this.playbackGeneration ||
              this.audioPlayer !==
                audioPlayer
            ) {
              finish(false);
              return;
            }

            this.audioPlayer =
              null;

            this.cleanupAudio();

            finish(true);
          };

        audioPlayer
          .play()
          .catch(
            error => {

              if (
                generation !==
                this.playbackGeneration
              ) {
                finish(false);
                return;
              }

              console.error(
                "Logos chunk playback error:",
                error
              );

              finish(false);
            }
          );
      }
    );
  }

  private async speakLongText(
    text: string
  ): Promise<boolean> {

    this.stopSpeech();

    this.playbackRepeatsRemaining =
      0;

    const generation =
      this.playbackGeneration;

    const chunks =
      this.splitTextForSpeech(
        text
      );

    console.log(
      `Logos: Long text split into ${chunks.length} chunks.`
    );

    if (
      chunks.length === 0
    ) {
      return false;
    }

    try {
      let currentPath =
        await this.synthesizeSpeechChunk(
          chunks[0],
          0,
          generation
        );

      if (
        !currentPath ||
        generation !==
          this.playbackGeneration
      ) {
        return false;
      }

      for (
        let index = 0;
        index < chunks.length;
        index++
      ) {
        if (
          generation !==
          this.playbackGeneration
        ) {
          return false;
        }

        const nextPromise =
          index + 1 <
          chunks.length
            ? this.synthesizeSpeechChunk(
                chunks[index + 1],
                index + 1,
                generation
              )
            : null;

        const played =
          await this.playSpeechChunk(
            currentPath,
            generation
          );

        if (!played) {
          return false;
        }

        if (
          generation !==
          this.playbackGeneration
        ) {
          return false;
        }

        if (nextPromise) {
          currentPath =
            await nextPromise;

          if (!currentPath) {
            return false;
          }
        }
      }

      return true;

    } catch (error) {

      if (
        generation !==
        this.playbackGeneration
      ) {
        return false;
      }

      console.error(
        "Logos long-text playback error:",
        error
      );

      new Notice(
        `Logos: Long-text speech failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );

      return false;
    }
  }

  async speakCurrentMode():
    Promise<boolean> {

    this.playbackRepeatsRemaining = 0;

    const text =
      await this.getTextForCurrentMode();

    if (!text) {
      return false;
    }

    const sourceFile =
      this.app.workspace
        .getActiveFile();

    this.currentSpeechSourcePath =
      sourceFile?.path ??
      null;

    this.currentSpeechChunkFiles =
      [];

    this.mergedLongSpeechWav =
      null;

    if (
      text.length > 1600
    ) {
      return await
        this.speakLongText(
          text
        );
    }

    return await
      this.speakWithLocalTts(
        text
      );
  }

  private rejectPendingTtsRequests(
    message: string
  ) {
    const error =
      new Error(message);

    for (
      const pending
      of this.pendingTtsRequests.values()
    ) {
      pending.reject(error);
    }

    this.pendingTtsRequests.clear();
  }

  private destroyPersistentTtsWorker(
    reason:
      string =
        "TTS worker stopped."
  ) {
    const child =
      this.activeTtsChild;

    this.activeTtsChild =
      null;

    this.ttsStdoutBuffer =
      "";

    this.ttsStderrBuffer =
      "";

    this.rejectPendingTtsRequests(
      reason
    );

    if (child) {
      try {
        child.kill();
      } catch (error) {
        console.warn(
          "Logos: Could not stop persistent TTS worker:",
          error
        );
      }
    }
  }

  private ensurePersistentTtsWorker(
    pluginPath: string,
    nodePath: string,
    workerPath: string
  ): ReturnType<typeof spawn> {

    if (
      this.activeTtsChild &&
      this.activeTtsChild.exitCode ===
        null &&
      !this.activeTtsChild.killed
    ) {
      return this.activeTtsChild;
    }

    const child =
      spawn(
        nodePath,
        [workerPath],
        {
              cwd: pluginPath,
              windowsHide: true,
              env: this.getWorkerEnv(
                pluginPath
              )
            }
      );

    this.activeTtsChild =
      child;

    this.ttsStdoutBuffer =
      "";

    this.ttsStderrBuffer =
      "";

    child.stdout.on(
      "data",
      data => {

        this.ttsStdoutBuffer +=
          data.toString();

        while (true) {
          const newlineIndex =
            this.ttsStdoutBuffer
              .indexOf("\n");

          if (
            newlineIndex === -1
          ) {
            break;
          }

          const line =
            this.ttsStdoutBuffer
              .slice(
                0,
                newlineIndex
              )
              .trim();

          this.ttsStdoutBuffer =
            this.ttsStdoutBuffer
              .slice(
                newlineIndex + 1
              );

          if (!line) {
            continue;
          }

          try {
            const result =
              JSON.parse(line);

            const id =
              Number(result.id);

            const pending =
              this.pendingTtsRequests
                .get(id);

            if (!pending) {
              console.warn(
                "Logos: Received TTS response for unknown request:",
                result
              );

              continue;
            }

            this.pendingTtsRequests
              .delete(id);

            if (
              result.success
            ) {
              pending.resolve(
                result
              );
            } else {
              pending.reject(
                new Error(
                  result.error ||
                  "Speech generation failed."
                )
              );
            }

          } catch (error) {
            console.error(
              "Logos: Could not parse persistent TTS response:",
              line,
              error
            );
          }
        }
      }
    );

    child.stderr.on(
      "data",
      data => {

        const message =
          data.toString();

        this.ttsStderrBuffer +=
          message;

        const trimmed =
          message.trim();

        if (trimmed) {
          console.warn(
            "Logos TTS worker:",
            trimmed
          );
        }
      }
    );

    child.on(
      "error",
      error => {

        if (
          this.activeTtsChild ===
          child
        ) {
          this.activeTtsChild =
            null;
        }

        console.error(
          "Logos persistent TTS process error:",
          error
        );

        this.rejectPendingTtsRequests(
          error.message
        );
      }
    );

    child.on(
      "close",
      (code, signal) => {

        if (
          this.activeTtsChild ===
          child
        ) {
          this.activeTtsChild =
            null;
        }

        if (
          this.pendingTtsRequests.size >
          0
        ) {
          const details =
            this.ttsStderrBuffer
              .trim();

          this.rejectPendingTtsRequests(
            details ||
            `TTS worker exited with code ${code}, signal ${signal}.`
          );
        }

        this.ttsStdoutBuffer =
          "";

        this.ttsStderrBuffer =
          "";
      }
    );

    return child;
  }

  private sendPersistentTtsRequest(
    child:
      ReturnType<typeof spawn>,
    request: {
      pack: string;
      text: string;
      output: string;
      sid: number;
      speed: number;
    }
  ): Promise<any> {

    const id =
      ++this.ttsRequestId;

    return new Promise(
      (resolve, reject) => {

        this.pendingTtsRequests
          .set(
            id,
            {
              resolve,
              reject
            }
          );

        try {
          child.stdin.write(
            JSON.stringify({
              id,
              action:
                "synthesize",
              ...request
            }) + "\n"
          );

        } catch (error) {
          this.pendingTtsRequests
            .delete(id);

          reject(
            error instanceof Error
              ? error
              : new Error(
                  String(error)
                )
          );
        }
      }
    );
  }

  async speakWithLocalTts(
    text: string
  ): Promise<boolean> {

    const requestedRepeats =
      this.playbackRepeatsRemaining;

    this.stopSpeech();

    this.playbackRepeatsRemaining =
      requestedRepeats;

    const generation =
      this.playbackGeneration;

    const adapter =
      this.app.vault.adapter;

    if (
      !(
        adapter instanceof
        FileSystemAdapter
      )
    ) {
      new Notice(
        "Logos: Local TTS requires desktop Obsidian."
      );

      return false;
    }

    const vaultPath =
      adapter.getBasePath();

    const pluginPath =
      path.join(
        vaultPath,
        this.app.vault.configDir,
        "plugins",
        "logos"
      );

    const workerPath =
      path.join(
        pluginPath,
        "kokoro-worker-persistent.cjs"
      );

    const outputPath =
      path.join(
        pluginPath,
        "logos-current.wav"
      );

    const nodePath =
      this.getBundledNodePath(
        pluginPath
      );

    const containsChinese =
      /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u
        .test(text);

    const effectivePack =
      containsChinese
        ? "kokoro-multi-fast"
        : this.voicePack;

    const effectiveSpeakerId =
      containsChinese
        ? 0
        : this.speakerId;

    try {
      const child =
        this.ensurePersistentTtsWorker(
          pluginPath,
          nodePath,
          workerPath
        );

      const result =
        await this.sendPersistentTtsRequest(
          child,
          {
            pack:
              effectivePack,
            text,
            output:
              outputPath,
            sid:
              effectiveSpeakerId,
            speed:
              this.speechRate
          }
        );

      if (
        generation !==
        this.playbackGeneration
      ) {
        return false;
      }

      console.log(
        "Logos result:",
        result
      );

      this.lastGeneratedWav =
        outputPath;

      if (
        this.audioProcessing ===
        "normalize"
      ) {
        this.normalizeWav16(
          outputPath
        );
      }

      const wavBuffer =
        fs.readFileSync(
          outputPath
        );

      const wavBytes =
        new Uint8Array(
          wavBuffer
        );

      const blob =
        new Blob(
          [wavBytes],
          {
            type:
              "audio/wav"
          }
        );

      this.audioObjectUrl =
        URL.createObjectURL(
          blob
        );

      const audioPlayer =
        new Audio(
          this.audioObjectUrl
        );

      this.audioPlayer =
        audioPlayer;

      this.attachAudioEvents();

      audioPlayer.onended =
        () => {

          if (
            generation !==
              this.playbackGeneration ||
            this.audioPlayer !==
              audioPlayer
          ) {
            return;
          }

          if (
            this.playbackRepeatsRemaining >
            0
          ) {
            this.playbackRepeatsRemaining--;

            audioPlayer.currentTime =
              0;

            audioPlayer
              .play()
              .catch(
                console.error
              );

            return;
          }

          this.playbackRepeatsRemaining =
            0;

          this.audioPlayer =
            null;

          this.cleanupAudio();
        };

      try {
        await audioPlayer.play();

        if (
          generation !==
          this.playbackGeneration
        ) {
          return false;
        }

        return true;

      } catch (error) {

        if (
          generation !==
          this.playbackGeneration
        ) {
          return false;
        }

        console.error(
          "Logos audio playback error:",
          error
        );

        new Notice(
          "Logos: Audio generated but playback failed."
        );

        return false;
      }

    } catch (error) {

      if (
        generation !==
        this.playbackGeneration
      ) {
        return false;
      }

      console.error(
        "Logos persistent TTS error:",
        error
      );

      new Notice(
        `Logos: Speech generation failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );

      return false;
    }
  }

  setProgressElements(
    slider: HTMLInputElement,
    currentTime: HTMLSpanElement,
    duration: HTMLSpanElement
  ) {
    this.progressSlider = slider;
    this.currentTimeEl = currentTime;
    this.durationEl = duration;
  }

  formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) {
      return "0:00";
    }

    const mins =
      Math.floor(seconds / 60);

    const secs =
      Math.floor(seconds % 60);

    return `${mins}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  attachAudioEvents() {
    if (!this.audioPlayer) {
      return;
    }

    this.audioPlayer.onloadedmetadata = () => {
      if (
        this.durationEl &&
        this.audioPlayer
      ) {
        this.durationEl.setText(
          this.formatTime(
            this.audioPlayer.duration
          )
        );
      }
    };

    this.audioPlayer.ontimeupdate = () => {
      if (!this.audioPlayer) {
        return;
      }

      if (this.currentTimeEl) {
        this.currentTimeEl.setText(
          this.formatTime(
            this.audioPlayer.currentTime
          )
        );
      }

      if (
        this.progressSlider &&
        Number.isFinite(
          this.audioPlayer.duration
        ) &&
        this.audioPlayer.duration > 0
      ) {
        this.progressSlider.value =
          Math.round(
            (
              this.audioPlayer.currentTime /
              this.audioPlayer.duration
            ) * 1000
          ).toString();
      }
    };
  }

  seekFromSlider(value: number) {
    if (
      !this.audioPlayer ||
      !Number.isFinite(
        this.audioPlayer.duration
      )
    ) {
      return;
    }

    this.audioPlayer.currentTime =
      (
        value / 1000
      ) *
      this.audioPlayer.duration;
  }

  getWavInfo(buffer: Buffer) {
    if (
      buffer.toString("ascii", 0, 4) !== "RIFF" ||
      buffer.toString("ascii", 8, 12) !== "WAVE"
    ) {
      throw new Error("Unsupported WAV file.");
    }

    let offset = 12;
    let channels = 1;
    let sampleRate = 24000;
    let bitsPerSample = 16;
    let dataOffset = -1;
    let dataSize = 0;

    while (offset + 8 <= buffer.length) {
      const chunkId =
        buffer.toString(
          "ascii",
          offset,
          offset + 4
        );

      const chunkSize =
        buffer.readUInt32LE(
          offset + 4
        );

      if (chunkId === "fmt ") {
        channels =
          buffer.readUInt16LE(
            offset + 10
          );

        sampleRate =
          buffer.readUInt32LE(
            offset + 12
          );

        bitsPerSample =
          buffer.readUInt16LE(
            offset + 22
          );
      }

      if (chunkId === "data") {
        dataOffset = offset + 8;
        dataSize = chunkSize;
        break;
      }

      offset +=
        8 +
        chunkSize +
        (chunkSize % 2);
    }

    if (dataOffset < 0) {
      throw new Error(
        "WAV data chunk not found."
      );
    }

    return {
      channels,
      sampleRate,
      bitsPerSample,
      dataOffset,
      dataSize
    };
  }

  normalizeWav16(
    filePath: string
  ) {
    const buffer =
      fs.readFileSync(filePath);

    const info =
      this.getWavInfo(buffer);

    if (
      info.bitsPerSample !== 16
    ) {
      console.warn(
        "Logos normalization skipped: WAV is not 16-bit PCM."
      );
      return;
    }

    const sampleCount =
      Math.floor(
        info.dataSize / 2
      );

    let peak = 0;

    for (
      let i = 0;
      i < sampleCount;
      i++
    ) {
      const value =
        buffer.readInt16LE(
          info.dataOffset +
          i * 2
        );

      peak =
        Math.max(
          peak,
          Math.abs(value)
        );
    }

    if (peak === 0) {
      return;
    }

    // Leave some headroom.
    const targetPeak =
      32767 * 0.88;

    const gain =
      Math.min(
        targetPeak / peak,
        3.0
      );

    for (
      let i = 0;
      i < sampleCount;
      i++
    ) {
      const pos =
        info.dataOffset +
        i * 2;

      const original =
        buffer.readInt16LE(pos);

      const amplified =
        Math.max(
          -32768,
          Math.min(
            32767,
            Math.round(
              original * gain
            )
          )
        );

      buffer.writeInt16LE(
        amplified,
        pos
      );
    }

    fs.writeFileSync(
      filePath,
      buffer
    );
  }

  private mergeWavFiles(
    inputPaths: string[],
    outputPath: string
  ) {
    if (
      inputPaths.length === 0
    ) {
      throw new Error(
        "No WAV chunks to merge."
      );
    }

    let sampleRate:
      number | null = null;

    let channels:
      number | null = null;

    let bitsPerSample:
      number | null = null;

    const pcmChunks:
      Buffer[] = [];

    for (
      const inputPath
      of inputPaths
    ) {
      const buffer =
        fs.readFileSync(
          inputPath
        );

      if (
        buffer.toString(
          "ascii",
          0,
          4
        ) !== "RIFF" ||
        buffer.toString(
          "ascii",
          8,
          12
        ) !== "WAVE"
      ) {
        throw new Error(
          `Invalid WAV file: ${inputPath}`
        );
      }

      let offset = 12;

      let localChannels = 0;
      let localSampleRate = 0;
      let localBits = 0;

      let dataOffset = -1;
      let dataSize = 0;

      while (
        offset + 8 <=
        buffer.length
      ) {
        const chunkId =
          buffer.toString(
            "ascii",
            offset,
            offset + 4
          );

        const chunkSize =
          buffer.readUInt32LE(
            offset + 4
          );

        if (
          chunkId === "fmt "
        ) {
          localChannels =
            buffer.readUInt16LE(
              offset + 10
            );

          localSampleRate =
            buffer.readUInt32LE(
              offset + 12
            );

          localBits =
            buffer.readUInt16LE(
              offset + 22
            );
        }

        if (
          chunkId === "data"
        ) {
          dataOffset =
            offset + 8;

          dataSize =
            chunkSize;

          break;
        }

        offset +=
          8 +
          chunkSize +
          (chunkSize % 2);
      }

      if (
        dataOffset < 0
      ) {
        throw new Error(
          `WAV data chunk missing: ${inputPath}`
        );
      }

      if (
        sampleRate === null
      ) {
        sampleRate =
          localSampleRate;

        channels =
          localChannels;

        bitsPerSample =
          localBits;
      } else if (
        sampleRate !==
          localSampleRate ||
        channels !==
          localChannels ||
        bitsPerSample !==
          localBits
      ) {
        throw new Error(
          "WAV chunks use different audio formats."
        );
      }

      pcmChunks.push(
        buffer.subarray(
          dataOffset,
          dataOffset +
          dataSize
        )
      );
    }

    if (
      sampleRate === null ||
      channels === null ||
      bitsPerSample === null
    ) {
      throw new Error(
        "Could not determine WAV format."
      );
    }

    const pcm =
      Buffer.concat(
        pcmChunks
      );

    const byteRate =
      sampleRate *
      channels *
      (
        bitsPerSample /
        8
      );

    const blockAlign =
      channels *
      (
        bitsPerSample /
        8
      );

    const header =
      Buffer.alloc(44);

    header.write(
      "RIFF",
      0,
      "ascii"
    );

    header.writeUInt32LE(
      36 + pcm.length,
      4
    );

    header.write(
      "WAVE",
      8,
      "ascii"
    );

    header.write(
      "fmt ",
      12,
      "ascii"
    );

    header.writeUInt32LE(
      16,
      16
    );

    header.writeUInt16LE(
      1,
      20
    );

    header.writeUInt16LE(
      channels,
      22
    );

    header.writeUInt32LE(
      sampleRate,
      24
    );

    header.writeUInt32LE(
      byteRate,
      28
    );

    header.writeUInt16LE(
      blockAlign,
      32
    );

    header.writeUInt16LE(
      bitsPerSample,
      34
    );

    header.write(
      "data",
      36,
      "ascii"
    );

    header.writeUInt32LE(
      pcm.length,
      40
    );

    fs.writeFileSync(
      outputPath,
      Buffer.concat([
        header,
        pcm
      ])
    );
  }

  private getCurrentExportWav():
    string | null {

    if (
      this.currentSpeechChunkFiles
        .length > 0
    ) {
      const existing =
        this.currentSpeechChunkFiles
          .filter(
            file =>
              fs.existsSync(file)
          );

      if (
        existing.length > 0
      ) {
        const adapter =
          this.app.vault.adapter;

        if (
          adapter instanceof
          FileSystemAdapter
        ) {
          const pluginPath =
            path.join(
              adapter.getBasePath(),
              this.app.vault.configDir,
              "plugins",
              "logos"
            );

          const mergedPath =
            path.join(
              pluginPath,
              "logos-current-long.wav"
            );

          this.mergeWavFiles(
            existing,
            mergedPath
          );

          this.mergedLongSpeechWav =
            mergedPath;

          this.lastGeneratedWav =
            mergedPath;

          return mergedPath;
        }
      }
    }

    if (
      this.lastGeneratedWav &&
      fs.existsSync(
        this.lastGeneratedWav
      )
    ) {
      return this.lastGeneratedWav;
    }

    return null;
  }

  wavToMp3(
    wavPath: string,
    mp3Path: string
  ) {
    const buffer =
      fs.readFileSync(wavPath);

    const info =
      this.getWavInfo(buffer);

    if (
      info.bitsPerSample !== 16
    ) {
      throw new Error(
        "MP3 export currently supports 16-bit WAV."
      );
    }

    const totalSamples =
      Math.floor(
        info.dataSize / 2
      );

    const pcm =
      new Int16Array(
        totalSamples
      );

    for (
      let i = 0;
      i < totalSamples;
      i++
    ) {
      pcm[i] =
        buffer.readInt16LE(
          info.dataOffset +
          i * 2
        );
    }

    const channels =
      info.channels;

    const encoder =
      new lame.Mp3Encoder(
        channels,
        info.sampleRate,
        128
      );

    const mp3Chunks:
      Int8Array[] = [];

    const blockSize = 1152;

    if (channels === 1) {
      for (
        let i = 0;
        i < pcm.length;
        i += blockSize
      ) {
        const chunk =
          pcm.subarray(
            i,
            i + blockSize
          );

        const encoded =
          encoder.encodeBuffer(
            chunk
          );

        if (encoded.length > 0) {
          mp3Chunks.push(
            encoded
          );
        }
      }
    } else {
      const frameCount =
        Math.floor(
          pcm.length / 2
        );

      const left =
        new Int16Array(
          frameCount
        );

      const right =
        new Int16Array(
          frameCount
        );

      for (
        let i = 0;
        i < frameCount;
        i++
      ) {
        left[i] =
          pcm[i * 2];

        right[i] =
          pcm[i * 2 + 1];
      }

      for (
        let i = 0;
        i < frameCount;
        i += blockSize
      ) {
        const encoded =
          encoder.encodeBuffer(
            left.subarray(
              i,
              i + blockSize
            ),
            right.subarray(
              i,
              i + blockSize
            )
          );

        if (encoded.length > 0) {
          mp3Chunks.push(
            encoded
          );
        }
      }
    }

    const flushed =
      encoder.flush();

    if (flushed.length > 0) {
      mp3Chunks.push(
        flushed
      );
    }

    fs.writeFileSync(
      mp3Path,
      Buffer.concat(
        mp3Chunks.map(
          chunk =>
            Buffer.from(chunk)
        )
      )
    );
  }

  private async embedSavedAudioInSourceNote(
    vaultRelativeAudioPath: string
  ) {
    const sourcePath =
      this.currentSpeechSourcePath;

    if (!sourcePath) {
      return;
    }

    if (
      !sourcePath
        .toLowerCase()
        .endsWith(".md")
    ) {
      return;
    }

    const sourceFile =
      this.app.vault
        .getAbstractFileByPath(
          sourcePath
        );

    if (!sourceFile) {
      return;
    }

    try {
      const content =
        await this.app.vault
          .read(
            sourceFile as any
          );

      const embed =
        `![[${vaultRelativeAudioPath}]]`;

      if (
        content.includes(embed)
      ) {
        return;
      }

      await this.app.vault
        .modify(
          sourceFile as any,
          `${embed}\n\n${content}`
        );

    } catch (error) {
      console.error(
        "Logos audio embed error:",
        error
      );

      new Notice(
        "Logos: Audio saved, but could not embed it in the note."
      );
    }
  }

  private getAudioExportDestination(
    extension: "wav" | "mp3"
  ): {
    absolutePath: string;
    vaultRelativePath: string;
  } | null {

    const adapter =
      this.app.vault.adapter;

    if (
      !(
        adapter instanceof
        FileSystemAdapter
      )
    ) {
      return null;
    }

    const vaultPath =
      adapter.getBasePath();

    const sourcePath =
      this.currentSpeechSourcePath;

    let sourceDirectory = "";
    let baseName =
      "logos-audio";

    if (sourcePath) {
      const parsed =
        path.posix.parse(
          sourcePath
        );

      sourceDirectory =
        parsed.dir;

      baseName =
        parsed.name.replace(
          /[^a-zA-Z0-9_-]/g,
          "-"
        );
    }

    const audioDirectoryRelative =
      sourceDirectory
        ? `${sourceDirectory}/Logos Audio`
        : "Logos Audio";

    const audioDirectoryAbsolute =
      path.join(
        vaultPath,
        ...audioDirectoryRelative
          .split("/")
      );

    fs.mkdirSync(
      audioDirectoryAbsolute,
      {
        recursive: true
      }
    );

    let filename =
      `${baseName}-voice.${extension}`;

    let absolutePath =
      path.join(
        audioDirectoryAbsolute,
        filename
      );

    let counter = 2;

    while (
      fs.existsSync(
        absolutePath
      )
    ) {
      filename =
        `${baseName}-voice-${counter}.${extension}`;

      absolutePath =
        path.join(
          audioDirectoryAbsolute,
          filename
        );

      counter++;
    }

    return {
      absolutePath,
      vaultRelativePath:
        `${audioDirectoryRelative}/${filename}`
    };
  }

  async exportMp3() {
    try {
      const sourceWav =
        this.getCurrentExportWav();

      if (!sourceWav) {
        new Notice(
          "Logos: Generate speech first."
        );

        return;
      }

      const destination =
        this.getAudioExportDestination(
          "mp3"
        );

      if (!destination) {
        new Notice(
          "Logos: MP3 export requires desktop Obsidian."
        );

        return;
      }

      this.wavToMp3(
        sourceWav,
        destination.absolutePath
      );

      await this.embedSavedAudioInSourceNote(
        destination.vaultRelativePath
      );

      new Notice(
        `Logos: MP3 saved and linked as ${path.basename(
          destination.absolutePath
        )}`
      );

    } catch (error) {
      console.error(
        "Logos MP3 export error:",
        error
      );

      new Notice(
        "Logos: MP3 export failed."
      );
    }
  }

  async exportWav() {
    try {
      const sourceWav =
        this.getCurrentExportWav();

      if (!sourceWav) {
        new Notice(
          "Logos: Generate speech first."
        );

        return;
      }

      const destination =
        this.getAudioExportDestination(
          "wav"
        );

      if (!destination) {
        new Notice(
          "Logos: WAV export requires desktop Obsidian."
        );

        return;
      }

      fs.copyFileSync(
        sourceWav,
        destination.absolutePath
      );

      await this.embedSavedAudioInSourceNote(
        destination.vaultRelativePath
      );

      new Notice(
        `Logos: WAV saved and linked as ${path.basename(
          destination.absolutePath
        )}`
      );

    } catch (error) {
      console.error(
        "Logos WAV export error:",
        error
      );

      new Notice(
        "Logos: WAV export failed."
      );
    }
  }

  pauseSpeech() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
    }
  }

  resumeSpeech() {
    if (
      this.audioPlayer &&
      this.audioPlayer.paused
    ) {
      this.audioPlayer
        .play()
        .catch(console.error);
    }
  }

  stopSpeech() {

    // Invalidate every callback or synthesis
    // started before this Stop.
    this.playbackGeneration++;

    this.playbackRepeatsRemaining =
      0;

    if (
      this.chunkPlaybackResolver
    ) {
      const resolveChunk =
        this.chunkPlaybackResolver;

      this.chunkPlaybackResolver =
        null;

      resolveChunk(false);
    }

    if (
      this.pendingTtsRequests.size >
      0
    ) {
      this.destroyPersistentTtsWorker(
        "Speech generation cancelled."
      );
    }

    if (this.audioPlayer) {
      const audioPlayer =
        this.audioPlayer;

      // Prevent an ended event from restarting
      // playback after Stop.
      audioPlayer.onended =
        null;

      audioPlayer.pause();

      try {
        audioPlayer.currentTime =
          0;
      } catch {
        // Ignore seek errors during shutdown.
      }

      this.audioPlayer =
        null;
    }

    this.cleanupAudio();
  }

  cleanupAudio() {
    if (this.audioObjectUrl) {
      URL.revokeObjectURL(
        this.audioObjectUrl
      );

      this.audioObjectUrl = null;
    }
  }

  onunload() {
    this.stopSpeech();

    this.destroyPersistentTtsWorker(
      "Logos unloaded."
    );

    this.app.workspace
      .detachLeavesOfType(
        LOGOS_VIEW_TYPE
      );

    console.log(
      "Logos unloaded"
    );
  }
}
