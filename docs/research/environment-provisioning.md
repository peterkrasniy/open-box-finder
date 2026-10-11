# Research environment provisioning evidence

Dedicated checkout: `/workspace/open-box-finder`. Existing public source: `https://github.com/peterkrasniy/open-box-finder`. No other project checkout has been edited.

## Current provisioning

The supported Library text transfer resolved the helper gap on October 11 at 09:05–09:08 UTC. The verified official tooling bundle is installed outside public source, the portable starter is initialized and dependencies installed, and the exact registered Site ID is persisted. See [current status](../current-status.md). The observations below preserve the original blocker and do not describe present provisioning.

## Historical source helper gap

The cloud Sites skill is available and was read. Its source is `skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md`. It states: “For hosted work, package with the source helper.” New server projects use its supplied Vinext starter. The helper scripts and starter are not installed locally in this selected environment.

Searched `/workspace`, `/opt`, and `/usr/local/share` for `site-workflow.mjs`, `project-setup.mjs`, and `set-project-id.mjs`. Separately searched `/opt/codex/marketplaces`, `/opt/codex/plugins`, and `/opt/codex/skills` for skill/project guidance and Sites helpers. The bundled marketplace has the unified-computer-use plugin; the runtime plugin directory has the primary-runtime plugin. Neither is the Sites helper package. Reading the helper's cloud script resource also returned unavailable. `SITES_MANAGED_LINUX_CONTAINER` is not set to 1.

Native Sites tools are callable. This confirms tool availability only, not local-helper provisioning, Site identity, source preparation, packaging or deployment. No Site has been registered, no write credential created, and no hosting archive built.

Parent reports an installed official helper package in its cloud workspace and can choose supported artifact transfer. Transfer must include the official helper's dependencies, references and supplied server starter, not merely recreate a file with the same name. Keep the bundle outside the public application source and verify its provenance/integrity before use. Never transfer parent credentials, private profiles, Site runtime data or unrelated project files.

At 08:24–08:25 UTC the parent supplied official runtime bundle Library ID `libfile_4b9fe86d8df88191979b9ed5532c21d5`, filename `sites-official-runtime-bundle.zip`, expected 359,295 bytes and SHA-256 `48e23179bb2228422bfe84ab2069f4cfb66e07f3ab5cab0ab3a482cbc456d36a`. The current Library skill and resolved-reference materialization instructions were read. Its exact supplied helper was materialized outside public source under `/workspace/site-tools/library-consumer-0825`; the target bundle destination is also outside public source.

Two separately prepared signed-URL transfers returned no local workspace path. Each was passed once, as its complete transfer object through stdin, to the official Library helper. Both exited with `library file transfer failed: download failed`. No bundle bytes, checksum verification, extraction, source helper or starter setup resulted. Signed URLs/headers were not printed or saved in this repository. No proxy bypass or network-setting change was attempted. A supported parent transfer/provisioning recovery remains necessary.

At 08:28–08:30 UTC native `sites_create_schedule` became discoverably callable in this environment, and the current recurring-updates reference was read. Before scheduling it requires a published Site, independently verified unattended writer and persisted readback, then a fresh `get_site` with non-null linked `automations` and its exact `schedule_request_id`. Capability discovery is not a saved schedule or an executed update. GitHub Actions will not serve as a production heartbeat. A parent-native publication route can also be considered if it follows the same supported source workflow with the exact source authored here. Neither publication nor scheduling is complete.

## Network observations

Default read-only HTTPS requests to the documented DealNews RSS URL and official Best Buy / Appliances 4 Less Sacramento pages failed at the environment outbound CONNECT proxy. Python reported `URLError <urlopen error Tunnel connection failed: 403 Forbidden>`; curl reported `curl: (56) CONNECT tunnel failed, response 403`, with an envoy CONNECT 403 response. The origin was not reached. An escalated read-only DealNews request had the same proxy failure; there was no automatic approval rejection.

The harmless `NETWORK` routing value is `caas_neko_desktop`. No bypass, proxy replacement, retailer impersonation or security change was attempted. A failed workspace fetch is not evidence of a retailer prohibition or empty stock. Native web research can read primary cached pages, but its XML representation limitation does not establish an empty feed.

Existing shell Git transport read and push succeeded. The native GitHub `get_repo` read also succeeded and confirmed the public canonical repository. Shell `gh api` requests are proxy-blocked, so use supported existing Git transport/native GitHub tools rather than create a credential or broaden access.

At 08:33:16 UTC a bounded four-request read-only batch attempted BuyDig's robots file and the exact DJI open-box item, plus Outdoor Speaker Depot's robots file and exact AP650 B-stock item. Each used the default Python urllib transport with a 12-second timeout and a 256 KiB observation limit. All returned `Tunnel connection failed: 403 Forbidden` before reaching the retailer origin. No payload was stored, no alternate proxy/user-agent impersonation was used, and those denied endpoints were not retried. Native research-page stock observations do not prove unattended executable-runtime access. Hosted supported fetch access remains a separate verification requirement.

## Later browser validation capability

Node v24.19.0, npm 11.9.0, `/usr/bin/chromium`, Python Playwright and a Playwright Core Node package are installed. The Browser plugin/skill is not listed in the session. The frontend-testing skill permits ordinary Playwright when Browser is absent; portable Sites preview instructions apply here. No new browser dependency is needed merely to establish browser capability.

No app browser tests have run. Chromium/mobile emulation does not constitute native Safari, iPhone Add to Home Screen, VoiceOver or cross-context storage validation. Those remain NOT RUN until actual evidence exists.

Peter subsequently authorized reputable free development/testing tool installation, without authorizing paid services, credentials, OAuth or broader account access. The official npm registry is reachable when its cache is placed in writable `/tmp`. `@axe-core/playwright` 4.13.0 (Deque upstream, MPL-2.0) installed with lifecycle scripts disabled in `/workspace/open-box-qa-tools`, outside the application/source archive. Its installed Playwright Core launched existing `/usr/bin/chromium` successfully and returned version 154.0.8037.57 at `about:blank`. This is a tool-capability smoke check only, not an application accessibility/browser pass.

The existing Python Playwright version is 1.62.0; its default browser binaries are absent. A documented official CLI download of WebKit 26.5 / Playwright build 2336 into the separate QA directory failed with HTTP 403 `Domain forbidden` at the official CDN and Microsoft's official fallback. No browser proxy substitution, unofficial mirror, TLS weakening, host permission change or global browser replacement was attempted. WebKit runtime checks remain BLOCKED/NOT RUN. The [official Playwright browser documentation](https://playwright.dev/python/docs/browsers) also distinguishes its patched WebKit from branded Safari, so a future successful Linux WebKit install would still not establish native iPhone behavior.
