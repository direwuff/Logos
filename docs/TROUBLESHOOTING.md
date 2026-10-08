# Logos Troubleshooting

## Logos does not appear in Obsidian

1. Confirm you installed Logos into the correct vault.
2. Open **Settings → Community plugins**.
3. Make sure Community plugins are enabled.
4. Find **Logos** and turn it on.
5. Restart Obsidian if necessary.

## Windows says an installer file is missing

The following files must remain together:

- `Install Logos.exe`
- `Install Logos-1.bin`
- `Install Logos-2.bin`

Do not rename or separate the `.bin` files.

## Windows SmartScreen warning

The current installer may be unsigned.

If you downloaded Logos from the official project release page:

1. Choose **More info**
2. Choose **Run anyway**

Future releases may use code signing.

## macOS says the developer cannot be verified

1. Control-click `Install Logos.command`
2. Choose **Open**
3. Choose **Open** again

Do not disable macOS security globally.

## Speech does not start immediately

The first use of a voice model may take longer because Logos has to load the model.

Switching between English and multilingual models can also require a model reload.

## Chinese speech does not work

Make sure the complete Logos installation is present.

Chinese text normally routes automatically to a multilingual speech model.

## PDF text will not read

Logos can directly read selectable PDF text.

A scanned PDF containing only images may not contain a usable text layer.

If you cannot select the text with your mouse, Logos may not be able to read it directly.

## Dictionary lookup does not find an expression

Logos supports:

- single words
- English word forms and lemmas
- idioms
- phrasal verbs
- abbreviations
- conversational expressions

Not every possible expression is currently included.

## Flashcard review

Available review choices include:

- Again · 10m
- Good · 1d+
- Easy · 3d+

Cards can also be filtered by:

- Due
- All
- Learning
- Known

## Reinstalling Logos

For a completely clean reinstall:

1. Uninstall Logos from Obsidian Community plugins
2. Close Obsidian
3. Install the new version
4. Reopen Obsidian
5. Enable Logos again

## Reporting a bug

Please include:

- Operating system
- Obsidian version
- Logos version
- Exact error message
- Steps that caused the problem
- Screenshot if helpful

Do not upload private notes, passwords, API keys, or sensitive documents.
