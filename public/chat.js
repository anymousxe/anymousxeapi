console.log("Chat JS v2.0 - Initialization Started");
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const authError = document.getElementById('auth-error');

const userAvatar = document.getElementById('user-avatar');
const userEmail = document.getElementById('user-email');
const userPlanBadge = document.getElementById('user-plan-badge');
const logoutBtn = document.getElementById('logout-btn');

const modelSelectorWrapper = document.getElementById('custom-model-selector');
const chatTextarea = document.getElementById('chat-textarea');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const emptyState = document.getElementById('empty-state');
const historyList = document.getElementById('history-list');
const newChatBtn = document.getElementById('new-chat-btn');

const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');

let supabase = null;
let currentSession = null;
let currentPlan = 'free';
let currentChatId = null;

async function init() {
    try {
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.warn('Icon load failed');
    }

    try {
        console.log("Fetching config...");
        const configRes = await fetch('/v1/config');
        if (!configRes.ok) throw new Error("Config fetch failed: " + configRes.status);

        const config = await configRes.json();
        console.log("Config received:", { url: !!config.supabaseUrl, key: !!config.supabaseAnonKey });

        if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
            console.log("Initializing Supabase...");
            try {
                supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
            } catch (sErr) {
                console.error("Supabase Client Creation Failed:", sErr);
                showError("Supabase Error: Is your Anon Key valid? It should be a long string starting with 'eyJ'.");
                authOverlay.classList.add('active');
                return;
            }

            // Explicitly set session on load
            const { data: { session }, error: sError } = await supabase.auth.getSession();
            if (sError) console.error("Session fetch error:", sError);

            if (session) {
                console.log("Session found for:", session.user.email);
                currentSession = session;
                authOverlay.classList.remove('active');
                loadUserProfile(session.user);
                loadChats();
            } else {
                console.log("No session found.");
                authOverlay.classList.add('active');
            }

            checkAuth(); // start listener
        } else {
            const missing = !window.supabase ? "Supabase Library" : "Config Keys";
            console.error("Initialization check failed:", missing);
            showError(`Error: ${missing} missing. Check your .env and Internet.`);
            authOverlay.classList.add('active');
        }
    } catch (err) {
        console.error("Init crash:", err);
        showError("Initialization failed: " + err.message);
        authOverlay.classList.add('active');
    }

    setupEventListeners();
}

function setupEventListeners() {
    btnLogin.addEventListener('click', handleLogin);
    btnSignup.addEventListener('click', handleSignup);
    logoutBtn.addEventListener('click', handleLogout);

    sendBtn.addEventListener('click', handleSend);
    chatTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    chatTextarea.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim().length > 0) {
            sendBtn.style.opacity = '1';
        } else {
            sendBtn.style.opacity = '0.5';
        }
    });

    newChatBtn.addEventListener('click', startNewChat);

    menuBtn.addEventListener('click', () => sidebar.classList.add('open'));
    closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

    // Custom dropdown logic
    const dropdownHeader = document.getElementById('custom-model-header');
    const dropdownList = document.getElementById('custom-model-list');

    if (dropdownHeader && dropdownList) {
        dropdownHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownList.classList.toggle('show');
            dropdownHeader.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            dropdownList.classList.remove('show');
            dropdownHeader.classList.remove('active');
        });

        dropdownList.querySelectorAll('.model-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                if (option.classList.contains('disabled')) return;

                document.querySelectorAll('.model-option').forEach(el => el.classList.remove('selected'));
                option.classList.add('selected');

                document.getElementById('selected-model-name').textContent = option.dataset.name;
                document.getElementById('custom-model-selector').dataset.value = option.dataset.value;

                dropdownList.classList.remove('show');
                dropdownHeader.classList.remove('active');
            });
        });
    }
}

async function checkAuth() {
    if (!supabase) return;

    supabase.auth.onAuthStateChange((_event, session) => {
        currentSession = session;
        if (session) {
            authOverlay.classList.remove('active');
            loadUserProfile(session.user);
            loadChats();
        } else {
            authOverlay.classList.add('active');
        }
    });
}

async function handleLogin() {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) return showError("Email and password required.");

    setLoading(btnLogin, true);
    if (!supabase) return showError("Client not initialized.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(btnLogin, false);

    if (error) showError(error.message);
}

async function handleSignup() {
    const email = emailInput.value;
    const password = passwordInput.value;
    const usernameInput = document.getElementById('auth-username');

    // Toggle UI if they just clicked Signup without username showing
    if (usernameInput.parentElement.style.display === 'none') {
        usernameInput.parentElement.style.display = 'block';
        showError("Please enter a username and click Sign Up again.", true);
        authError.style.color = '#fff';
        return;
    }

    const username = usernameInput.value;

    if (!email || !password || !username) return showError("Email, Username and password required.");

    setLoading(btnSignup, true);
    if (!supabase) return showError("Client not initialized.");
    const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username: username }
        }
    });
    setLoading(btnSignup, false);

    if (error) {
        showError(error.message);
    } else {
        usernameInput.parentElement.style.display = 'none';
        showError("Success! Check your email or login now.", true);
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    startNewChat();
    historyList.innerHTML = '<div class="history-label">Recents</div>';
}

