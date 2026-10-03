# Security policy

## Which versions get fixes

There are no releases yet. Only the latest commit on `development` is fixed; once a release exists,
the most recent release on `production` is fixed as well.

## What counts as a vulnerability

This repository holds design tokens, SVG and PNG assets and the scripts that build them. The
realistic risks are:

- The build, generator and check scripts in `tool/` and `bin/hooks/`, and the CI workflows in
  `.github/`: for example a way to make them run a command, write outside the directories they are
  meant to touch, or leak a token.
- A secret, credential, personal data or private identifier that has been committed to this
  repository.
- A dependency in `package-lock.json` or `tool/requirements.txt` with a known vulnerability that is
  reachable from the build.

## How to report a vulnerability

Report it privately through GitHub's private vulnerability reporting:

**https://github.com/groundwork-md/groundwork_branding/security/advisories/new**

(or the "Report a vulnerability" button on the repository's Security tab).

Please do not describe a suspected vulnerability in a public issue, pull request, discussion or
social-media post until a fix is available and a disclosure date has been agreed.

A report is easiest to act on when it says:

- which file, script or workflow is affected;
- what an attacker could do with it and who would be harmed;
- the steps to reproduce it, or a minimal proof of concept;
- a fix or mitigation, if you have one in mind.

Please leave secrets, credentials and other people's personal data out of the report.

## What happens next

groundwork is maintained in spare time, so there is no fixed response time. Every report is read and
acknowledged as soon as possible, then confirmed, scoped, fixed and disclosed on a date agreed with
the reporter. Reporters are credited in the fix unless they prefer not to be.

## Testing in good faith

Research that stays within the following limits will not be treated as hostile: use only systems,
accounts and data you own, do not read, change or delete anyone else's data, and do not degrade a
service for other people. If a test could affect other people or systems, stop and send a private
report first.
