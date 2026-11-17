# Free cloud assistance for Nth Nota and Nth Desktop

The launcher uses this owner-operated Cloudflare Worker after the user enables **Cloud questions for Nth Nota AI** and sends a message. The standalone Nota app tries on-device assistance first and uses the same writing endpoint after cloud opt-in. No provider credentials are included in the APK.

## Task routing and automatic recovery

| Task | Preferred model | Backup model |
| --- | --- | --- |
| Proofread, polish, summarize, launcher-setting explanations | Cloudflare Workers AI: Llama 3.1 8B FP8 fast | Groq: GPT-OSS 20B |
| General conversations, brainstorming, creative writing | Groq: GPT-OSS 20B | Cloudflare Workers AI: Llama 3.1 8B FP8 fast |
| Answer synthesis using retrieved public excerpts | Groq: GPT-OSS 20B | Cloudflare Workers AI: Llama 3.1 8B FP8 fast |
| Live web retrieval | Tavily Basic Search | Exa Auto Search → Firecrawl basic search; configured secrets only |

Both model providers can cover all supported model tasks. Missing keys are skipped. An absent AI binding still permits Groq. Network errors, timeouts, rate limits, authentication errors, empty/truncated replies and malformed structured answers can trigger a single alternate-provider attempt. Safety refusals and invalid client requests stop without hopping models. No same-provider retry loops, key rotation, account creation, paid model selection or built-in Groq search/code tools are used.

Failures set a D1 cooldown shared across Worker instances. Rate limits honor Retry-After when available; temporary failures normally rest for one minute, credential failures for ten minutes, daily compute exhaustion until the next UTC day, and search credit exhaustion until the next UTC month. A provider is eligible again automatically after its cooldown. A long prompt that cannot fit Groq's conservative free-minute budget uses Cloudflare without marking Groq down for smaller questions.

Each inference attempt has a 12-second response deadline, search attempts have eight seconds, and the whole provider workflow has a 48-second deadline. An HTTP timeout aborts its fetch. A timed-out Workers AI binding call cannot be guaranteed canceled upstream, so its reserved compute remains charged against the local budget and late output is ignored.

## Free-only boundaries and shared budgets

The owner must keep **Workers Free**, **Groq Free**, and **Tavily's free Researcher plan with pay-as-you-go disabled**. Exa must remain on its free Starter allowance without paid usage. Firecrawl must remain on its no-card Free plan, with no paid subscription or pay-as-you-go. `FREE_ONLY_CONFIRMED=yes` records that owner check; it does not inspect the billing status of any account. API keys cannot prove an account is on a free plan. Provider-enforced free limits are the external hard billing boundary.

Keep the existing global cap of **50 user requests/day** and **15/day per connection**. These are shared by the launcher and other apps using the Worker, including failed attempts. A chat needs at most two model phases and one successful search; each phase may attempt two configured providers. Request caps reset at 00:00 UTC.

Additional fixed, atomic D1 reservations limit traffic from this gateway:

| Provider budget | Local limit |
| --- | --- |
| Cloudflare inference | 9,000 estimated Neurons/day |
| Groq inference | 180,000 reserved tokens/day; 7,500/minute; 900 requests/day; 25/minute |
| Tavily Basic Search | 900 search attempts/calendar month |
| Exa | 500 search attempts/calendar month |
| Firecrawl | 900 reserved credits/calendar month (450 basic search attempts); 8 attempts/minute |

Input reservations use UTF-8 byte counts plus message overhead as a deliberately conservative token bound and include the maximum output allowance. Groq's 1,536 completion-token allowance includes its reasoning; Cloudflare retains 768 chat/512 writing output tokens. These are reservations, not a billing meter; failed and timed-out attempts are not refunded. Sequential budget claims can reserve capacity even when a later claim fails. The provider's own free quotas, pricing and usage elsewhere on the account remain authoritative. Current model rates and account limits must be reviewed before changing models or these budgets.

