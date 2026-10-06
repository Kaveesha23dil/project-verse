# Admin AI Review Assistant

1. Add `GROQ_API_KEY` to `server/.env`. Do not put it in client environment variables.
2. Optionally set `GROQ_MODEL` (default: `openai/gpt-oss-20b`).
3. Restart the API with `npm run dev`.
4. Sign in as an administrator, open **Review submissions**, click **Review** on a publication, then **AI Review**.
5. Read the summary, information gaps and questions. **Use as note to owner** copies feedback into an empty note for editing. The administrator still chooses approval or rejection.

Only title, abstract, publication type, category, keywords and technologies are sent to Groq. Author identities and attached documents are excluded. Data handling follows your Groq account settings and provider policy.

No database migration or additional dependency is needed. AI requests have a 45-second timeout and a limit of five requests per minute per IP. Missing keys, rejected keys, quota errors and incomplete responses appear in the dialog. Results are not persisted and do not change publication status.

Verification: `node --test scripts/ai-review.test.js`. These tests use a stub provider; testing live generation requires a configured API key.

API format follows [Groq structured outputs documentation](https://console.groq.com/docs/structured-outputs).
