import sqlite3
from pathlib import Path

DB = Path("dictionaries/core/logos-dictionary.sqlite3")

if DB.exists():
    DB.unlink()

db = sqlite3.connect(DB)
cur = db.cursor()

cur.executescript("""
CREATE TABLE entries (
    id INTEGER PRIMARY KEY,
    language TEXT NOT NULL,
    word TEXT NOT NULL,
    display_word TEXT,
    pronunciation TEXT,
    part_of_speech TEXT,
    definition TEXT NOT NULL,
    source TEXT NOT NULL
);

CREATE INDEX idx_entries_language
ON entries(language);

CREATE INDEX idx_entries_word
ON entries(word);

CREATE INDEX idx_entries_language_word
ON entries(language, word);


CREATE TABLE translations (
    id INTEGER PRIMARY KEY,
    entry_id INTEGER NOT NULL,
    target_language TEXT NOT NULL,
    translation TEXT NOT NULL,
    source TEXT NOT NULL,
    FOREIGN KEY(entry_id) REFERENCES entries(id)
);

CREATE INDEX idx_translations_entry
ON translations(entry_id);

CREATE INDEX idx_translations_language
ON translations(target_language);


CREATE TABLE examples (
    id INTEGER PRIMARY KEY,
    language TEXT NOT NULL,
    sentence TEXT NOT NULL,
    translation_language TEXT,
    translation TEXT,
    source TEXT NOT NULL
);

CREATE INDEX idx_examples_language
ON examples(language);


CREATE TABLE sources (
    id INTEGER PRIMARY KEY,
    source_name TEXT NOT NULL UNIQUE,
    license TEXT,
    homepage TEXT
);
""")

cur.executemany(
    """
    INSERT INTO sources
    (
        source_name,
        license,
        homepage
    )
    VALUES (?, ?, ?)
    """,
    [
        (
            "CC-CEDICT",
            "CC BY-SA 4.0",
            "https://www.mdbg.net/chinese/dictionary?page=cc-cedict"
        ),
        (
            "Wiktionary",
            "CC BY-SA / GFDL",
            "https://www.wiktionary.org/"
        ),
        (
            "Tatoeba",
            "Creative Commons",
            "https://tatoeba.org/"
        )
    ]
)

db.commit()
db.close()

print(f"Built universal dictionary database: {DB}")
