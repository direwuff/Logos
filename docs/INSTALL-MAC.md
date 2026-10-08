# Installing Logos on macOS

## What you need

Download both Mac files from the Logos GitHub Release:

- `Logos-Mac-Easy-Install-Part-1.zip`
- `Logos-Mac-Easy-Install-Part-2.zip`

Keep both ZIP files in the same location.

## Installation

1. Close Obsidian if it is running.
2. If an older version of Logos is installed:
   - Open Obsidian
   - Go to **Settings → Community plugins**
   - Find **Logos**
   - Choose **Uninstall**
   - Close Obsidian
3. Double-click both ZIP files to extract them.
4. Confirm you now have:
   - `Logos Mac Installer`
   - `Logos Mac Models Part 2`
5. Open `Logos Mac Installer`.
6. Double-click `Install Logos.command`.

## If macOS blocks the installer

If macOS says the installer is from an unidentified developer:

1. Control-click `Install Logos.command`
2. Choose **Open**
3. Choose **Open** again

You do not need to disable Gatekeeper globally.

## Choose your vault

When the folder picker appears:

1. Choose your main Obsidian vault folder
2. Choose the folder containing your notes
3. Do not choose `.obsidian`

After installation:

1. Open Obsidian
2. Go to **Settings → Community plugins**
3. Enable **Logos**

## Important

Logos automatically contains runtime support for:

- Apple Silicon Macs
- Intel Macs

Users do not need to install Node.js, npm, Python, or sherpa-onnx separately.
