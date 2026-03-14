/* ════════════════════════════════════════════════════════════════
   chat.js v9.0 — AnyLM Chat (Simplified)
   Guest access with API keys, 3 free models, key management
   ════════════════════════════════════════════════════════════════ */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);

    // State
    let session = null;
    let apiKey = null;
    let conversationHistory = [];
    let isLoading = false;
    let selectedModel = 'gemini-3-flash';
    let creditBalance = 0;

    // Only show these 3 truly free models
    const FREE_MODELS = ['gemini-3-flash', 'glm-5', 'kimi-k2.5'];
    const ALL_MODELS = {
        'gemini-3-flash': 'Gemini 3 Flash',
        'glm-5': 'GLM-5',
        'kimi-k2.5': 'Kimi K2.5',
        'claude-haiku-4.5': 'Claude Haiku 4.5 (Credits)',
        'claude-sonnet-4.6': 'Claude Sonnet 4.6 (Credits)',
        'claude-opus-4.6': 'Claude Opus 4.6 (Credits)',
    };

    const DOM = {
        apiKeyInput: $('api-key-input'),
        apiKeyBtn: $('api-key-btn'),
        apiKeyArea: $('api-key-area'),
        chatWrapper: $('chat-wrapper'),
        chatContainer: $('chat-container'),
        messageInput: $('message-input'),
        sendBtn: $('send-btn'),
        modelSelect: $('model-select'),
        creditBalance: $('credit-balance'),
        apiKeysBtn: $('api-keys-btn'),
        keysOverlay: $('keys-overlay'),
        keysCloseBtn: $('keys-close-btn'),
        keysList: $('keys-list'),
        createKeyBtn: $('create-key-btn'),
        keyLabelInput: $('key-label-input'),
        statusBar: $('status-bar'),
        logoutBtn: $('logout-btn'),
    };

    // Initialize
    init();

    function init() {
        // Setup event listeners
        DOM.apiKeyBtn?.addEventListener('click', () => setApiKey());
        DOM.sendBtn?.addEventListener('click', () => sendMessage());
        DOM.messageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        DOM.apiKeysBtn?.addEventListener('click', () => showKeysModal());
        DOM.keysCloseBtn?.addEventListener('click', () => hideKeysModal());
        DOM.createKeyBtn?.addEventListener('click', () => createNewKey());
        DOM.logoutBtn?.addEventListener('click', () => logout());
        DOM.modelSelect?.addEventListener('change', (e) => {
            selectedModel = e.target.value;
            localStorage.setItem('selectedModel', selectedModel);
        });

        // Load from localStorage
        apiKey = localStorage.getItem('apiKey');
        selectedModel = localStorage.getItem('selectedModel') || 'gemini-3-flash';

        if (apiKey) {
            showChat();
            loadCredits();
            loadApiKeys();
        } else {
            showApiKeyPrompt();
        }

        // Update model selector with only free models initially
        updateModelSelector();
    }

    function updateModelSelector() {
        if (!DOM.modelSelect) return;
        DOM.modelSelect.innerHTML = '';
        FREE_MODELS.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = ALL_MODELS[m];
            if (m === selectedModel) opt.selected = true;
            DOM.modelSelect.appendChild(opt);
        });
    }

    function setApiKey() {
        const key = DOM.apiKeyInput?.value.trim();
        if (!key) return alert('Enter an API key');

        localStorage.setItem('apiKey', key);
        apiKey = key;

        DOM.apiKeyInput.value = '';
        showChat();
        loadCredits();
        loadApiKeys();
    }

    function logout() {
        if (confirm('Logout and clear API key?')) {
            localStorage.removeItem('apiKey');
            apiKey = null;
            conversationHistory = [];
            showApiKeyPrompt();
        }
    }

    function showApiKeyPrompt() {
        if (DOM.apiKeyArea) DOM.apiKeyArea.style.display = 'flex';
        if (DOM.chatWrapper) DOM.chatWrapper.classList.remove('active');
        updateStatus('Ready. Enter API key to start.');
    }

    function showChat() {
        if (DOM.apiKeyArea) DOM.apiKeyArea.style.display = 'none';
        if (DOM.chatWrapper) DOM.chatWrapper.classList.add('active');
    }

    async function sendMessage() {
        if (isLoading) return;
        const msg = DOM.messageInput?.value.trim();
        if (!msg || !apiKey) return;

        isLoading = true;
        updateStatus('Sending...');

        // Add user message to history
        conversationHistory.push({ role: 'user', content: msg });

        // Display user message
        addMessageToDom('user', msg);
        DOM.messageInput.value = '';

        try {
            const response = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: conversationHistory,
                    stream: true,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                addMessageToDom('assistant', `Error: ${error.error?.message || 'Unknown error'}`);
                updateStatus('Error');
                isLoading = false;
                return;
            }

            let assistantMessage = '';
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            const assistantEl = addMessageToDom('assistant', '');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const json = JSON.parse(line.slice(6));
                            const content = json.choices?.[0]?.delta?.content || '';
                            if (content) {
                                assistantMessage += content;
                                assistantEl.innerHTML = `<pre>${escapeHtml(assistantMessage)}</pre>`;
                            }
                        } catch (e) {}
                    }
                }
            }

            conversationHistory.push({ role: 'assistant', content: assistantMessage });
            updateStatus('Ready');
            loadCredits();
        } catch (err) {
            addMessageToDom('assistant', `Error: ${err.message}`);
            updateStatus('Error');
        }

        isLoading = false;
    }

    function addMessageToDom(role, content) {
        const msg = document.createElement('div');
        msg.className = `message message-${role}`;
        msg.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
        DOM.chatContainer?.appendChild(msg);
        DOM.chatContainer?.scrollTop = DOM.chatContainer?.scrollHeight;
        return msg;
    }

    async function loadCredits() {
        if (!apiKey) return;
        try {
            const res = await fetch('/v1/credits', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (res.ok) {
                const data = await res.json();
                creditBalance = data.balance ?? 0;
                if (DOM.creditBalance) DOM.creditBalance.textContent = `$${creditBalance.toFixed(2)}`;
            }
        } catch (err) {
            console.error('Load credits failed:', err);
        }
    }

    async function showKeysModal() {
        if (DOM.keysOverlay) DOM.keysOverlay.classList.add('active');
        await loadApiKeys();
    }

    function hideKeysModal() {
        if (DOM.keysOverlay) DOM.keysOverlay.classList.remove('active');
    }

    async function loadApiKeys() {
        if (!apiKey) return;
        try {
            const res = await fetch('/v1/keys', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (res.ok) {
                const keys = await res.json();
                renderApiKeys(keys);
            }
        } catch (err) {
            console.error('Load keys failed:', err);
        }
    }

    function renderApiKeys(keys) {
        if (!DOM.keysList) return;
        DOM.keysList.innerHTML = '';
        keys.forEach(k => {
            const div = document.createElement('div');
            div.className = 'key-item';
            div.innerHTML = `
                <div class="key-info">
                    <div class="key-label">${escapeHtml(k.label || 'Unnamed')}</div>
                    <div class="key-value">any-${k.key.slice(-8)}</div>
                    <div class="key-meta">${k.request_count || 0} requests</div>
                </div>
                <button class="copy-btn" onclick="navigator.clipboard.writeText('any-${k.key}')">Copy</button>
                <button class="delete-btn" onclick="window.deleteApiKey('${k.id}')">Delete</button>
            `;
            DOM.keysList.appendChild(div);
        });
    }

    async function createNewKey() {
        const label = DOM.keyLabelInput?.value.trim() || 'New Key';
        if (!apiKey) return;

        try {
            const res = await fetch('/v1/keys', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ label }),
            });
            if (res.ok) {
                const newKey = await res.json();
                alert(`New key created:\n\nany-${newKey.key}\n\nSave this somewhere safe!`);
                DOM.keyLabelInput.value = '';
                await loadApiKeys();
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    }

    window.deleteApiKey = async (id) => {
        if (!confirm('Delete this key?')) return;
        if (!apiKey) return;

        try {
            const res = await fetch(`/v1/keys/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (res.ok) {
                await loadApiKeys();
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    function updateStatus(msg) {
        if (DOM.statusBar) DOM.statusBar.textContent = msg;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
