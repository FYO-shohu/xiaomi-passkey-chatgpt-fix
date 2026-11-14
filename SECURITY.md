# Security Policy

## Scope

This project is a local adb and Chrome DevTools Protocol helper. It does not run a server and does not send data to third parties.

The injection only changes WebAuthn allowCredentials transports on auth.openai.com to internal. It does not read or store passwords, passkeys, challenges, cookies, or biometric data.

## Reporting

Please report security issues through GitHub Security Advisories for this repository, or open a minimal issue without secrets.

Do not include:

- auth.openai.com login URLs with tokens or state
- credential IDs
- passwords or recovery codes
- full device logs containing personal data

## Operational safety

- Only use this tool on a device you own.
- Keep USB debugging disabled when not needed.
- Remove adb port forwarding when finished:

~~~powershell
adb forward --remove tcp:9222
~~~

- Do not install untrusted forks or modified APKs claiming to fix this issue.