function showError(msg, isSuccess = false) {
    authError.textContent = msg;
    authError.style.color = isSuccess ? 'var(--green)' : 'var(--red)';
}

function setLoading(btn, isLoading) {
    btn.disabled = isLoading;
    btn.style.opacity = isLoading ? '0.7' : '1';
}

async function loadUserProfile(user) {
    userEmail.textContent = user.email;
    userAvatar.textContent = user.email.charAt(0).toUpperCase();

    // Fetch plan from public.users table
    try {
        const { data, error } = await supabase.from('users').select('plan').eq('id', user.id).single();
        if (data && data.plan) {
            currentPlan = data.plan;
        } else {
            currentPlan = 'free'; // default
            // Optional: insert into users table
            await supabase.from('users').insert([{ id: user.id, email: user.email, plan: 'free' }]);
        }
    } catch (err) {
        currentPlan = 'free';
    }

    userPlanBadge.textContent = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) + ' Plan';
    updateModelSelector();
}

function updateModelSelector() {
    const options = document.querySelectorAll('.model-option');
    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        opt.classList.remove('disabled');

        let reqPlan = 'free';
        const val = opt.dataset.value;
        if (val.includes('claude-haiku') || val.includes('claude-sonnet') || val.includes('grok')) {
            reqPlan = 'plus';
        } else if (val.includes('opus')) {
            reqPlan = 'pro';
        }

        if (reqPlan === 'plus' && currentPlan === 'free') opt.classList.add('disabled');
        if (reqPlan === 'pro' && (currentPlan === 'free' || currentPlan === 'plus')) opt.classList.add('disabled');
    }

    // if selected model is disabled, fallback to gpt-5.4
    const currentSelector = document.getElementById('custom-model-selector');
    const currentlySelected = document.querySelector(`.model-option[data-value="${currentSelector.dataset.value}"]`);

    if (currentlySelected && currentlySelected.classList.contains('disabled')) {
        const fallback = document.querySelector('.model-option[data-value="gpt-5.4"]');
        if (fallback) {
            document.querySelectorAll('.model-option').forEach(el => el.classList.remove('selected'));
            fallback.classList.add('selected');
            currentSelector.dataset.value = 'gpt-5.4';
            document.getElementById('selected-model-name').textContent = fallback.dataset.name;
        }
    }
}

// ---- Chat DB logic ----
async function loadChats() {
    if (!currentSession) return;
    const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('created_at', { ascending: false });

    historyList.innerHTML = '<div class="history-label">Recents</div>';
    if (data) {
        data.forEach(chat => {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.textContent = chat.title || 'New Chat';
            el.onclick = () => selectChat(chat.id, el);
            historyList.appendChild(el);
        });
    }
}

async function createChat(firstMessage) {
    const title = firstMessage.substring(0, 30) + "...";
    const { data, error } = await supabase
        .from('chats')
        .insert([{ user_id: currentSession.user.id, title }])
        .select()
        .single();

    if (data) {
        currentChatId = data.id;
        loadChats();
    }
    return data;
}

function startNewChat() {
    currentChatId = null;
    messagesContainer.innerHTML = '';
    messagesContainer.appendChild(emptyState);
    emptyState.style.display = 'block';

    document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
    if (window.innerWidth <= 768) sidebar.classList.remove('open');
}

async function selectChat(id, element) {
    currentChatId = id;
    document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
    if (window.innerWidth <= 768) sidebar.classList.remove('open');

    messagesContainer.innerHTML = '';
    emptyState.style.display = 'none';

    // Fetch messages
    const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', id)
        .order('created_at', { ascending: true });

    if (data) {
        data.forEach(msg => {
            appendMessage(msg.role, msg.content, msg.thinking_content);
        });
    }
    scrollToBottom();
}

async function saveMessage(role, content, thinking_content = null) {
    if (!currentChatId) return;
    await supabase.from('messages').insert([{
        chat_id: currentChatId,
        role,
        content,
        thinking_content
    }]);
}

// ---- Chat Rendering & API logic ----
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function appendMessage(role, content, thinkingStr = null) {
    emptyState.style.display = 'none';

    if (role === 'user') {
        const div = document.createElement('div');
        div.className = 'message user';
        div.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
        messagesContainer.appendChild(div);
    } else {
        const template = document.getElementById('thinking-template');
        const clone = template.content.cloneNode(true);
        const div = clone.querySelector('.message');

        const thinkingBlock = div.querySelector('.thinking-block');
        const thinkingBody = div.querySelector('.thinking-body');
        const responseBody = div.querySelector('.response-body');

        if (thinkingStr && thinkingStr.trim().length > 0) {
            thinkingBlock.style.display = 'block';
            thinkingBody.textContent = thinkingStr;
        } else {
            thinkingBlock.style.display = 'none';
        }

        responseBody.innerHTML = marked.parse(content || '');
        messagesContainer.appendChild(div);

        if (window.lucide) {
            lucide.createIcons({ root: div });
        }
    }
    scrollToBottom();
}

