# Nth Nota free gateway — version 2

This updates the **existing** `nth-nota-free-ai` Cloudflare Worker. Keep its current URL, `AI` / `DB` bindings, secrets and database. The launcher 0.9.6 already supports the chat contract; this backend update does not require another APK.

## Task routing

| Work | Preferred service | Alternatives |
| --- | --- | --- |
| Proofread, polish, summarize, launcher-setting help | Cloudflare Workers AI, Llama 3.1 8B FP8 fast | Groq GPT-OSS 20B |
| Conversations, brainstorming, creative writing, evidence-based synthesis | Groq GPT-OSS 20B | Cloudflare Workers AI |
| General live web retrieval | Tavily Basic | Exa Auto → Firecrawl basic search → Riveter quick search → confirmed Context.dev basic search |
| Read an explicitly supplied public web-page link | Confirmed Context.dev Markdown reader | Firecrawl basic Markdown reader |

Only configured providers participate. A healthy primary returns immediately; backups consume no credits until used. Both model providers cover the supported model tasks. Retrieval and inference have independent failover. A missing AI binding still permits Groq.

Network failures, timeouts, rate limits, credential errors and unusable output can trigger an alternate provider. D1 cooldowns are shared across Worker instances, respect Retry-After where available and expire automatically. Brief outages normally rest for one minute, credential/configuration errors for ten minutes, known daily exhaustion until the next UTC day, and search-credit/pricing errors until the next UTC month. Safety refusals and invalid client requests stop without model hopping. Empty search results and an unreadable individual page do not mark an entire provider down.

The workflow has a 48-second deadline. Model attempts allow 12 seconds and retrieval attempts eight seconds within that remaining deadline. No same-provider retry loop, async research polling, key rotation, account creation, subscription upgrade or automatic credit purchase is implemented. A timed-out Workers AI binding call is not guaranteed canceled upstream; its reservation remains counted and late output is discarded.

## Confirm the Context provider before enabling its key

The owner screenshot includes `CONTEXT_API_KEY`. That name alone does not identify a service: Context.dev, Context.ai and Context7 have different APIs and credentials. **A generic Context key remains unused by default.** The included connector is specifically for **https://www.context.dev**.

If that is the website that issued the key, add this ordinary Worker variable after checking its Free plan:

```text
NOTA_CONTEXT_PROVIDER=context.dev
```

The connector then uses the existing encrypted `CONTEXT_API_KEY`; it also accepts an explicitly named `CONTEXT_DEV_API_KEY`. Do not set this variable for a key from another Context service. No attempt is made to discover a provider by sending the secret to multiple endpoints. Nothing needs to be changed for the other already-configured providers.

## Free-only controls

Keep Workers on **Free**, Groq on **Free**, Tavily on its free plan with pay-as-you-go off, Exa on its free Starter allowance, Firecrawl on **Free**, Riveter on **Free**, and Context.dev on **Free** if enabled. Disable paid usage and automatic refill in provider accounts. `FREE_ONLY_CONFIRMED=yes` is the owner's deployment check; it cannot inspect most external billing settings. Providers' enforced free tiers are the external hard billing boundary. Local reservations do not guarantee that an account later moved to a paid plan cannot incur charges.

The shared gateway still allows **50 user requests/day globally** and **15/day per connection**, including failed attempts, with UTC daily reset. The standalone Nota app and launchers share these caps. A conversation makes at most two model phases and one successful search or page read. Each phase may attempt configured alternatives within its time budget.

| Provider | Additional local budget |
| --- | --- |
| Cloudflare | 9,000 conservatively estimated Neurons/day |
| Groq | 180,000 reserved tokens/day, 7,500/minute, 900 requests/day, 25/minute |
| Tavily | 900 basic search attempts/calendar month |
| Exa | 500 Auto search attempts/calendar month |
| Firecrawl | 900 shared credits/calendar month; search reserves 2, page reading reserves 1; 8 combined attempts/minute |
| Riveter | 200 quick-search attempts/calendar month, at most 0.04 provider credits each; 20 attempts/minute |
| Confirmed Context.dev | 900 shared credits/calendar month; basic search/page reading each reserves 1; 8 combined attempts/minute |

D1 claims are atomic across Worker instances and fail closed before unmetered requests. Input reservations deliberately use UTF-8 byte counts plus message overhead as a conservative token bound, with maximum output included. Cloudflare retains 512 writing/768 chat output tokens; Groq allows 1,536 completion tokens including reasoning. Failed and timed-out attempts are not refunded; sequential budget checks may reserve capacity even when a later check fails. Models and rates are fixed in server code. Clients cannot select providers, models, keys, billing settings or arbitrary upstream endpoints.

