import sqlite3
from pathlib import Path

WORDNET_DIR = Path(
    "dictionaries/wordnet/WordNet-3.0/dict"
)

TARGET_DB = Path(
    "dictionaries/core/logos-dictionary.sqlite3"
)

FILES = {
    "noun": WORDNET_DIR / "data.noun",
    "verb": WORDNET_DIR / "data.verb",
    "adjective": WORDNET_DIR / "data.adj",
    "adverb": WORDNET_DIR / "data.adv",
}

for path in FILES.values():
    if not path.exists():
        raise SystemExit(f"Missing WordNet file: {path}")

if not TARGET_DB.exists():
    raise SystemExit(f"Missing Logos database: {TARGET_DB}")


def parse_gloss(gloss: str):
    parts = [
        part.strip()
        for part in gloss.split(";")
        if part.strip()
    ]

    definitions = []
    examples = []

    for part in parts:
        if part.startswith('"') and part.endswith('"'):
            examples.append(part.strip('"'))
        else:
            definitions.append(part)

    definition = "; ".join(definitions)

    return definition, examples


db = sqlite3.connect(TARGET_DB)
cur = db.cursor()

print("Removing previous WordNet entries...")

cur.execute(
    """
    DELETE FROM examples
    WHERE source = 'WordNet 3.0'
    """
)

cur.execute(
    """
    DELETE FROM entries
    WHERE source = 'WordNet 3.0'
    """
)

db.commit()

entry_count = 0
example_count = 0

for pos_name, file_path in FILES.items():

    print(f"Reading {file_path.name}...")

    with file_path.open(
        "r",
        encoding="utf-8",
        errors="replace"
    ) as f:

        for line in f:

            if not line:
                continue

            # WordNet header/license lines
            if line.startswith("  "):
                continue

            if "|" not in line:
                continue

            left, gloss = line.split("|", 1)

            fields = left.split()

            if len(fields) < 5:
                continue

            try:
                word_count = int(fields[3], 16)
            except ValueError:
                continue

            words = []
            index = 4

            for _ in range(word_count):

                if index + 1 >= len(fields):
                    break

                word = fields[index]

                # Skip lex_id
                index += 2

                word = word.replace("_", " ")

                words.append(word)

            if not words:
                continue

            definition, examples = parse_gloss(
                gloss.strip()
            )

            if not definition:
                continue

            for word in words:

                cursor = cur.execute(
                    """
                    INSERT INTO entries
                    (
                        language,
                        word,
                        display_word,
                        pronunciation,
                        part_of_speech,
                        definition,
                        source
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        "en",
                        word,
                        word,
                        None,
                        pos_name,
                        definition,
                        "WordNet 3.0"
                    )
                )

                entry_id = cursor.lastrowid

                entry_count += 1

                for example in examples:
                    cur.execute(
                        """
                        INSERT INTO examples
                        (
                            entry_id,
                            language,
                            sentence,
                            translation_language,
                            translation,
                            source
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (
                            entry_id,
                            "en",
                            example,
                            None,
                            None,
                            "WordNet 3.0"
                        )
                    )

                    example_count += 1

            if entry_count and entry_count % 10000 == 0:
                db.commit()
                print(
                    f"  Imported {entry_count} entries..."
                )

db.commit()

print("Rebuilding full-text search index...")

cur.execute(
    """
    DROP TABLE IF EXISTS entries_fts
    """
)

cur.execute(
    """
    CREATE VIRTUAL TABLE entries_fts
    USING fts5(
        word,
        display_word,
        pronunciation,
        definition,
        language,
        source,
        content='entries',
        content_rowid='id'
    )
    """
)

cur.execute(
    """
    INSERT INTO entries_fts(
        rowid,
        word,
        display_word,
        pronunciation,
        definition,
        language,
        source
    )
    SELECT
        id,
        word,
        display_word,
        pronunciation,
        definition,
        language,
        source
    FROM entries
    """
)

db.commit()

english_count = cur.execute(
    """
    SELECT COUNT(*)
    FROM entries
    WHERE language = 'en'
    """
).fetchone()[0]

total_count = cur.execute(
    """
    SELECT COUNT(*)
    FROM entries
    """
).fetchone()[0]

db.close()

print()
print("Finished.")
print("WordNet entries imported:", entry_count)
print("WordNet examples imported:", example_count)
print("English entries in Logos:", english_count)
print("Total dictionary entries:", total_count)
