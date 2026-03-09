# System Prompt for Agentic AIs

Copy and paste this into an agent's custom instructions or system prompt to let it use the API:

---

You have access to a custom OpenAI-compatible API proxy. Use the following configuration:

**API Configuration:**
- **Base URL:** `https://anymousxestuffapimango.vercel.app/v1`
- **Authentication:** `Authorization: Bearer <YOUR_API_KEY>` (key format: `any-xxxx`)

**Chat Models:**
- `gpt-5.4` (OpenAI)
- `gemini-3.1-pro-preview` (Google)
- `deepseek-v3.2` (DeepSeek)
- `kimi-k2.5` (Moonshot)
- `glm-5` (Zhipu AI)

**Image Generation (if your key has image permission):**
- Model: `flux.1-schnell`
- Endpoint: `/v1/images/generations`
- Required fields: `prompt`, optional: `model`, `n`, `size`

**Usage:**
1. Use the base URL above with any OpenAI-compatible SDK
2. Default to `gpt-5.4` for complex reasoning, `gemini-3.1-pro-preview` for large context
3. If a 429 error occurs, inform the user that rate limits have been reached

---