Search budgets use the final date of their month as an expiry key. Scheduled daily cleanup therefore retains an active monthly counter and removes it two days after its month ends. Calendar reservations may differ from provider billing-cycle dates. Other apps using the same provider account also consume its real allowance; the provider's actual free limits remain authoritative. No new D1 table or migration is required.

Provider-specific restrictions:

- **Tavily:** basic depth, automatic parameters off, no generated answer, raw page retrieval or images. Currently one credit per basic search.
- **Exa:** Auto search, three results, bounded text only. The existing local cap leaves room within the published Starter allowance at checked rates.
- **Firecrawl search:** three web results with descriptions, domain tools and highlights disabled; no scraping is requested alongside search. Current price is two credits per ten results, rounded up. Search and explicit page reads share the same local 900-credit pool.
- **Riveter:** a zero-spend `GET /v1/account` verifies `plan: free` and a usable balance before a quick search. `POST /v1/quick_search` uses `max_credits: 0.04` and a unique run key. Only a completed `quick_search` result with public source snippets is used. No search-agent, enrichment, dataset, monitor, contact-data, automatic top-up or background polling operation is called. Riveter's current pricing lists 250 Free credits/month; quick search currently costs 0.04 credits. The local 200-attempt cap is deliberately lower than a credit-only calculation.
- **Context.dev:** remains gated on an explicit provider declaration. Basic search requests three descriptions without page content or highlights. Page reads request only Markdown, no authenticated profile, custom headers, browser actions, structured extraction, OCR or agent-generated answer. Search and page reads share the 900-credit cap. Its current Free tier lists 1,000 credits/month with no overage.

Unexpected reported costs stop that provider for the rest of the month for owner review. Riveter's per-request credit ceiling additionally rejects a higher estimate before execution. The code never responds to a credit limit by buying credits or enabling billing.

## Reading a link

The conversational model may select page reading when the user asks to read or summarize a public HTTPS link they supplied in this or a recent user message. Merely including a link in a writing request does not automatically fetch it. An exact whitelist derived from user-supplied links is checked after the model's decision. Assistant-invented links and links inside retrieved pages cannot trigger another read.

Credentials in URLs, private/local addresses, custom ports, non-HTTPS links and obvious document/archive downloads are rejected. Only the selected fixed provider endpoint receives the requested URL. Firecrawl disables file parsers, so an unrecognized PDF cannot silently trigger a multi-page OCR job. No user cookies, authorization headers or persistent browser profiles are sent to target websites. Readers request fresh content; Firecrawl page caching is disabled for this path, though separate provider operational retention still applies.

Only the first 6,000 characters of a page's returned Markdown are used. The assistant is told this is an excerpt and must disclose that limitation when it affects the requested summary. Synthesis uses the same valid-source-ID and exact-quote checks as search. If evidence is insufficient or synthesis fails, retrieved source links remain available with an honest unavailable answer. This checks provenance rather than guaranteeing factual accuracy or freshness.

## Deploy through the existing dashboard session

The latest owner screenshot shows encrypted `GROQ_API_KEY`, `TAVILY_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY`, `RIVETER_API_KEY`, `CONTEXT_API_KEY` and `IP_HASH_SALT`, plus `FREE_ONLY_CONFIRMED=yes`, `AI` and `DB`. It confirms names and bindings, not key validity, account plans or deployment of this source.

1. Open **Workers & Pages → nth-nota-free-ai → Edit code** in the owner's already-signed-in Cloudflare session.
2. Replace the complete existing module with **`cloud/releases/Nth-Nota-Free-AI-Worker-v2.mjs`**, then **Deploy**. `cloud/dashboard-worker.mjs` contains the identical latest bundle. Preserve all secrets and bindings.
3. Keep `NOTA_WEB_SEARCH` absent or `auto` for automatic search fallback. `off` disables all retrieval; `tavily`, `exa`, `firecrawl`, `riveter` or `context` selects one search provider. `NOTA_PAGE_READER` is independently `auto`, `context`, `firecrawl` or `off`, with global retrieval-off taking precedence.
4. Set `NOTA_CONTEXT_PROVIDER=context.dev` **only after the key's issuing website is confirmed to be Context.dev**. Until then, all other configured services work and the Context key stays unused.
5. Ensure **Settings → Trigger events → Cron triggers** includes `7 0 * * *` (00:07 UTC daily) for cleanup. The scheduled code is included, but deploying a module alone does not create a dashboard Cron Trigger.

