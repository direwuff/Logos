import re
import sqlite3
from pathlib import Path

SOURCE = Path("dictionaries/cedict/cedict_ts.u8")
DB = Path("dictionaries/cedict/cedict.sqlite3")

if not SOURCE.exists():
    raise SystemExit(f"Missing dictionary: {SOURCE}")

if DB.exists():
    DB.unlink()

conn = sqlite3.connect(DB)
cur = conn.cursor()

cur.executescript("""
CREATE TABLE entries (
    id INTEGER PRIMARY KEY,
    traditional TEXT NOT NULL,
    simplified TEXT NOT NULL,
    pinyin TEXT NOT NULL,
    definitions TEXT NOT NULL
);

CREATE INDEX idx_traditional
ON entries(traditional);

CREATE INDEX idx_simplified
ON entries(simplified);

CREATE INDEX idx_pinyin
ON entries(pinyin);
""")

pattern = re.compile(
    r"^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+/(.+)/$"
)

rows = []
count = 0
skipped = 0

with SOURCE.open(
    "r",
    encoding="utf-8",
    errors="replace"
) as f:

    for line in f:
        line = line.strip()

        if not line or line.startswith("#"):
            continue

        match = pattern.match(line)

        if not match:
            skipped += 1
            continue

        traditional = match.group(1)
        simplified = match.group(2)
        pinyin = match.group(3)

        definitions = match.group(4)
        definitions = definitions.replace(
            "/",
            " | "
        )

        rows.append(
            (
                traditional,
                simplified,
                pinyin,
                definitions
            )
        )

        if len(rows) >= 5000:
            cur.executemany(
                """
                INSERT INTO entries
                (
                    traditional,
                    simplified,
                    pinyin,
                    definitions
                )
                VALUES (?, ?, ?, ?)
                """,
                rows
            )

            count += len(rows)
            rows.clear()

if rows:
    cur.executemany(
        """
        INSERT INTO entries
        (
            traditional,
            simplified,
            pinyin,
            definitions
        )
        VALUES (?, ?, ?, ?)
        """,
        rows
    )

    count += len(rows)

conn.commit()

# Full-text search table
cur.execute("""
CREATE VIRTUAL TABLE entries_fts
USING fts5(
    traditional,
    simplified,
    pinyin,
    definitions,
    content='entries',
    content_rowid='id'
)
""")

cur.execute("""
INSERT INTO entries_fts(
    rowid,
    traditional,
    simplified,
    pinyin,
    definitions
)
SELECT
    id,
    traditional,
    simplified,
    pinyin,
    definitions
FROM entries
""")

conn.commit()

print(f"Built: {DB}")
print(f"Entries: {count}")
print(f"Skipped lines: {skipped}")

conn.close()
