import json
import re
from pathlib import Path

INFO_FILE = Path("speaker-info.txt")

FILELISTS = [
    Path("vctk-train.txt"),
    Path("vctk-val.txt"),
    Path("vctk-test.txt"),
]

if not INFO_FILE.exists():
    raise SystemExit("ERROR: speaker-info.txt not found.")

for filelist in FILELISTS:
    if not filelist.exists():
        raise SystemExit(f"ERROR: {filelist} not found.")


# ---------------------------------------------------------
# Read official VCTK speaker metadata
# ---------------------------------------------------------

metadata = {}

lines = INFO_FILE.read_text(
    encoding="utf-8",
    errors="replace"
).splitlines()

for line in lines[1:]:
    line = line.strip()

    if not line:
        continue

    fields = line.split()

    if len(fields) < 4:
        continue

    speaker_id = fields[0]
    age = int(fields[1])
    gender_code = fields[2]
    accent = fields[3]

    region = (
        " ".join(fields[4:])
        if len(fields) > 4
        else ""
    )

    gender = {
        "M": "Male",
        "F": "Female"
    }.get(
        gender_code,
        gender_code
    )

    metadata[speaker_id] = {
        "id": speaker_id,
        "age": age,
        "gender": gender,
        "accent": accent,
        "region": region
    }


# ---------------------------------------------------------
# Recover the actual VITS sid -> pXXX mapping
# ---------------------------------------------------------

sid_to_speaker = {}
speaker_to_sid = {}

pattern = re.compile(
    r"(p\d+)[/\\][^|]+\|(\d+)\|"
)

for filelist in FILELISTS:

    for line in filelist.read_text(
        encoding="utf-8",
        errors="replace"
    ).splitlines():

        match = pattern.search(line)

        if not match:
            continue

        speaker = match.group(1)
        sid = int(match.group(2))

        # Verify one SID never maps to two speakers
        previous_speaker = (
            sid_to_speaker.get(sid)
        )

        if (
            previous_speaker is not None
            and previous_speaker != speaker
        ):
            raise ValueError(
                f"SID {sid} maps to both "
                f"{previous_speaker} and {speaker}"
            )

        # Verify one speaker never maps to two SIDs
        previous_sid = (
            speaker_to_sid.get(speaker)
        )

        if (
            previous_sid is not None
            and previous_sid != sid
        ):
            raise ValueError(
                f"{speaker} maps to both "
                f"SID {previous_sid} and {sid}"
            )

        sid_to_speaker[sid] = speaker
        speaker_to_sid[speaker] = sid


# ---------------------------------------------------------
# Validation
# ---------------------------------------------------------

print(
    f"Model speakers discovered: "
    f"{len(sid_to_speaker)}"
)

if len(sid_to_speaker) != 108:
    raise ValueError(
        "Expected 108 verified speakers "
        "from the public VITS filelists, "
        f"found {len(sid_to_speaker)}."
    )

expected_verified_sids = set(range(108))
actual_sids = set(sid_to_speaker)

missing_sids = (
    expected_verified_sids - actual_sids
)

extra_sids = (
    actual_sids - expected_verified_sids
)

if missing_sids:
    raise ValueError(
        f"Missing SIDs: {sorted(missing_sids)}"
    )

if extra_sids:
    raise ValueError(
        f"Unexpected SIDs: {sorted(extra_sids)}"
    )


# ---------------------------------------------------------
# Merge model mapping + corpus metadata
# ---------------------------------------------------------

output = []

# 108 speaker identities verified from the
# original VITS filelists.
for sid in range(108):

    speaker_id = sid_to_speaker[sid]

    if speaker_id not in metadata:
        raise ValueError(
            f"No metadata found for "
            f"{speaker_id}"
        )

    output.append({
        "sid": sid,
        **metadata[speaker_id]
    })

# VITS/Sherpa expose SID 108, but the public
# VITS filelists do not identify it with a
# VCTK pXXX speaker. Do not guess its identity.
output.append({
    "sid": 108,
    "id": "sid108",
    "age": None,
    "gender": "Unknown",
    "accent": "Unmapped",
    "region": "Model speaker not identified in public VITS filelists"
})


# ---------------------------------------------------------
# Write Logos metadata
# ---------------------------------------------------------

with open(
    "vctk-speakers.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        output,
        f,
        indent=2,
        ensure_ascii=False
    )


print(
    "Wrote vctk-speakers.json "
    f"with {len(output)} model voices."
)

print()
print("First 10 mappings:")

for speaker in output[:10]:
    print(
        f'  sid {speaker["sid"]:3d} '
        f'-> {speaker["id"]} '
        f'| {speaker["gender"]} '
        f'| {speaker["accent"]} '
        f'| {speaker["region"]}'
    )

print()
print("Last mapping:")

speaker = output[-1]

print(
    f'  sid {speaker["sid"]:3d} '
    f'-> {speaker["id"]} '
    f'| {speaker["gender"]} '
    f'| {speaker["accent"]} '
    f'| {speaker["region"]}'
)