Check `https://nth-nota-free-ai.bdredenbach.workers.dev/v1/capabilities` afterward. It should report `chatVersion: 1`, **`gatewayVersion: 2`**, configured provider names, `webSearch` and `pageReading`. A generic but undeclared Context key produces **`contextProviderRequired: true`**. This endpoint makes no upstream calls, consumes no quota, returns no secrets/account budgets, and reports configuration rather than verified key health. Launcher 0.9.6 ignores the additional diagnostic fields and continues using chat version 1.

Use a simple explanation, a follow-up and a current sourced question in the launcher. Try “Summarize this link” with a public web-page URL to exercise page reading. For provider-specific real-key smoke checks, the owner can temporarily select one search provider in `NOTA_WEB_SEARCH`, make a single nonpersonal test query, then restore `auto`. Do not exhaust real allowances to test fallback. Real provider authentication, billing settings and latency remain unverified until deployment with the owner's secrets; automated tests use synthetic providers.

## Packaging, tests and new installations

Regenerate both deliverables after changing source:

```sh
node tools/package-chat-worker.cjs cloud/dashboard-worker.mjs
node tools/package-chat-worker.cjs cloud/releases/Nth-Nota-Free-AI-Worker-v2.mjs
node --check cloud/dashboard-worker.mjs
npm test
```

Focused coverage lives in `checks/gateway.test.cjs`, `checks/chat-gateway.test.cjs`, `checks/free-providers.test.cjs`, `checks/firecrawl.test.cjs`, `checks/additional-providers.test.cjs`, `checks/page-reading.test.cjs`, and `checks/reports.test.cjs`. It includes actual concurrent SQLite reservations, both model fallback directions, cooldown/recovery, retrieval budgets, provider errors, Riveter Free-plan verification, Context key gating, page URL whitelisting, provenance and bundle execution.

For a new installation, copy `cloud/wrangler.example.jsonc` to ignored `cloud/wrangler.jsonc`, create the D1 database, set its ID, apply `cloud/migrations`, and add the encrypted salt/provider secrets with official Wrangler. Keep Workers Free and confirm `FREE_ONLY_CONFIRMED=yes` after checking accounts. Existing owner installations do not need recreation. No deploy workflow, subscription or automatic payment is created by this source change.

## Consent, API and privacy

`POST /v1/chat` accepts a question, at most six completed user/assistant exchanges, `auto`/`search` mode, timezone, optional launcher-setting reference values and consent. `POST /v1/write`, `POST /v1/report` and `GET /privacy` remain supported. All writing/chat requests share the existing caps. Core notes and local launcher commands remain usable when cloud services stop.

Only an explicitly sent, cloud-enabled request and its bounded context enter the cloud path. Cloudflare/Groq receive inference input. Configured search providers receive relevant search terms; page readers receive the explicitly supplied URL, and page content then enters the model context. The gateway never stores prompts, replies, page URLs, search terms, excerpts or conversation histories in D1. It stores daily salted-IP request counts, anonymous provider budgets and cooldowns; explicitly submitted AI reports retain their separate existing policy.

Provider processing, logs and retention are independent. In particular, Riveter quick search creates a provider-side run whose result remains re-fetchable under the owner's account. The updated `dist/privacy.html` and identical public `/privacy` policy disclose all retrieval providers and this retained run history. No zero-provider-retention promise is made. Turning off cloud consent, Stop or leaving the screen cancels client delivery but cannot retract already completed upstream processing.

The public endpoint has CORS filtering rather than embedded APK credentials. Per-IP allowances may be shared by a household, and unauthenticated callers can consume the capped free pool. Authentication/attestation remains a separate public-rollout consideration; keep the global cap in place. Models cannot execute launcher actions or follow tool instructions from retrieved text.

References checked November 17, 2026:

- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://console.groq.com/docs/rate-limits
- https://docs.tavily.com/documentation/api-reference/endpoint/search
- https://exa.ai/pricing/
- https://docs.firecrawl.dev/api-reference/endpoint/search
- https://docs.firecrawl.dev/api-reference/endpoint/scrape
- https://docs.riveterhq.com/tools/quick-search
- https://docs.riveterhq.com/account/get-account
- https://docs.riveterhq.com/credits
- https://www.riveterhq.com/pricing
- https://docs.context.dev/search/overview
- https://docs.context.dev/api-reference/web-scraping/scrape
- https://www.context.dev/pricing
