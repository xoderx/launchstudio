# Security

LaunchStudio staging is separate from the live Pickaxe portal. Verify the target project and test two independent customer accounts before publishing an authenticated integration. Keep database and Pickaxe credentials in server-side secrets. Never commit .env files, private exports, customer records, or keys.

Derive the customer identity from a verified session, authorize the requested project on the server, and keep row-level policies enabled. Do not send session credentials to agents. Redact authentication headers and customer data from logs.

Report suspected vulnerabilities privately to the repository owner. Avoid posting reproduction details or customer information in a public issue.