Tavily calls explicitly set `search_depth: basic`, `auto_parameters: false`, `include_answer: false`, and no raw-page retrieval or images. A basic search currently uses one credit. Optional Exa requests Auto search, three results and bounded text only; its local cap leaves room within the published $10/month Starter credit at checked rates. Firecrawl currently publishes 1,000 free credits per monthly billing cycle and a basic-search price of two credits per ten results, rounded up. Its fallback requests only three web results with descriptions; it explicitly disables domain tools and highlights and omits scrape options, crawls, browser sessions and agent runs. The router reserves two credits per attempt and stops after 900 credits in a calendar month. Calendar reservations can differ from the provider’s billing-cycle dates; the provider’s actual free allowance remains authoritative. Unexpected reported costs put the affected search provider on cooldown for the rest of the month for owner review.

Search quotas are stored with the final date of their month as their expiry key. The daily cleanup therefore retains the active monthly counter, then removes it two days after that month ends. No new database table or migration is required. If usage storage fails, new inference/search stops before an unmetered request is sent. A model never substitutes remembered current facts when search is unavailable; the launcher offers a manual browser search instead. Model outages after retrieval retain the retrieved source links.

## Existing owner setup: model and search secrets already saved

The owner screenshot on November 17, 2026 shows these existing production settings:

- Variable `FREE_ONLY_CONFIRMED=yes`.
- Encrypted secrets `GROQ_API_KEY`, `TAVILY_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY`, `IP_HASH_SALT`.
- Workers AI binding `AI` and existing D1 binding `DB` (`nth-nota-ai-quota`).

The screenshot confirms names/bindings, not successful authentication or billing settings. Preserve all existing keys, bindings and data. There is no need to recreate a secret or paste it into chat.

Deploy the updated code to the **existing** `nth-nota-free-ai` Worker. `cloud/dashboard-worker.mjs` is the self-contained dashboard version. Regenerate it after source changes:

```sh
node tools/package-chat-worker.cjs cloud/dashboard-worker.mjs
node --check cloud/dashboard-worker.mjs
```

In Cloudflare: **Workers & Pages → nth-nota-free-ai → Edit code**, replace the current module with the complete dashboard version, and **Deploy**. Keep the Worker's existing AI and DB bindings and encrypted secrets. `NOTA_WEB_SEARCH` can be absent or `auto`; the existing Tavily secret then enables search. `off` explicitly disables search. `tavily`, `exa` or `firecrawl` selects that search service alone. Old `NOTA_SEARCH_BILLING_CONFIRMED`, Gateway IDs and key-alias settings are no longer used; Cloudflare Web Search/AI Gateway credits are never called by this free-only implementation.

The latest owner screenshot shows both backup secrets saved. With this code deployed and `NOTA_WEB_SEARCH` absent or `auto`, live retrieval tries Tavily, then Exa, then Firecrawl. A healthy primary returns immediately without contacting backups or consuming their credits. Missing secrets, shared cooldowns and exhausted local budgets are skipped automatically. Model failover remains independent of search failover.

Ensure **Settings → Trigger events → Cron triggers** includes `7 0 * * *` (00:07 UTC daily) for quota/report cleanup. The exported `scheduled` handler performs this cleanup, but deploying code alone does not create a dashboard Cron Trigger. The example Wrangler config includes it for CLI deployment.

The existing launcher 0.9.6 already supports this `/v1/chat` contract, so the routing change does not require a new APK. After deployment:

1. Open `https://nth-nota-free-ai.bdredenbach.workers.dev/v1/capabilities`. Expected: `{"chatVersion":1,"webSearch":true}` when the existing Tavily key is configured. This checks configuration without spending a model/search call.
2. Send a simple explanation, then a follow-up in the launcher; both should remain in the same conversation.
3. Ask for current information or choose **Web: Always**. Check that source buttons open supporting pages and the reply's content agrees with their dates.
4. Confirm Groq/Tavily/Exa/Firecrawl usage dashboards show the small test requests and no paid plan/automatic refill has been enabled.

