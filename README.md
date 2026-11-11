# LaunchStudio

LaunchStudio is a business implementation platform on Pickaxe. The existing portal offers 52 core specialists across Launch, Grow, Monetize and Scale. CoVibeCoder is a separate commander. This repository contains the public page builder, catalog, and staging implementation for shared project context.

Start with [AGENTS.md](AGENTS.md), [the master specification](docs/MASTER_SPEC.md), [the decision log](docs/DECISIONS.md), and [current progress](docs/PROGRESS.md). The [conversation index](docs/CONVERSATION_IMPORTS/README.md) records the source material and its limits.

Build the public page with `cd site && node build.mjs`. Run staging verification with `cd staging && npm ci && node test.mjs`. See [staging setup](staging/README.md) before making any remote changes.

For environment variable names see [.env.example](.env.example). Keep server credentials in the staging secret manager and follow [SECURITY.md](SECURITY.md). The original handoff archive and internal connection export are stored outside this public repository.
