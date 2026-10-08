import sqlite3
import csv
from pathlib import Path

BASE = Path("dictionaries/tatoeba")

ENG_FILE = BASE / "eng_sentences.tsv"
CMN_FILE = BASE / "cmn_sentences.tsv"
LINK_FILE = BASE / "cmn-eng_links.tsv"

DB_FILE = Path(
    "dictionaries/core/logos-dictionary.sqlite3"
)

for path in [
    ENG_FILE,
    CMN_FILE,
    LINK_FILE,
    DB_FILE,
]:
    if not path.exists():
        raise SystemExit(
            f"Missing required file: {path}"
        )

print("Reading Mandarin-English links...")

pairs = []
cmn_ids = set()
eng_ids = set()

with LINK_FILE.open(
    "r",
    encoding="utf-8",
    errors="replace"
) as f:

    reader = csv.reader(
        f,
        delimiter="\t"
    )

    for row in reader:
        if len(row) < 2:
            continue

        try:
            cmn_id = int(row[0])
            eng_id = int(row[1])
        except ValueError:
            continue

        pairs.append(
            (cmn_id, eng_id)
        )

        cmn_ids.add(cmn_id)
        eng_ids.add(eng_id)

print(
    "Translation links:",
    len(pairs)
)

print(
    "Mandarin sentences needed:",
    len(cmn_ids)
)

print(
    "English sentences needed:",
    len(eng_ids)
)


def load_sentences(
    path,
    wanted_ids
):
    sentences = {}

    with path.open(
        "r",
        encoding="utf-8",
        errors="replace"
    ) as f:

        reader = csv.reader(
            f,
            delimiter="\t"
        )

        for row in reader:
            if len(row) < 3:
                continue

            try:
                sentence_id = int(
                    row[0]
                )
            except ValueError:
                continue

            if sentence_id not in wanted_ids:
                continue

            # A sentence itself can theoretically
            # contain tabs, so join everything
            # after the language column.
            sentence = "\t".join(
                row[2:]
            ).strip()

            if sentence:
                sentences[
                    sentence_id
                ] = sentence

    return sentences


print("Loading linked Mandarin sentences...")

cmn_sentences = load_sentences(
    CMN_FILE,
    cmn_ids
)

print(
    "Loaded Mandarin:",
    len(cmn_sentences)
)

print("Loading linked English sentences...")

eng_sentences = load_sentences(
    ENG_FILE,
    eng_ids
)

print(
    "Loaded English:",
    len(eng_sentences)
)

db = sqlite3.connect(DB_FILE)
cur = db.cursor()

cur.executescript(
    """
    CREATE TABLE IF NOT EXISTS
    bilingual_examples (
        id INTEGER PRIMARY KEY,

        chinese_sentence_id INTEGER NOT NULL,
        chinese_sentence TEXT NOT NULL,

        english_sentence_id INTEGER NOT NULL,
        english_sentence TEXT NOT NULL,

        source TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_bilingual_pair
    ON bilingual_examples(
        chinese_sentence_id,
        english_sentence_id
    );

    CREATE INDEX IF NOT EXISTS
    idx_bilingual_chinese_id
    ON bilingual_examples(
        chinese_sentence_id
    );

    CREATE INDEX IF NOT EXISTS
    idx_bilingual_english_id
    ON bilingual_examples(
        english_sentence_id
    );
    """
)

print(
    "Removing previous Tatoeba import..."
)

cur.execute(
    """
    DELETE FROM bilingual_examples
    WHERE source = 'Tatoeba'
    """
)

inserted = 0
skipped = 0
batch = []

for cmn_id, eng_id in pairs:

    chinese = cmn_sentences.get(
        cmn_id
    )

    english = eng_sentences.get(
        eng_id
    )

    if not chinese or not english:
        skipped += 1
        continue

    batch.append(
        (
            cmn_id,
            chinese,
            eng_id,
            english,
            "Tatoeba"
        )
    )

    if len(batch) >= 5000:

        cur.executemany(
            """
            INSERT OR IGNORE INTO
            bilingual_examples
            (
                chinese_sentence_id,
                chinese_sentence,
                english_sentence_id,
                english_sentence,
                source
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            batch
        )

        inserted += len(batch)
        batch.clear()

        db.commit()

        print(
            f"  Processed {inserted} pairs..."
        )

if batch:

    cur.executemany(
        """
        INSERT OR IGNORE INTO
        bilingual_examples
        (
            chinese_sentence_id,
            chinese_sentence,
            english_sentence_id,
            english_sentence,
            source
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        batch
    )

    inserted += len(batch)

db.commit()

actual_count = cur.execute(
    """
    SELECT COUNT(*)
    FROM bilingual_examples
    WHERE source = 'Tatoeba'
    """
).fetchone()[0]

db.close()

print()
print("Finished.")
print(
    "Pairs processed:",
    inserted
)
print(
    "Pairs skipped:",
    skipped
)
print(
    "Tatoeba pairs in Logos:",
    actual_count
)
