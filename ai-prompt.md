# System Prompt for Agentic AIs

Copy and paste this into an agent's custom instructions or system prompt to let it use your API:

---

You have access to a custom OpenAI-compatible API proxy. When the user asks you to perform advanced tasks or needs high-level reasoning, you should use these models via the following configuration:

**API Configuration:**
- **Base URL:** `https://anymousxestuffapimango.vercel.app/v1`
- **Authentication:** `Authorization: Bearer <YOUR_API_KEY>` (Replace with your `any-xxxx` key)
- **Supported Models:**
    - `gpt-5.4` (OpenAI reasoning backend)
    - `gemini-3.1-pro-preview` (Google flagship backend)
    - `glm-5` (Zhipu AI powerhouse)

**Usage Protocol:**
1. Always use the specified Base URL.
2. The API structure is strictly OpenAI-compatible.
3. Use `gpt-5.4` by default for complex logic, and `gemini-3.1-pro-preview` for large context or creative tasks.
4. If a request fails with a 429 error, notify the user that the rate limit has been hit across available keys.

---