Do not deliberately exhaust real provider allowances to test failover. Automated model/search outage, recovery, concurrency and quota tests use synthetic providers and an actual SQLite concurrency check. Live behavior still needs verification after deployment with the owner's real secrets.

## New installations using Wrangler

Copy `cloud/wrangler.example.jsonc` to `cloud/wrangler.jsonc`, create the `nth-nota-ai-quota` D1 database, set its ID, apply `cloud/migrations`, and add an encrypted random `IP_HASH_SALT`. Keep Workers on Free and set `FREE_ONLY_CONFIRMED=yes` after checking the provider accounts. Optional provider keys are encrypted Worker secrets. From `cloud`, use the official Wrangler commands:

```sh
npx wrangler@4 login
npx wrangler@4 d1 migrations apply nth-nota-ai-quota --remote
npx wrangler@4 secret put IP_HASH_SALT
npx wrangler@4 secret put GROQ_API_KEY
npx wrangler@4 secret put TAVILY_API_KEY
npx wrangler@4 deploy
```

Keep local secrets and `wrangler.jsonc` out of git. A nonempty `NOTA_AI_GATEWAY_URL` overrides the standalone app's endpoint in `android/ai-gateway.properties`. No deployment workflow or paid subscription is created by this source change.

## API, consent and privacy

`POST /v1/chat` accepts a question, up to six completed user/assistant exchanges, `auto`/`search` mode, timezone, optional launcher-setting reference values, and `consentAccepted: true`. `POST /v1/write` preserves the existing proofread/polish/brainstorm/generate/summarize contract. `POST /v1/report` and `GET /privacy` are preserved. `GET /v1/capabilities` exposes only conversation version and configured-search availability, consumes no quota, and never exposes provider credentials or remaining account budgets.

The model decides whether search is needed and resolves follow-ups. Search returns at most three safe HTTPS result links with bounded excerpts. The synthesis must cite valid source IDs and exact supporting quotes; unsupported output is replaced by an honest unavailable answer and source links. This checks provenance rather than guaranteeing that every claim is correct or current. Retrieved pages are untrusted reference material; they cannot change device settings or run actions.

Only an explicitly sent, opted-in request and its bounded context enter the cloud path. Task routing/failover can process that request with Cloudflare or Groq. Search terms go directly from the Worker to Tavily, Exa or Firecrawl; excerpts then go to the selected model. The Worker does not store prompts, responses, conversation histories, search terms or sources in D1. D1 holds daily salted-IP request counters, anonymous provider budget counters and cooldowns; explicitly submitted AI reports have their separate existing retention policy. Provider processing and operational metadata policies apply independently. See `dist/privacy.html` and the Worker's identical `/privacy` policy.

The endpoint is public; CORS is an origin filter, not authentication. Per-IP caps can be shared by a household. The global cap limits abuse exposure; production authentication/attestation remains a separate rollout consideration. Client requests cannot choose provider URLs, models, API keys, billing settings or budgets. Turning cloud consent off, Stop or leaving the screen cancels client delivery, but cannot retract provider processing already completed.

## Validation

Run `node --test checks/gateway.test.cjs checks/chat-gateway.test.cjs checks/free-providers.test.cjs checks/firecrawl.test.cjs checks/reports.test.cjs` for focused backend coverage, and `npm test` for the complete Nota suite. Tests cover both directions of model fallback, shared cooldown and recovery, malformed output, search fallback, consent, request caps, monthly reset/cleanup, concurrent atomic reservations, storage failures, safety handling, source validation and the dashboard bundle.

References checked November 17, 2026:

- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/text-chat
- https://docs.tavily.com/documentation/api-reference/endpoint/search
- https://help.tavily.com/articles/8298987937-billing-credits-usage-limits
- https://exa.ai/pricing/
- https://exa.ai/docs/reference/search

- https://www.firecrawl.dev/pricing
- https://docs.firecrawl.dev/api-reference/endpoint/search
