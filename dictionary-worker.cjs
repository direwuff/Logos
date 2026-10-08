const path = require("path");
const { DatabaseSync } = require("node:sqlite");

let input = "";

process.stdin.setEncoding("utf8");

process.stdin.on("data", chunk => {
  input += chunk;
});

process.stdin.on("end", () => {
  try {
    const request = JSON.parse(input);

    const dbPath = path.join(
      __dirname,
      "dictionaries",
      "core",
      "logos-dictionary.sqlite3"
    );

    const db = new DatabaseSync(
      dbPath,
      {
        readOnly: true
      }
    );

    const query =
      String(request.query || "")
        .trim();

    const language =
      String(
        request.language || "all"
      );

    const matchMode =
      String(
        request.matchMode || "smart"
      );

    const limit =
      Math.max(
        1,
        Math.min(
          Number(request.limit || 20),
          50
        )
      );

    const learnerExpressionsPath =
      require("node:path").join(
        __dirname,
        "dictionaries",
        "core",
        "learner-expressions.json"
      );

    let learnerExpressions = [];

    try {
      const rawLearnerExpressions =
        require("node:fs").readFileSync(
          learnerExpressionsPath,
          "utf8"
        );

      const parsedLearnerExpressions =
        JSON.parse(
          rawLearnerExpressions
        );

      learnerExpressions =
        Array.isArray(
          parsedLearnerExpressions
            ?.entries
        )
          ? parsedLearnerExpressions
              .entries
          : [];

    } catch (error) {
      console.error(
        "Could not load Logos learner expressions:",
        error
      );

      learnerExpressions = [];
    }

    const normalizeLearnerExpression =
      value =>
        String(value || "")
          .trim()
          .toLocaleLowerCase()
          .replace(
            /\s+/g,
            " "
          );

    const learnerExpressionMap =
      new Map();

    for (
      let index = 0;
      index <
        learnerExpressions.length;
      index += 1
    ) {
      const entry =
        learnerExpressions[index];

      if (
        !entry ||
        !entry.expression
      ) {
        continue;
      }

      const keys = [
        entry.expression,
        ...(
          Array.isArray(
            entry.aliases
          )
            ? entry.aliases
            : []
        )
      ];

      for (const key of keys) {
        const normalized =
          normalizeLearnerExpression(
            key
          );

        if (normalized) {
          learnerExpressionMap.set(
            normalized,
            {
              ...entry,
              _index: index
            }
          );
        }
      }
    }

    const getLearnerExpressionEntry =
      query => {

        const normalized =
          normalizeLearnerExpression(
            query
          );

        const entry =
          learnerExpressionMap.get(
            normalized
          );

        if (!entry) {
          return null;
        }

        const details = [];

        if (
          entry.expanded_form
        ) {
          details.push(
            `Full form: ${
              entry.expanded_form
            }`
          );
        }

        if (
          entry.chinese
        ) {
          details.push(
            `中文: ${
              entry.chinese
            }`
          );
        }

        if (
          entry.learner_note
        ) {
          details.push(
            `Learner note: ${
              entry.learner_note
            }`
          );
        }

        return {
          id:
            -200000 -
            Number(
              entry._index || 0
            ),

          language: "en",

          word:
            entry.expression,

          display_word:
            entry.expression,

          pronunciation: null,

          part_of_speech:
            entry.type ||
            "expression",

          definition:
            [
              entry.definition,
              ...details
            ]
              .filter(Boolean)
              .join("\n"),

          source:
            "Logos Learner Expressions",

          logos_example:
            entry.example || null,

          logos_chinese:
            entry.chinese || null,

          logos_expanded_form:
            entry.expanded_form ||
            null,

          logos_learner_note:
            entry.learner_note ||
            null,

          logos_expression_type:
            entry.type ||
            "expression"
        };
      };

    const learnerGlossary = {
      "a": {
        part_of_speech: "determiner",
        definition:
          "used before a singular noun when referring to one person or thing that is not specific"
      },

      "an": {
        part_of_speech: "determiner",
        definition:
          "used instead of 'a' before a vowel sound"
      },

      "the": {
        part_of_speech: "determiner",
        definition:
          "used before a noun when the person or thing is specific or already known"
      },

      "and": {
        part_of_speech: "conjunction",
        definition:
          "used to join words, phrases, or ideas together"
      },

      "or": {
        part_of_speech: "conjunction",
        definition:
          "used to show a choice or another possibility"
      },

      "but": {
        part_of_speech: "conjunction",
        definition:
          "used to introduce an idea that contrasts with what came before"
      },

      "because": {
        part_of_speech: "conjunction",
        definition:
          "used to give the reason for something"
      },

      "if": {
        part_of_speech: "conjunction",
        definition:
          "used to introduce a condition that may or may not happen"
      },

      "of": {
        part_of_speech: "preposition",
        definition:
          "used to show a relationship, connection, amount, or belonging"
      },

      "with": {
        part_of_speech: "preposition",
        definition:
          "together with, using, having, or accompanied by someone or something"
      },

      "without": {
        part_of_speech: "preposition",
        definition:
          "not having, using, or being accompanied by someone or something"
      },

      "to": {
        part_of_speech: "preposition",
        definition:
          "used to show direction, destination, recipient, or relationship"
      },

      "from": {
        part_of_speech: "preposition",
        definition:
          "used to show where something begins, comes from, or originates"
      },

      "for": {
        part_of_speech: "preposition",
        definition:
          "used to show purpose, benefit, duration, or who something is intended for"
      },

      "in": {
        part_of_speech: "preposition",
        definition:
          "inside a place, area, period of time, or situation"
      },

      "on": {
        part_of_speech: "preposition",
        definition:
          "touching or supported by a surface, or referring to a particular subject or time"
      },

      "at": {
        part_of_speech: "preposition",
        definition:
          "used to show a particular place, point, time, or activity"
      },

      "by": {
        part_of_speech: "preposition",
        definition:
          "near, beside, through the action of, or using a particular method"
      },

      "about": {
        part_of_speech: "preposition",
        definition:
          "concerning a subject or approximately a particular amount"
      },

      "into": {
        part_of_speech: "preposition",
        definition:
          "moving from outside to inside something"
      },

      "through": {
        part_of_speech: "preposition",
        definition:
          "moving from one side or end of something to the other"
      },

      "this": {
        part_of_speech: "determiner",
        definition:
          "used to identify a person or thing that is near or being discussed"
      },

      "that": {
        part_of_speech: "determiner",
        definition:
          "used to identify a particular person or thing, often one farther away"
      },

      "these": {
        part_of_speech: "determiner",
        definition:
          "the plural form of 'this', referring to people or things that are near"
      },

      "those": {
        part_of_speech: "determiner",
        definition:
          "the plural form of 'that', often referring to people or things farther away"
      },

      "i": {
        part_of_speech: "pronoun",
        definition:
          "the word a speaker uses to refer to themselves"
      },

      "you": {
        part_of_speech: "pronoun",
        definition:
          "the word used to refer to the person or people being spoken to"
      },

      "he": {
        part_of_speech: "pronoun",
        definition:
          "used to refer to a male person who has already been mentioned or is known"
      },

      "she": {
        part_of_speech: "pronoun",
        definition:
          "used to refer to a female person who has already been mentioned or is known"
      },

      "it": {
        part_of_speech: "pronoun",
        definition:
          "used to refer to a thing, animal, situation, or idea already mentioned or understood"
      },

      "we": {
        part_of_speech: "pronoun",
        definition:
          "used by a speaker to refer to themselves together with one or more other people"
      },

      "they": {
        part_of_speech: "pronoun",
        definition:
          "used to refer to people, animals, or things already mentioned or understood"
      },

      "me": {
        part_of_speech: "pronoun",
        definition:
          "the object form of 'I', used when the speaker receives an action"
      },

      "him": {
        part_of_speech: "pronoun",
        definition:
          "the object form of 'he'"
      },

      "her": {
        part_of_speech: "pronoun",
        definition:
          "used as the object form of 'she'"
      },

      "us": {
        part_of_speech: "pronoun",
        definition:
          "the object form of 'we'"
      },

      "them": {
        part_of_speech: "pronoun",
        definition:
          "the object form of 'they'"
      },

      "my": {
        part_of_speech: "determiner",
        definition:
          "belonging to or connected with the speaker"
      },

      "your": {
        part_of_speech: "determiner",
        definition:
          "belonging to or connected with the person or people being spoken to"
      },

      "his": {
        part_of_speech: "determiner",
        definition:
          "belonging to or connected with a male person already mentioned"
      },

      "our": {
        part_of_speech: "determiner",
        definition:
          "belonging to or connected with the speaker and one or more other people"
      },

      "their": {
        part_of_speech: "determiner",
        definition:
          "belonging to or connected with people or things already mentioned"
      },

      "what": {
        part_of_speech: "pronoun",
        definition:
          "used to ask for information about a thing, idea, action, or situation"
      },

      "which": {
        part_of_speech: "determiner",
        definition:
          "used to ask someone to choose from a known or limited set of possibilities"
      },

      "who": {
        part_of_speech: "pronoun",
        definition:
          "used to ask which person or people are involved"
      },

      "whom": {
        part_of_speech: "pronoun",
        definition:
          "used as the object form of 'who', especially in formal English"
      },

      "whose": {
        part_of_speech: "determiner",
        definition:
          "used to ask who something belongs to"
      },

      "where": {
        part_of_speech: "adverb",
        definition:
          "used to ask about or refer to a place or position"
      },

      "when": {
        part_of_speech: "adverb",
        definition:
          "used to ask about or refer to a time"
      },

      "why": {
        part_of_speech: "adverb",
        definition:
          "used to ask for the reason something happens or is true"
      },

      "how": {
        part_of_speech: "adverb",
        definition:
          "used to ask about the way, condition, amount, or degree of something"
      },

      "here": {
        part_of_speech: "adverb",
        definition:
          "in, at, or to this place"
      },

      "there": {
        part_of_speech: "adverb",
        definition:
          "in, at, or to a place away from the speaker"
      },

      "now": {
        part_of_speech: "adverb",
        definition:
          "at the present time"
      },

      "then": {
        part_of_speech: "adverb",
        definition:
          "at that time, after that, or in that case"
      },

      "always": {
        part_of_speech: "adverb",
        definition:
          "at all times or every time"
      },

      "never": {
        part_of_speech: "adverb",
        definition:
          "not at any time"
      },

      "often": {
        part_of_speech: "adverb",
        definition:
          "many times or frequently"
      },

      "sometimes": {
        part_of_speech: "adverb",
        definition:
          "on some occasions but not always"
      },

      "too": {
        part_of_speech: "adverb",
        definition:
          "also, or more than is wanted or needed"
      },

      "so": {
        part_of_speech: "adverb",
        definition:
          "to such a degree, in this way, or for that reason"
      },

      "than": {
        part_of_speech: "conjunction",
        definition:
          "used when comparing one person, thing, amount, or action with another"
      },

      "while": {
        part_of_speech: "conjunction",
        definition:
          "during the time that something happens, or used to contrast two ideas"
      },

      "although": {
        part_of_speech: "conjunction",
        definition:
          "used to introduce a statement that contrasts with the main statement"
      },

      "though": {
        part_of_speech: "conjunction",
        definition:
          "used to introduce a contrast or unexpected fact"
      },

      "before": {
        part_of_speech: "preposition",
        definition:
          "earlier than a particular time, event, or position"
      },

      "after": {
        part_of_speech: "preposition",
        definition:
          "later than a particular time or event"
      },

      "during": {
        part_of_speech: "preposition",
        definition:
          "throughout or at some time within a period or event"
      },

      "between": {
        part_of_speech: "preposition",
        definition:
          "in the space, time, or relationship separating two or more things"
      },

      "under": {
        part_of_speech: "preposition",
        definition:
          "below something or at a lower level than it"
      },

      "over": {
        part_of_speech: "preposition",
        definition:
          "above something, across it, or covering it"
      },

      "can": {
        part_of_speech: "modal verb",
        definition:
          "used to express ability, possibility, or permission"
      },

      "could": {
        part_of_speech: "modal verb",
        definition:
          "used to express past ability, possibility, suggestion, or polite requests"
      },

      "may": {
        part_of_speech: "modal verb",
        definition:
          "used to express possibility or permission"
      },

      "might": {
        part_of_speech: "modal verb",
        definition:
          "used to express a possibility that is uncertain"
      },

      "must": {
        part_of_speech: "modal verb",
        definition:
          "used to express necessity, strong obligation, or a strong conclusion"
      },

      "should": {
        part_of_speech: "modal verb",
        definition:
          "used to express advice, expectation, or what is considered right"
      },

      "would": {
        part_of_speech: "modal verb",
        definition:
          "used for imagined situations, polite requests, habits in the past, or future-in-the-past"
      },

      "will": {
        part_of_speech: "modal verb",
        definition:
          "used to talk about the future, willingness, or intention"
      },

      "do": {
        part_of_speech: "verb",
        definition:
          "to perform an action or activity; also used as an auxiliary verb"
      },

      "have": {
        part_of_speech: "verb",
        definition:
          "to own, possess, experience, or contain something; also used as an auxiliary verb"
      },

      "be": {
        part_of_speech: "verb",
        definition:
          "used to describe existence, identity, condition, or state"
      },

      "some": {
        part_of_speech: "determiner",
        definition:
          "an unspecified amount or number of people or things"
      },

      "any": {
        part_of_speech: "determiner",
        definition:
          "one, some, or all of something without specifying exactly which"
      },

      "each": {
        part_of_speech: "determiner",
        definition:
          "every individual person or thing considered separately"
      },

      "every": {
        part_of_speech: "determiner",
        definition:
          "all members of a group considered individually"
      },

      "very": {
        part_of_speech: "adverb",
        definition:
          "used to emphasize a high degree or intensity"
      },

      "not": {
        part_of_speech: "adverb",
        definition:
          "used to make a word, phrase, or statement negative"
      },

      "also": {
        part_of_speech: "adverb",
        definition:
          "in addition; too"
      },

      "only": {
        part_of_speech: "adverb",
        definition:
          "and no more than this; solely"
      },

      "as": {
        part_of_speech: "conjunction",
        definition:
          "used to compare things or to describe the way, time, or reason something happens"
      }
    };

    const getLearnerGlossaryEntry =
      word => {

        const key =
          String(word || "")
            .trim()
            .toLocaleLowerCase();

        const entry =
          learnerGlossary[key];

        if (!entry) {
          return null;
        }

        return {
          id:
            -100000 -
            Object.keys(
              learnerGlossary
            ).indexOf(key),

          language: "en",

          word: key,

          display_word: key,

          pronunciation: null,

          part_of_speech:
            entry.part_of_speech,

          definition:
            entry.definition,

          source:
            "Logos Learner Glossary"
        };
      };

    const getEnglishPreferredPos =
      word => {

        const q =
          String(word || "")
            .trim()
            .toLocaleLowerCase();

        const verbForms =
          new Set([
            "am",
            "is",
            "are",
            "was",
            "were",
            "been",
            "being",
            "has",
            "had",
            "does",
            "did",
            "done",
            "went",
            "gone",
            "came",
            "saw",
            "seen",
            "took",
            "taken",
            "gave",
            "given",
            "got",
            "gotten",
            "made",
            "knew",
            "known",
            "thought",
            "brought",
            "bought",
            "taught",
            "caught",
            "found",
            "told",
            "said",
            "spoke",
            "spoken",
            "wrote",
            "written",
            "ran",
            "ate",
            "eaten",
            "drank",
            "drunk",
            "drove",
            "driven",
            "chose",
            "chosen",
            "broke",
            "broken"
          ]);

        const nounForms =
          new Set([
            "children",
            "mice",
            "men",
            "women",
            "feet",
            "teeth",
            "geese"
          ]);

        const adjectiveForms =
          new Set([
            "better",
            "best",
            "worse",
            "worst"
          ]);

        if (
          verbForms.has(q)
        ) {
          return "verb";
        }

        if (
          nounForms.has(q)
        ) {
          return "noun";
        }

        if (
          adjectiveForms.has(q)
        ) {
          return "adjective";
        }

        if (
          q.endsWith("ing") ||
          q.endsWith("ed") ||
          q.endsWith("ied")
        ) {
          return "verb";
        }

        if (
          q.endsWith("ies") ||
          q.endsWith("ves") ||
          (
            q.endsWith("s") &&
            !q.endsWith("ss")
          )
        ) {
          return "noun";
        }

        return null;
      };

    const getEnglishLemmaCandidates =
      word => {

        const q =
          String(word || "")
            .trim()
            .toLocaleLowerCase();

        if (
          !/^[a-z][a-z'-]*$/i.test(q)
        ) {
          return [];
        }

        const irregular = {
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

          read: ["read"],

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

        const candidates =
          new Set(
            irregular[q] || []
          );

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

        return Array.from(
          candidates
        ).filter(
          candidate =>
            candidate &&
            candidate !== q
        );
      };

    if (!query) {
      process.stdout.write(
        JSON.stringify({
          success: true,
          results: []
        })
      );

      db.close();
      return;
    }

    const languageSql =
      language === "all"
        ? ""
        : " AND language = ? ";

    const runQuery = (
      whereClause,
      value
    ) => {
      const sql = `
        SELECT
          id,
          language,
          word,
          display_word,
          pronunciation,
          part_of_speech,
          definition,
          source
        FROM entries
        WHERE ${whereClause}
        ${languageSql}
        ORDER BY
          CASE
            WHEN word = ? THEN 0
            ELSE 1
          END,
          length(word),
          word
        LIMIT ?
      `;

      const params = [value];

      if (language !== "all") {
        params.push(language);
      }

      params.push(query);
      params.push(limit);

      return db
        .prepare(sql)
        .all(...params);
    };

    let results = [];

    if (matchMode === "exact") {
      results = runQuery(
        "word = ?",
        query
      );
    }

    else if (
      matchMode === "contains"
    ) {
      results = runQuery(
        "(word LIKE ? OR pronunciation LIKE ? OR definition LIKE ?)",
        `%${query}%`
      );

      // runQuery only handles one search parameter,
      // so use explicit query here instead.
      const sql = `
        SELECT
          id,
          language,
          word,
          display_word,
          pronunciation,
          part_of_speech,
          definition,
          source
        FROM entries
        WHERE
          (
            word LIKE ?
            OR pronunciation LIKE ?
            OR definition LIKE ?
          )
          ${languageSql}
        ORDER BY
          CASE
            WHEN word = ? THEN 0
            ELSE 1
          END,
          length(word),
          word
        LIMIT ?
      `;

      const params = [
        `%${query}%`,
        `%${query}%`,
        `%${query}%`
      ];

      if (language !== "all") {
        params.push(language);
      }

      params.push(query);
      params.push(limit);

      results =
        db.prepare(sql).all(...params);
    }

    else {

      const isChineseMode =
        language === "zh-Hans" ||
        language === "zh-Hant";

      if (isChineseMode) {

        const looksChinese =
          /[\u3400-\u9FFF\uF900-\uFAFF]/.test(
            query
          );

        const looksPinyin =
          /[a-zA-ZüÜvV]+[1-5]/.test(
            query
          );

        if (looksChinese) {

          const sql = `
            SELECT
              id,
              language,
              word,
              display_word,
              pronunciation,
              part_of_speech,
              definition,
              source
            FROM entries
            WHERE language = ?
              AND (
                word = ?
                OR word LIKE ?
              )
            ORDER BY
              CASE
                WHEN word = ? THEN 0
                ELSE 1
              END,
              length(word),
              word
            LIMIT ?
          `;

          results =
            db.prepare(sql).all(
              language,
              query,
              `${query}%`,
              query,
              limit
            );

        } else if (looksPinyin) {

          const sql = `
            SELECT
              id,
              language,
              word,
              display_word,
              pronunciation,
              part_of_speech,
              definition,
              source
            FROM entries
            WHERE language = ?
              AND (
                lower(pronunciation)
                  = lower(?)
                OR lower(pronunciation)
                  LIKE lower(?)
              )
            ORDER BY
              CASE
                WHEN lower(pronunciation)
                  = lower(?)
                THEN 0
                ELSE 1
              END,
              CASE
                WHEN length(word) = 2 THEN 0
                WHEN length(word) = 3 THEN 1
                WHEN length(word) = 1 THEN 2
                ELSE 3
              END,
              length(word),
              word
            LIMIT ?
          `;

          const pinyinCandidates =
            db.prepare(sql).all(
              language,
              query,
              `${query}%`,
              query,
              100
            );

          const exactPinyin =
            pinyinCandidates.filter(
              result =>
                String(
                  result.pronunciation || ""
                ).toLocaleLowerCase()
                  ===
                query.toLocaleLowerCase()
            );

          const anchorWords =
            exactPinyin.map(
              result =>
                String(result.word)
            );

          const scorePinyin =
            result => {

              const pronunciation =
                String(
                  result.pronunciation || ""
                ).toLocaleLowerCase();

              const word =
                String(
                  result.word || ""
                );

              let score = 0;

              if (
                pronunciation ===
                query.toLocaleLowerCase()
              ) {
                score -= 100;
              }

              for (
                const anchor
                of anchorWords
              ) {
                if (
                  word === anchor
                ) {
                  score -= 100;
                }

                else if (
                  word.startsWith(anchor)
                ) {
                  score -= 60;
                }
              }

              return score;
            };

          results =
            pinyinCandidates
              .sort(
                (a, b) =>
                  scorePinyin(a) -
                    scorePinyin(b) ||
                  String(a.word)
                    .localeCompare(
                      String(b.word),
                      "zh"
                    )
              )
              .slice(
                0,
                limit
              );

        } else {

          // English -> Chinese lookup.
          // Grab a larger candidate pool,
          // then rank learner-friendly entries.

          const sql = `
            SELECT
              id,
              language,
              word,
              display_word,
              pronunciation,
              part_of_speech,
              definition,
              source
            FROM entries
            WHERE language = ?
              AND lower(definition)
                  LIKE lower(?)
            LIMIT 300
          `;

          const candidates =
            db.prepare(sql).all(
              language,
              `%${query}%`
            );

          const q =
            query.toLocaleLowerCase();

          const scoreResult = result => {

            const definition =
              String(
                result.definition || ""
              );

            const d =
              definition
                .toLocaleLowerCase();

            const senses =
              definition
                .split("|")
                .map(
                  x =>
                    x.trim()
                     .toLocaleLowerCase()
                );

            let score = 0;

            // Exact English gloss
            if (
              senses.includes(q)
            ) {
              score -= 100;
            }

            // Gloss starts with query
            else if (
              senses.some(
                x =>
                  x.startsWith(
                    q + " "
                  )
              )
            ) {
              score -= 60;
            }

            // Other definition match
            else if (
              d.includes(q)
            ) {
              score -= 20;
            }

            // Penalize obscure/specialized entries
            if (
              d.includes("(old)")
            ) {
              score += 60;
            }

            if (
              d.includes("(literary)")
            ) {
              score += 45;
            }

            if (
              d.includes("variant of")
            ) {
              score += 45;
            }

            if (
              d.includes("surname")
            ) {
              score += 35;
            }

            if (
              d.includes("given name") ||
              d.includes("feminine name")
            ) {
              score += 35;
            }

            const wordLength =
              [...String(result.word)]
                .length;

            // Favor ordinary two-character
            // learner vocabulary.
            if (wordLength === 2) {
              score -= 10;
            }

            if (wordLength === 3) {
              score -= 4;
            }

            if (wordLength === 1) {
              score += 12;
            }

            return score;
          };

          results =
            candidates
              .sort(
                (a, b) =>
                  scoreResult(a) -
                    scoreResult(b) ||
                  String(a.word)
                    .localeCompare(
                      String(b.word),
                      "zh"
                    )
              )
              .slice(
                0,
                limit
              );
        }

      } else {

        // General SMART search
        // for English / All languages.
        //
        // Priority:
        // 1. exact spelling
        // 2. English base form / lemma
        // 3. prefix / pronunciation / definition

        const exactSql = `
          SELECT
            id,
            language,
            word,
            display_word,
            pronunciation,
            part_of_speech,
            definition,
            source
          FROM entries
          WHERE language = 'en'
            AND lower(word) = lower(?)
          ORDER BY
            length(word),
            word
          LIMIT ?
        `;

        const exactEnglish =
          db.prepare(exactSql).all(
            query,
            limit
          );

        const expressionEntry =
          getLearnerExpressionEntry(
            query
          );

        if (expressionEntry) {
          results = [
            expressionEntry
          ];

        } else if (
          exactEnglish.length > 0
        ) {
          results =
            exactEnglish;

        } else {

          const learnerEntry =
            getLearnerGlossaryEntry(
              query
            );

          if (
            learnerEntry
          ) {
            results = [
              learnerEntry
            ];

          } else {

          const lemmaCandidates =
            getEnglishLemmaCandidates(
              query
            );

          let lemmaResults = [];

          if (
            lemmaCandidates.length > 0
          ) {
            const placeholders =
              lemmaCandidates
                .map(() => "?")
                .join(",");

            const lemmaSql = `
              SELECT
                id,
                language,
                word,
                display_word,
                pronunciation,
                part_of_speech,
                definition,
                source
              FROM entries
              WHERE language = 'en'
                AND lower(word) IN (
                  ${placeholders}
                )
              ORDER BY
                CASE lower(word)
                  ${lemmaCandidates
                    .map(
                      (_, index) =>
                        `WHEN lower(?) THEN ${index}`
                    )
                    .join("\n")}
                  ELSE 999
                END,
                length(word),
                word
              LIMIT ?
            `;

            lemmaResults =
              db.prepare(
                lemmaSql
              ).all(
                ...lemmaCandidates,
                ...lemmaCandidates,
                limit
              );


            const preferredPos =
              getEnglishPreferredPos(
                query
              );

            if (preferredPos) {
              lemmaResults.sort(
                (a, b) => {

                  const aPos =
                    String(
                      a.part_of_speech ||
                      ""
                    )
                      .trim()
                      .toLocaleLowerCase();

                  const bPos =
                    String(
                      b.part_of_speech ||
                      ""
                    )
                      .trim()
                      .toLocaleLowerCase();

                  const aScore =
                    aPos === preferredPos
                      ? 0
                      : 1;

                  const bScore =
                    bPos === preferredPos
                      ? 0
                      : 1;

                  if (
                    aScore !== bScore
                  ) {
                    return (
                      aScore -
                      bScore
                    );
                  }

                  const aWord =
                    String(
                      a.word || ""
                    );

                  const bWord =
                    String(
                      b.word || ""
                    );

                  return (
                    aWord.length -
                      bWord.length ||
                    aWord.localeCompare(
                      bWord
                    )
                  );
                }
              );
            }
          }

          if (
            lemmaResults.length > 0
          ) {
            results =
              lemmaResults;

          } else {

            const sql = `
              SELECT
                id,
                language,
                word,
                display_word,
                pronunciation,
                part_of_speech,
                definition,
                source
              FROM entries
              WHERE
                (
                  word = ?
                  OR word LIKE ?
                  OR pronunciation LIKE ?
                  OR definition LIKE ?
                )
                ${languageSql}
              ORDER BY
                CASE
                  WHEN lower(word)
                    = lower(?)
                  THEN 0

                  WHEN lower(definition)
                    = lower(?)
                  THEN 1

                  WHEN lower(word)
                    LIKE lower(?)
                  THEN 2

                  ELSE 3
                END,
                length(word),
                word
              LIMIT ?
            `;

            const params = [
              query,
              `${query}%`,
              `%${query}%`,
              `%${query}%`
            ];

            if (
              language !== "all"
            ) {
              params.push(
                language
              );
            }

            params.push(
              query,
              query,
              `${query}%`,
              limit
            );

            results =
              db.prepare(sql)
                .all(...params);
          }
        }
        }      }
    }

    const exampleStatement =
      db.prepare(`
        SELECT
          sentence,
          translation_language,
          translation,
          source
        FROM examples
        WHERE entry_id = ?
        ORDER BY id
        LIMIT 3
      `);

    const bilingualEnglishStatement =
      db.prepare(`
        SELECT
          chinese_sentence,
          english_sentence,
          source
        FROM bilingual_examples
        WHERE lower(english_sentence)
              LIKE lower(?)
        ORDER BY id
        LIMIT 5
      `);

    const bilingualChineseStatement =
      db.prepare(`
        SELECT
          chinese_sentence,
          english_sentence,
          source
        FROM bilingual_examples
        WHERE chinese_sentence
              LIKE ?
        ORDER BY id
        LIMIT 5
      `);

    results =
      results.map(result => {

        let bilingualExamples = [];

        if (
          result.language === "en"
        ) {
          bilingualExamples =
            bilingualEnglishStatement.all(
              `%${result.word}%`
            );
        }

        else if (
          result.language === "zh-Hans" ||
          result.language === "zh-Hant"
        ) {
          const chineseWord =
            String(
              result.word || ""
            );

          const chineseLength =
            [...chineseWord].length;

          // A single Han character can occur
          // inside unrelated words such as
          // 丽 in 玛丽. Until Logos has Chinese
          // word segmentation, only attach
          // automatic Tatoeba examples to
          // multi-character headwords.
          if (
            chineseLength >= 2
          ) {
            bilingualExamples =
              bilingualChineseStatement.all(
                `%${chineseWord}%`
              );
          }
        }

        return {
          ...result,
          examples:
            exampleStatement.all(
              result.id
            ),
          bilingualExamples
        };
      });

    db.close();

    process.stdout.write(
      JSON.stringify({
        success: true,
        results
      })
    );

  } catch (error) {
    process.stderr.write(
      error && error.stack
        ? error.stack
        : String(error)
    );

    process.exit(1);
  }
});
