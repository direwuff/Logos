import sqlite3
from pathlib import Path

SOURCE_DB = Path(
    "dictionaries/cedict/cedict.sqlite3"
)

TARGET_DB = Path(
    "dictionaries/core/logos-dictionary.sqlite3"
)

if not SOURCE_DB.exists():
    raise SystemExit(
        f"Missing source database: {SOURCE_DB}"
    )

if not TARGET_DB.exists():
    raise SystemExit(
        f"Missing target database: {TARGET_DB}"
    )

source = sqlite3.connect(SOURCE_DB)
target = sqlite3.connect(TARGET_DB)

src = source.cursor()
dst = target.cursor()

# ---------------------------------------------------------
# Remove any previous CC-CEDICT import
# ---------------------------------------------------------

dst.execute(
    """
    DELETE FROM entries
    WHERE source = 'CC-CEDICT'
    """
)

target.commit()

# ---------------------------------------------------------
# Read source entries
# ---------------------------------------------------------

rows = src.execute(
    """
    SELECT
        traditional,
        simplified,
        pinyin,
        definitions
    FROM entries
    """
)

batch = []
count = 0

for (
    traditional,
    simplified,
    pinyin,
    definitions
) in rows:

    # Simplified Chinese entry
    batch.append(
        (
            "zh-Hans",
            simplified,
            simplified,
            pinyin,
            None,
            definitions,
            "CC-CEDICT"
        )
    )

    # Traditional Chinese entry
    if traditional != simplified:
        batch.append(
            (
                "zh-Hant",
                traditional,
                traditional,
                pinyin,
                None,
                definitions,
                "CC-CEDICT"
            )
        )

    if len(batch) >= 5000:
        dst.executemany(
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
            batch
        )

        count += len(batch)
        batch.clear()

if batch:
    dst.executemany(
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
        batch
    )

    count += len(batch)

target.commit()

# ---------------------------------------------------------
# Add full text search
# ---------------------------------------------------------

dst.execute(
    """
    DROP TABLE IF EXISTS entries_fts
    """
)

dst.execute(
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

dst.execute(
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

target.commit()

print(
    f"Imported {count} universal dictionary entries."
)

print(
    "Chinese source entries:",
    src.execute(
        "SELECT COUNT(*) FROM entries"
    ).fetchone()[0]
)

print(
    "Universal total entries:",
    dst.execute(
        "SELECT COUNT(*) FROM entries"
    ).fetchone()[0]
)

source.close()
target.close()
