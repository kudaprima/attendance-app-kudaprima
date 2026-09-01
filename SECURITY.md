# Security Policy

## Supported Code

The application is pre-release. Only the latest `main` branch and the current development environment are supported.

## Reporting a Vulnerability

Report suspected vulnerabilities privately to a PT Kuda Prima organization owner or repository maintainer. Do not open a public issue and do not include real employee data, attendance photos, credentials, tokens, private keys, or service-account files in a report.

Include the affected component, observed behavior, reproduction steps using synthetic data, potential impact, and any known mitigation. Preserve logs only when they have been checked for personal data and secrets.

## Credential Exposure

If a credential is committed or shared:

1. Stop further pushes and distribution.
2. Revoke or rotate the credential at its provider.
3. Notify the organization owner privately.
4. Assess repository history and downstream logs before resuming work.

Deleting the file or adding it to `.gitignore` does not revoke an exposed credential. Firebase deployment, billing changes, production-resource changes, mobile signing, and store publication require explicit authorization.
