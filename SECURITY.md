# Security Policy

## Supported versions

Logos is currently in early development.

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |

## Reporting a security issue

Please do **not** post sensitive security vulnerabilities, private data, tokens, or exploit details in a public GitHub Issue.

Instead, contact the maintainers privately through an appropriate private contact method listed on the GitHub profile or repository.

When reporting a security issue, include:

- Logos version
- Operating system
- Obsidian version
- A clear description of the problem
- Steps to reproduce
- Potential impact
- Whether private note data or local files are affected

## Local data

Logos is designed as a local-first plugin, but it operates inside Obsidian and can access text that the user chooses to process.

Users should only install Logos releases obtained from the official project repository or another source they trust.

## Installer verification

Release assets may include SHA-256 checksums.

Users who need stronger verification should compare downloaded files against the published checksums before installation.

## Dependency security

Logos bundles third-party runtimes, native libraries, models, and JavaScript packages.

Security reports involving those components are welcome. Some vulnerabilities may need to be fixed upstream before Logos can ship a new bundled version.

## Responsible disclosure

Please allow reasonable time for investigation and release preparation before publicly disclosing a confirmed vulnerability.
