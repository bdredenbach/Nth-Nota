# Free cloud activation for the app owner

Status on October 19, 2026: the owner confirmed Workers Free and manually deployed the gateway. A live dashboard HTTP proofreading test returned 200 with corrected text. No Groq account/key is connected, and the Android app path still needs device testing. The APK works independently with on-device assistance on supported phones. This gateway is for the Android prototype; the hosted browser app does not call it yet.

## Route and cost controls

The app tries Gemini Nano on the phone first. With the user's cloud opt-in, an unavailable or quota-limited local engine falls back to the owner-operated Cloudflare Worker. The Worker tries Cloudflare Workers AI (Llama 3.1 8B FP8 fast), then optionally Groq (GPT OSS 20B) when the first provider is unavailable. Safety/invalid-input failures stop rather than trigger provider hopping. The system does not create accounts or rotate API keys to circumvent limits.

Use a **Workers Free** account and, optionally, a **Groq Free** account. Do not enable Workers Paid, prepaid AI Gateway credits, Groq Developer billing, or any automatic upgrade. As checked October 18, 2026, Workers Free includes 10,000 neurons/day and fails beyond that allowance. Quotas belong to the owner's account, so other apps can consume them. Groq's actual limits must be checked in the account console. Model availability and free terms can change; recheck before public rollout.

`FREE_ONLY_CONFIRMED=yes` is the owner's explicit deployment check, not an API that verifies billing. The app/router cannot prevent an owner from later changing provider billing. Remaining on the providers' free account plans is the external hard billing boundary.

The gateway also has conservative fixed limits: 50 requests/day for the whole app, 15/day per connection, 16,000 prompt characters, and 512 output tokens. Both successful and failed provider attempts count as requests. Daily caps reset at 00:00 UTC. D1 claims are atomic across Worker instances; failures in quota storage stop inference. Provider cooldowns are shared by all clients. Do not treat these counts as an exact neuron/token measurement. Provider-enforced free limits remain authoritative.

## Owner setup

1. Create a [Cloudflare Free account](https://dash.cloudflare.com/sign-up). Keep Workers on Free. Install Node.js 22+, open a terminal in this repository's `cloud` folder, then run:

   ```sh
   cp wrangler.example.jsonc wrangler.jsonc
   npx wrangler@4 login
   npx wrangler@4 d1 create nth-nota-ai-quota
   ```

2. Put the returned database ID into the `DB` binding in `wrangler.jsonc`. After checking the account is on Free, change `FREE_ONLY_CONFIRMED` from `no` to `yes`. Apply the migration and set a random salt used only to hash daily quota identities:

   ```sh
   npx wrangler@4 d1 migrations apply nth-nota-ai-quota --remote
   openssl rand -hex 32 | npx wrangler@4 secret put IP_HASH_SALT
   ```

3. Deploy with `npx wrangler@4 deploy`. The Worker will provide its HTTPS address. In [GitHub repository variables](https://github.com/bdredenbach/Nth-Nota/settings/variables/actions), add `NOTA_AI_GATEWAY_URL` with value `https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/v1/write`. This public endpoint is not a secret. Run the **Nth Nota Android preview** workflow manually and install its newly built APK. Users can then enable **Allow free cloud assistance** in Settings.

Optional second provider: create a free [Groq account](https://console.groq.com/), verify its current Free plan and limits, and run `npx wrangler@4 secret put GROQ_API_KEY` in this folder. Enter the key at the terminal prompt. Never paste keys into chat, source code, the APK, or a GitHub repository variable. Use `npx wrangler@4 secret delete GROQ_API_KEY` to remove that provider. One Cloudflare account is enough to begin.

`wrangler.jsonc`, local secrets and Wrangler state are ignored by git. The example file has cloud activation off. No deploy workflow runs automatically. The repository now supplies the verified public endpoint through `android/ai-gateway.properties`. A nonempty `NOTA_AI_GATEWAY_URL` environment variable overrides it. Clear the properties-file URL to build with no gateway. Cloud permission defaults to off.

## Privacy and prototype limits

Only the current request, selected passage/note context and recent conversation are sent, after opt-in. The Worker sends them to Cloudflare and optionally Groq for inference. D1 stores day, a salted daily IP hash, counters and provider cooldowns; it does not store prompts, replies, raw IPs, or keys. The scheduled handler deletes old quota rows daily when the Cron Trigger is configured. The manually deployed Worker still needs that trigger; confirmation is pending. Worker observability is disabled in the example. Provider processing/retention policies and infrastructure metadata still apply; this is not end-to-end encrypted cloud inference.

This prototype endpoint is public and intentionally has no embedded shared secret (an APK cannot keep one). CORS is an origin filter, not authentication. Someone outside the app can consume the capped free allowance. Per-IP quotas can be shared by a household/network. Add proper per-install authentication/attestation and abuse protection before a public release. Do not remove global caps to compensate for abuse. No secret is returned to clients and clients cannot choose models, upstream URLs or paid options.

After deployment, validate real proofreading and idea-board requests on the target phone, local-only operation in airplane mode after model preparation, consent-off network behavior, local-to-cloud switching, provider quota exhaustion and reset, and opt-out/cancellation. Automated tests use mocked providers and do not claim live cloud inference.

References:
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/configuration/bindings/
- https://developers.cloudflare.com/d1/worker-api/prepared-statements/
- https://developers.cloudflare.com/workers/wrangler/commands/
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/text-chat

## Completing the manual dashboard deployment

The owner has already completed Worker creation, free-plan verification, AI and DB bindings, schema creation, encrypted IP hash salt, `FREE_ONLY_CONFIRMED=yes`, disabled observability, code deployment and an HTTP proofreading test. The runtime currently has no Groq secret, so cloud inference uses Cloudflare alone.

In the Worker’s **Settings**, scroll to **Trigger events → Cron triggers → Add**. Use the custom cron expression `7 0 * * *` (00:07 UTC daily) and save. The gateway’s scheduled handler then deletes quota rows older than two days. This is the dashboard equivalent of `triggers.crons` in the example Wrangler file. Do not alter any free-plan or billing setting.

Install the 0.3.1 Android preview, open Settings, turn on **Allow free cloud assistance**, then try proofreading from a note’s writing companion. On-device assistance is attempted first, so a supported phone may answer locally. Cloud replies are labelled as processed with free cloud assistance. No in-app end-to-end result has yet been claimed.
