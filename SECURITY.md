# Security Policy

## Supported Versions

Security updates are provided for the latest code on the `main` branch.

## Reporting a Vulnerability

Please do not report security vulnerabilities in public GitHub issues.

Use one of these private channels:

1. GitHub private vulnerability reporting (preferred):
   - Open the repository on GitHub.
   - Go to the `Security` tab.
   - Select `Report a vulnerability`.
2. If private reporting is unavailable, contact the maintainers directly.

## What to Include

Please include as much detail as possible:

- A clear description of the issue
- Affected endpoints/files/components
- Steps to reproduce
- Proof of concept (if available)
- Potential impact
- Suggested remediation (optional)

## Disclosure Process

- We will acknowledge receipt as soon as possible.
- We will investigate and validate the report.
- We will coordinate a fix and release.
- We will share disclosure timing with the reporter when possible.

## Scope Guidance

For Vekt, security-sensitive areas include:

- Authentication and authorization
- Role checks for admin/recruiter routes
- File upload and file-serving endpoints
- Candidate data handling and retention
- Input validation and API access controls
