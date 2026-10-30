# Ask FIG — free AI-assisted historical league search

Ask FIG is a read-only league archive search. The static website stays on GitHub Pages. Cloudflare Workers AI converts an English question into a restricted JSON query plan. The website validates that plan and calculates all the numbers from finalized published archive data. The AI never writes records, invents numerical answers, or receives database dumps.

Without a configured Worker, the original keyword search remains active. With the AI endpoint configured, an inference error or invalid plan is reported instead of silently substituting a misleading answer.

## One-time deployment on the Cloudflare free tier

1. Sign in to the Cloudflare Workers **Free** account at https://dash.cloudflare.com/. Remain on the Free plan. As of October 2026 Workers AI allows 10,000 free neurons daily; the Free plan rejects over-limit usage rather than billing for overages.
2. Install Node.js if necessary. Clone or download the repository to your computer. Open a terminal in the **workers/ask-fig** folder and run:

    npx wrangler login
    npx wrangler deploy

   Follow the Cloudflare browser login prompt. Deployment prints a URL resembling https://ask-fig-ai.fig-league-archive.workers.dev.
3. In the website repository, edit **ask-fig-config.js** to set the public URL returned by Cloudflare (already configured for this league):

    window.FIG_ASK_WORKER_URL = 'https://ask-fig-ai.fig-league-archive.workers.dev';

   Commit the change to the Ask FIG feature branch and merge the reviewed pull request to main. GitHub Pages will publish the website normally. No paid API keys are needed.
4. The Worker accepts browser origins in the **ALLOWED_ORIGINS** variable in **workers/ask-fig/wrangler.jsonc**. The configured allowed origin is https://ufboek.github.io. For a custom site domain, add its exact origin (https + hostname; no trailing path) separated by commas, then redeploy.
5. The new service exposes a simple /health endpoint and accepts statistical interpretation requests on /interpret. The published website continues to use its own /data JSON files.

Never put Cloudflare API tokens or other secrets in the public repository. The Worker includes allowed-origin checks, a maximum question length, approximate per-client and aggregate rate limits and AI usage under the free daily cap. Browser Origin is not authentication: forged requests are still possible, so do not upgrade to a paid plan without reviewing usage protections.

## AI-mode searches

Supported query dimensions: finalized team scores, weekly wins and losses, PPG, win percentages, opponents, scored/allowed point thresholds, margins, regular season vs playoffs, season and week ranges, top or bottom N, minimum sample sizes and rankings. Player results use historical **starts only**, not bench points. Drafts and trades use published transaction archives. Team-season totals come from the official team season master.

Examples of supported queries:

- What percentage of Hayden's games under 175 points were wins?
- How many times did Boek lose while outscoring Hayden that week?
- Who has the most 200+ point weeks since Week 10 of 2025?
- Which players scored 30+ for at least three different fantasy franchises?
- Who drafted Josh Allen?
- How many trades did Fru make?

The model can create a post-aggregation threshold (for example, three distinct teams), but the website checks and computes the aggregate itself.

Not yet supported: arbitrary multi-table joins, all-play, injury timelines, dynamic lineup-slot queries, championship-specific logic, streak sequences, future predictions, trade aftermath analytics, or information absent from these archives. The AI must mark such questions unsupported, never improvise a number. This is a meaningful extension beyond the keyword parser, but not a guarantee that literally every question is answerable.

## Code and verification

- **workers/ask-fig/src/index.js**: free-tier-compatible Llama 3.3 70B interpreter, JSON schema, input checks and rate limiting.
- **workers/ask-fig/wrangler.jsonc**: Workers AI binding and Worker settings.
- **ask-fig-config.js**: optional public endpoint URL, initially blank.
- **league-ask-ai-v221.js**: validated, deterministic query execution in the browser.
- **league-ask-v220.js**: existing interface and fallback keyword parser.
- **index.html** and **sw.js**: load the scripts and cache the app shell.
- **tests/test_league_ask_ai.js**: real-archive calculation checks and mocked Worker CORS, plan and rate-limit checks.

Run from the repository root:

    node tests/test_league_ask_ai.js
    node tests/test_league_ask.js
    bash scripts/check_website_tests.sh

End-to-end live inference still requires deploying the Worker to a Cloudflare account; automated tests mock model output. The feature branch does not change live GitHub Pages until merged. An unrelated historical dynasty-market archive assertion currently makes the full website CI fail after Ask FIG's tests pass; that integrity issue should be addressed separately.

## Deployment status (October 30, 2026)

Cloudflare Worker `ask-fig-ai` was deployed using the connected Cloudflare account, with Workers AI, allowed-origin and per-IP/global rate-limit bindings. Its endpoint is `https://ask-fig-ai.fig-league-archive.workers.dev` and the public URL is committed to `ask-fig-config.js` on the feature branch. Automated live smoke tests from GitHub Actions confirmed the health endpoint, real AI inference and CORS. The production website is **still unchanged** until the feature PR is merged.

Cloudflare's Workers Free plan includes 10,000 AI neurons per day; the stronger 70B model consumes approximately 30–45 neurons for typical queries tested here, so actual daily capacity varies with question and model output. Stay on the Free plan to avoid overage billing. Worker changes are **not continuously deployed from GitHub**; use Cloudflare connection/API or Wrangler to deploy future backend changes.

For an optional live verification, run `node tests/test_league_ask_worker_smoke.js`. It calls the deployed Worker and consumes a small amount of your free AI allowance. It is intentionally not required during all routine UI regression runs after initial verification.