const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function extractThink(text) {
    const match = text.match(/<think>([\s\S]*?)<\/think>/);
    if (match) {
        return {
            think: match[1].trim(),
            rest: text.replace(/<think>[\s\S]*?<\/think>/, '').trim()
        };
    }

    // handle incomplete think tag from stream
    if (text.includes('<think>')) {
        return {
            think: text.split('<think>')[1].trim(),
            rest: ''
        };
    }

    return { think: null, rest: text };
}

async function handleSend() {
    const text = chatTextarea.value.trim();
    if (!text || !currentSession) return;

    const model = document.getElementById('custom-model-selector').dataset.value;
    chatTextarea.value = '';
    chatTextarea.style.height = 'auto';
    sendBtn.style.opacity = '0.5';

    if (!currentChatId) {
        await createChat(text);
    }

    appendMessage('user', text);
    await saveMessage('user', text);

    // Create placeholder for assistant response
    emptyState.style.display = 'none';
    const template = document.getElementById('thinking-template');
    const clone = template.content.cloneNode(true);
    const assistantDiv = clone.querySelector('.message');

    const thinkingBlock = assistantDiv.querySelector('.thinking-block');
    const thinkingBody = assistantDiv.querySelector('.thinking-body');
    const responseBody = assistantDiv.querySelector('.response-body');
    const pulseDot = assistantDiv.querySelector('.pulse-dot');

    thinkingBlock.style.display = 'block'; // open by default while streaming
    thinkingBlock.setAttribute('open', '');
    thinkingBody.textContent = 'Thinking...';
    responseBody.innerHTML = '';
    messagesContainer.appendChild(assistantDiv);
    if (window.lucide) {
        lucide.createIcons({ root: assistantDiv });
    }
    scrollToBottom();

    // build history payload
    const historyNodes = messagesContainer.querySelectorAll('.message');
    const messagesPayload = [];
    historyNodes.forEach((node) => {
        if (node === assistantDiv) return;
        const isUser = node.classList.contains('user');

        let content = '';
        if (isUser) {
            content = node.querySelector('.message-content').textContent;
        } else {
            // Reconstruct think tag theoretically, but usually api only strictly needs the final rest content
            content = node.querySelector('.response-body').textContent;
        }

        if (content) {
            messagesPayload.push({
                role: isUser ? 'user' : 'assistant',
                content: content
            });
        }
    });

    try {
        const token = currentSession.access_token;
        const res = await fetch('/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                model: model,
                messages: messagesPayload,
                stream: true
            })
        });

        if (!res.ok) {
            const err = await res.json();
            thinkingBlock.style.display = 'none';
            responseBody.innerHTML = `<p style="color:var(--red)">Error: ${err.error?.message || 'Request failed'}</p>`;
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let insideThink = false;

        thinkingBody.textContent = ''; // clear "Thinking..."

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const tokenStr = data.choices[0]?.delta?.content || '';
                        fullText += tokenStr;

                        const parsed = extractThink(fullText);

                        // DeepSeek style <think> tags or reasoning response
                        if (parsed.think !== null) {
                            if (parsed.think.length > 0) {
                                thinkingBody.textContent = parsed.think;
                            }
                            if (parsed.rest.length > 0) {
                                // hide pulse, maybe close block automatically 
                                pulseDot.style.animation = 'none';
                                pulseDot.style.background = '#888';
                                responseBody.innerHTML = marked.parse(parsed.rest);
                            }
                        } else {
                            // some models don't return <think> tags but are selected as reasoning
                            if (model.includes('reasoning') && !fullText.includes('<think>')) {
                                thinkingBody.textContent = fullText;
                            } else {
                                thinkingBlock.style.display = 'none';
                                responseBody.innerHTML = marked.parse(fullText);
                            }
                        }
                        scrollToBottom();
                    } catch (e) {
                        // unparseable
                    }
                }
            }
        }

        // finalize
        pulseDot.style.animation = 'none';
        pulseDot.style.background = '#888';

        const finalParsed = extractThink(fullText);
        if (finalParsed.think !== null) {
            thinkingBlock.removeAttribute('open'); // close it when done
            await saveMessage('assistant', finalParsed.rest, finalParsed.think);
        } else {
            if (model.includes('reasoning')) {
                thinkingBlock.removeAttribute('open');
                await saveMessage('assistant', '', fullText); // text was all thinking
            } else {
                await saveMessage('assistant', fullText, null);
            }
        }

        if (window.lucide) {
            lucide.createIcons({ root: assistantDiv });
        }

    } catch (err) {
        thinkingBlock.style.display = 'none';
        responseBody.innerHTML = `<p style="color:var(--red)">Network Error</p>`;
    }
}

document.addEventListener('DOMContentLoaded', init);
