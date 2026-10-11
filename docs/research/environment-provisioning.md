# Research environment provisioning evidence

Dedicated checkout: `/workspace/open-box-finder`. Existing public source: `https://github.com/peterkrasniy/open-box-finder`. No other project checkout has been edited.

## Source helper gap

The cloud Sites skill is available and was read. Its source is `skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md`. It states: “For hosted work, package with the source helper.” New server projects use its supplied Vinext starter. The helper scripts and starter are not installed locally in this selected environment.

Searched `/workspace`, `/opt`, and `/usr/local/share` for `site-workflow.mjs`, `project-setup.mjs`, and `set-project-id.mjs`. Separately searched `/opt/codex/marketplaces`, `/opt/codex/plugins`, and `/opt/codex/skills` for skill/project guidance and Sites helpers. The bundled marketplace has the unified-computer-use plugin; the runtime plugin directory has the primary-runtime plugin. Neither is the Sites helper package. Reading the helper's cloud script resource also returned unavailable. `SITES_MANAGED_LINUX_CONTAINER` is not set to 1.

Native Sites tools are callable. This confirms tool availability only, not local-helper provisioning, Site identity, source preparation, packaging or deployment. No Site has been registered, no write credential created, and no hosting archive built.

Parent reports an installed official helper package in its cloud workspace and can choose supported artifact transfer. Transfer must include the official helper's dependencies, references and supplied server starter, not merely recreate a file with the same name. Keep the bundle outside the public application source and verify its provenance/integrity before use. Never transfer parent credentials, private profiles, Site runtime data or unrelated project files.

This environment exposes native Library materialization for an identified authorized Library file and native source tools. No bundle reference has been supplied, and no Library transfer has been performed. A parent-native publication route can also be considered if it follows the same supported source workflow with the exact source authored here. Neither route is claimed complete.

## Network observations

Default read-only HTTPS requests to the documented DealNews RSS URL and official Best Buy / Appliances 4 Less Sacramento pages failed at the environment outbound CONNECT proxy. Python reported `URLError <urlopen error Tunnel connection failed: 403 Forbidden>`; curl reported `curl: (56) CONNECT tunnel failed, response 403`, with an envoy CONNECT 403 response. The origin was not reached. An escalated read-only DealNews request had the same proxy failure; there was no automatic approval rejection.

The harmless `NETWORK` routing value is `caas_neko_desktop`. No bypass, proxy replacement, retailer impersonation or security change was attempted. A failed workspace fetch is not evidence of a retailer prohibition or empty stock. Native web research can read primary cached pages, but its XML representation limitation does not establish an empty feed.

Existing shell Git transport read and push succeeded. The native GitHub `get_repo` read also succeeded and confirmed the public canonical repository. Shell `gh api` requests are proxy-blocked, so use supported existing Git transport/native GitHub tools rather than create a credential or broaden access.

## Later browser validation capability

Node v24.19.0, npm 11.9.0, `/usr/bin/chromium`, Python Playwright and a Playwright Core Node package are installed. The Browser plugin/skill is not listed in the session. The frontend-testing skill permits ordinary Playwright when Browser is absent; portable Sites preview instructions apply here. No new browser dependency is needed merely to establish browser capability.

No app browser tests have run. Chromium/mobile emulation does not constitute native Safari, iPhone Add to Home Screen, VoiceOver or cross-context storage validation. Those remain NOT RUN until actual evidence exists.
