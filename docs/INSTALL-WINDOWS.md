# Installing Logos on Windows

## What you need

Download all three Windows installer files from the Logos GitHub Release:

- `Install Logos.exe`
- `Install Logos-1.bin`
- `Install Logos-2.bin`

Keep all three files together in the same folder.

## Installation

1. Close Obsidian if it is running.
2. If an older version of Logos is installed:
   - Open Obsidian
   - Go to **Settings → Community plugins**
   - Find **Logos**
   - Choose **Uninstall**
   - Close Obsidian
3. Double-click `Install Logos.exe`.
4. If Windows displays a SmartScreen warning:
   - Choose **More info**
   - Choose **Run anyway**
5. When the installer asks for your Obsidian vault, select the main folder containing your notes.
6. Do not select the `.obsidian` folder itself.
7. Complete the installation.
8. Open Obsidian.
9. Go to **Settings → Community plugins**.
10. Enable **Logos**.

## Important

You do not need to install:

- Node.js
- npm
- Python
- sherpa-onnx
- a paid text-to-speech API

Logos includes its own local runtime and speech models.

## Updating

For a clean update:

1. Uninstall Logos from **Settings → Community plugins**
2. Close Obsidian
3. Run the new `Install Logos.exe`
4. Reopen Obsidian
5. Enable Logos
