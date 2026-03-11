/* ════════════════════════════════════════════════════════════════
   chat.js  v7.0  — AnymousxeAPI Chat
   Full feature set: streaming, thinking fix, folders, memory,
   workspaces, canvas, admin override, copy/retry, live update banner
   ════════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    const $ = id => document.getElementById(id);

    // ─── DOM refs ───────────────────────────────────────────────
    const DOM = {
        // auth
        authOverlay: $('auth-overlay'),
        authForm: $('auth-form'),
        authTitle: $('auth-title'),
        authSubtitle: $('auth-subtitle'),
        stepSignup: $('step-signup'),
        stepLogin: $('step-login'),
        stepOtp: $('step-otp'),
        signupUsername: $('auth-username'),
        signupEmail: $('auth-email'),
        signupPass: $('auth-password'),
        loginEmail: $('login-email'),
        loginPass: $('login-password'),
        otpInput: $('auth-otp'),
        btnSignupSubmit: $('btn-signup-submit'),
        btnLoginSubmit: $('btn-login-submit'),
        btnVerifyOtp: $('btn-verify-otp'),
        linkToLogin: $('link-to-login'),
        linkToSignup: $('link-to-signup'),
        btnBackToSignup: $('btn-back-to-signup'),
        authError: $('auth-error'),
        // sidebar
        sidebar: $('sidebar'),
        menuBtn: $('menu-btn'),
        closeSidebar: $('close-sidebar-btn'),
        newChatBtn: $('new-chat-btn'),
        newFolderBtn: $('new-folder-btn'),
        newWorkspaceBtn: $('new-workspace-btn'),
        historyList: $('history-list'),
        userEmail: $('user-email'),
        userAvatar: $('user-avatar'),
        userPlanBadge: $('user-plan-badge'),
        upgradeBtn: $('upgrade-btn'),
        logoutBtn: $('logout-btn'),
        devSettingsBtn: $('dev-settings-btn'),
        memorySec: $('memory-section'),
        memoryList: $('memory-list'),
        workspacesSec: $('workspaces-section'),
        workspacesList: $('workspaces-list'),
        // overlays
        plansOverlay: $('plans-overlay'),
        devOverlay: $('dev-settings-overlay'),
        devPlanSelect: $('dev-plan-select'),
        devPlanApply: $('dev-plan-apply'),
        devSettingsClose: $('dev-settings-close'),
        // update banner
        updateBanner: $('update-banner'),
        dismissBanner: $('dismiss-banner'),
        // canvas
        canvasPanel: $('canvas-panel'),
        canvasOpenBtn: $('canvas-open-btn'),
        canvasClose: $('canvas-close'),
        canvasTabPreview: $('canvas-tab-preview'),
        canvasTabCode: $('canvas-tab-code'),
        canvasIframe: $('canvas-iframe'),
        canvasCodeView: $('canvas-code-view'),
        canvasCodeContent: $('canvas-code-content'),
        // workspace modal
        workspaceModal: $('workspace-modal'),
        wsNameInput: $('workspace-name-input'),
        wsImportBtn: $('workspace-import-btn'),
        wsFileInput: $('workspace-file-input'),
        wsFileList: $('workspace-file-list'),
        wsSaveBtn: $('workspace-save-btn'),
        wsCancelBtn: $('workspace-cancel-btn'),
        // main chat
        modelSelector: $('custom-model-selector'),
        modelHeader: $('custom-model-header'),
        modelList: $('custom-model-list'),
        selectedName: $('selected-model-name'),
        textarea: $('chat-textarea'),
        sendBtn: $('send-btn'),
        messages: $('messages-container'),
        emptyState: $('empty-state'),
        workspaceHint: $('workspace-hint'),
        activeWorkspaceBar: $('active-workspace-bar'),
        activeWorkspaceName: $('active-workspace-name'),
        wsExportBtn: $('workspace-export-btn'),
        wsDeactivateBtn: $('workspace-deactivate-btn'),
    };

    // ─── State ──────────────────────────────────────────────────
    let sb = null;
    let session = null;
    let currentPlan = 'free';
    let effectivePlan = 'free';  // may differ from currentPlan for admin sim
    let isAdmin = false;
    let currentChatId = null;
    let pendingEmail = '';
    let pendingPassword = '';
    let memories = [];
    let workspaces = [];          // [{name, files:[{name,content}]}]
    let activeWorkspace = null;   // currently loaded workspace
    let currentCanvasCode = '';
    let deployVersion = null;
    let isSending = false;

    const ADMIN_EMAILS = ['anymousxe.info@gmail.com'];
    const ADMIN_USERNAMES = ['anymousxe'];

    const DISP_DOMAINS = new Set([
        'mailinator.com', 'guerrillamail.com', 'temp-mail.org', 'throwam.com',
        'trashmail.com', 'yopmail.com', 'sharklasers.com', 'grr.la', 'getnada.com',
    ]);
    function isDisposable(email) {
        return DISP_DOMAINS.has(email.split('@')[1]?.toLowerCase());
    }

    const PLAN_RANK = { free: 0, plus: 1, pro: 2, admin: 99 };
    function canUseModel(plan) {
        return (PLAN_RANK[effectivePlan] ?? 0) >= (PLAN_RANK[plan] ?? 99);
    }

    // ════════════════════════════════════════════════════════════
    //  1. WIRE ALL BUTTONS  (synchronous)
    // ════════════════════════════════════════════════════════════
    function wireButtons() {

        // ── Auth toggles ──
        if (DOM.linkToLogin) DOM.linkToLogin.addEventListener('click', e => { e.preventDefault(); window.history.pushState({}, '', '/chat/login'); checkRoute(); });
        if (DOM.linkToSignup) DOM.linkToSignup.addEventListener('click', e => { e.preventDefault(); window.history.pushState({}, '', '/chat/signup'); checkRoute(); });
        if (DOM.btnBackToSignup) DOM.btnBackToSignup.addEventListener('click', e => { e.preventDefault(); window.history.pushState({}, '', '/chat/signup'); checkRoute(); });
        if (DOM.btnSignupSubmit) DOM.btnSignupSubmit.addEventListener('click', doSignup);
        if (DOM.btnLoginSubmit) DOM.btnLoginSubmit.addEventListener('click', doLogin);
        if (DOM.btnVerifyOtp) DOM.btnVerifyOtp.addEventListener('click', doVerifyOtp);
        if (DOM.logoutBtn) DOM.logoutBtn.addEventListener('click', doLogout);
        if (DOM.authForm) DOM.authForm.addEventListener('submit', e => e.preventDefault());
        if (DOM.otpInput) DOM.otpInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doVerifyOtp(); } });

        // ── Plans ──
        if (DOM.upgradeBtn) DOM.upgradeBtn.addEventListener('click', e => { e.preventDefault(); DOM.plansOverlay.classList.add('active'); });
        document.querySelectorAll('.close-plans').forEach(btn => btn.addEventListener('click', () => DOM.plansOverlay.classList.remove('active')));

        // ── Dev settings (admin only) ──
        if (DOM.devSettingsBtn) DOM.devSettingsBtn.addEventListener('click', () => { DOM.devOverlay.classList.add('active'); });
        if (DOM.devSettingsClose) DOM.devSettingsClose.addEventListener('click', () => { DOM.devOverlay.classList.remove('active'); });
        if (DOM.devPlanApply) DOM.devPlanApply.addEventListener('click', () => {
            effectivePlan = DOM.devPlanSelect.value;
            DOM.userPlanBadge.textContent = effectivePlan.charAt(0).toUpperCase() + effectivePlan.slice(1) + ' Plan (Simulated)';
            updateModelLocks();
            DOM.devOverlay.classList.remove('active');
        });

        // ── Update banner ──
        if (DOM.dismissBanner) DOM.dismissBanner.addEventListener('click', () => { DOM.updateBanner.style.display = 'none'; });

        // ── Send msg ──
        if (DOM.sendBtn) DOM.sendBtn.addEventListener('click', doSend);
        if (DOM.textarea) {
            DOM.textarea.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
            });
            DOM.textarea.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
                DOM.sendBtn.style.opacity = this.value.trim() ? '1' : '0.5';
            });
        }

        // ── New chat ──
        if (DOM.newChatBtn) DOM.newChatBtn.addEventListener('click', startNewChat);

        // ── Sidebar toggle (mobile) ──
        if (DOM.menuBtn) DOM.menuBtn.addEventListener('click', () => DOM.sidebar.classList.add('open'));
        if (DOM.closeSidebar) DOM.closeSidebar.addEventListener('click', () => DOM.sidebar.classList.remove('open'));

        // ── Model selector ──
        if (DOM.modelHeader && DOM.modelList) {
            DOM.modelHeader.addEventListener('click', e => {
                e.stopPropagation();
                DOM.modelList.classList.toggle('show');
                DOM.modelHeader.classList.toggle('active');
            });
            document.addEventListener('click', () => {
                DOM.modelList.classList.remove('show');
                DOM.modelHeader.classList.remove('active');
            });
            DOM.modelList.querySelectorAll('.model-option:not(.model-locked)').forEach(opt => {
                opt.addEventListener('click', e => {
                    e.stopPropagation();
                    DOM.modelList.querySelectorAll('.model-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    DOM.selectedName.textContent = opt.dataset.name;
                    DOM.modelSelector.dataset.value = opt.dataset.value;
                    DOM.modelList.classList.remove('show');
                    DOM.modelHeader.classList.remove('active');
                });
            });
            // Locked model click → prompt upgrade
            DOM.modelList.querySelectorAll('.model-locked').forEach(opt => {
                opt.addEventListener('click', e => {
                    e.stopPropagation();
                    DOM.plansOverlay.classList.add('active');
                });
            });
            // Collapsible paid groups
            DOM.modelList.querySelectorAll('.model-group-toggle').forEach(toggle => {
                toggle.addEventListener('click', e => {
                    e.stopPropagation();
                    const group = toggle.dataset.group;
                    const body = $('model-group-' + group);
                    const chevron = toggle.querySelector('.group-chevron');
                    if (!body) return;
                    const isOpen = body.style.display !== 'none';
                    body.style.display = isOpen ? 'none' : 'block';
                    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(90deg)';
                });
            });
        }

        // ── New folder ──
        if (DOM.newFolderBtn) DOM.newFolderBtn.addEventListener('click', createFolder);

        // ── Memory toggle ──
        if ($('memory-toggle')) $('memory-toggle').addEventListener('click', () => {
            const body = DOM.memoryList;
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        });

        // ── Workspaces toggle ──
        if ($('workspaces-toggle')) $('workspaces-toggle').addEventListener('click', () => {
            const body = DOM.workspacesList;
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        });

        // ── New Workspace ──
        if (DOM.newWorkspaceBtn) DOM.newWorkspaceBtn.addEventListener('click', () => { DOM.workspaceModal.classList.add('active'); });
        if (DOM.wsCancelBtn) DOM.wsCancelBtn.addEventListener('click', () => { DOM.workspaceModal.classList.remove('active'); });
        if (DOM.wsImportBtn) DOM.wsImportBtn.addEventListener('click', () => DOM.wsFileInput.click());
        if (DOM.wsFileInput) DOM.wsFileInput.addEventListener('change', handleWorkspaceFiles);
        if (DOM.wsSaveBtn) DOM.wsSaveBtn.addEventListener('click', saveWorkspace);
        if (DOM.wsExportBtn) DOM.wsExportBtn.addEventListener('click', exportWorkspace);
        if (DOM.wsDeactivateBtn) DOM.wsDeactivateBtn.addEventListener('click', deactivateWorkspace);

        // ── Canvas ──
        if (DOM.canvasClose) DOM.canvasClose.addEventListener('click', () => { DOM.canvasPanel.style.display = 'none'; });
        if (DOM.canvasOpenBtn) DOM.canvasOpenBtn.addEventListener('click', () => { DOM.canvasPanel.style.display = 'flex'; });
        if (DOM.canvasTabPreview) DOM.canvasTabPreview.addEventListener('click', () => switchCanvasTab('preview'));
        if (DOM.canvasTabCode) DOM.canvasTabCode.addEventListener('click', () => switchCanvasTab('code'));
    }

    // ════════════════════════════════════════════════════════════
    //  2. ROUTING
    // ════════════════════════════════════════════════════════════
    function checkRoute() {
        const path = window.location.pathname;
        if (session && (path === '/chat/login' || path === '/chat/signup')) {
            window.history.replaceState({}, '', '/chat');
            showApp();
            return;
        }
        if (path === '/chat/login') {
            DOM.authOverlay.classList.add('active');
            DOM.stepSignup.style.display = 'none';
            DOM.stepLogin.style.display = 'block';
            DOM.stepOtp.style.display = 'none';
            DOM.authTitle.textContent = 'Welcome Back';
            DOM.authSubtitle.textContent = 'Enter your details to log in.';
        } else if (path === '/chat/signup') {
            DOM.authOverlay.classList.add('active');
            DOM.stepSignup.style.display = 'block';
            DOM.stepLogin.style.display = 'none';
            DOM.stepOtp.style.display = 'none';
            DOM.authTitle.textContent = 'Create Account';
            DOM.authSubtitle.textContent = 'Join AnymousxeAPI today.';
        } else if (path === '/chat/plans') {
            DOM.plansOverlay.classList.add('active');
        }
    }

    // ════════════════════════════════════════════════════════════
    //  3. SUPABASE INIT
    // ════════════════════════════════════════════════════════════
    async function initSupabase() {
        try {
            const res = await fetch('/v1/config');
            if (!res.ok) throw new Error('Config ' + res.status);
            const cfg = await res.json();
            if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) { showAuthMsg('Missing Supabase config.'); DOM.authOverlay.classList.add('active'); return; }
            if (!window.supabase) { showAuthMsg('Supabase lib failed to load.'); DOM.authOverlay.classList.add('active'); return; }
            sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
            const { data: { session: s } } = await sb.auth.getSession();
            if (s) { onLogin(s); } else { DOM.authOverlay.classList.add('active'); }
            sb.auth.onAuthStateChange((_evt, s2) => { if (s2) onLogin(s2); else { session = null; DOM.authOverlay.classList.add('active'); } });
        } catch (err) {
            console.error('[chat] Supabase init failed:', err);
            DOM.authOverlay.classList.add('active');
        }
    }

    // ════════════════════════════════════════════════════════════
    //  4. AUTH ACTIONS
    // ════════════════════════════════════════════════════════════
    async function doSignup() {
        const username = DOM.signupUsername.value.trim();
        const email = DOM.signupEmail.value.trim().toLowerCase();
        const password = DOM.signupPass.value;
        if (!username || !email || !password) return showAuthMsg('All fields are required.');
        if (isDisposable(email)) return showAuthMsg('Disposable emails are restricted.');
        if (!sb) return showAuthMsg('Supabase not connected.');
        setBtn(DOM.btnSignupSubmit, true, 'Creating...');
        const { error: signUpError } = await sb.auth.signUp({ email, password, options: { data: { username } } });
        if (signUpError && !signUpError.message.includes('already registered')) {
            setBtn(DOM.btnSignupSubmit, false, 'Create Account');
            return showAuthMsg(signUpError.message);
        }
        const res = await fetch('/v1/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        const json = await res.json();
        setBtn(DOM.btnSignupSubmit, false, 'Create Account');
        if (!res.ok) return showAuthMsg(json.error || 'Failed to send code.');
        pendingEmail = email; pendingPassword = password;
        DOM.stepSignup.style.display = 'none';
        DOM.stepOtp.style.display = 'block';
        DOM.authTitle.textContent = 'Verify Email';
        DOM.authSubtitle.textContent = 'Almost there!';
        showAuthMsg('6-digit code sent to your email!', true);
        window.history.pushState({}, '', '/chat/verify');
    }

    async function doLogin() {
        const email = DOM.loginEmail.value.trim().toLowerCase();
        const password = DOM.loginPass.value;
        if (!email || !password) return showAuthMsg('Email and password required.');
        if (!sb) return showAuthMsg('Supabase not connected.');
        setBtn(DOM.btnLoginSubmit, true, 'Logging in...');
        const { error } = await sb.auth.signInWithPassword({ email, password });
        setBtn(DOM.btnLoginSubmit, false, 'Login');
        if (error) { showAuthMsg(error.message); } else { window.history.replaceState({}, '', '/chat'); }
    }

    async function doVerifyOtp() {
        const token = DOM.otpInput.value.trim();
        if (!token || token.length < 6) return showAuthMsg('Enter the 6-digit code.');
        setBtn(DOM.btnVerifyOtp, true, 'Verifying...');
        const res = await fetch('/v1/auth/verify-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: pendingEmail, code: token }) });
        const json = await res.json();
        if (!res.ok) { setBtn(DOM.btnVerifyOtp, false, 'Verify & Start'); return showAuthMsg(json.error || 'Verification failed.'); }
        if (pendingPassword) {
            const { error } = await sb.auth.signInWithPassword({ email: pendingEmail, password: pendingPassword });
            if (error) { setBtn(DOM.btnVerifyOtp, false, 'Verify & Start'); return showAuthMsg('Verified! Try logging in.'); }
            pendingPassword = '';
        }
        setBtn(DOM.btnVerifyOtp, false, 'Verify & Start');
        window.history.replaceState({}, '', '/chat');
    }

    async function doLogout() {
        if (sb) await sb.auth.signOut();
        session = null; currentChatId = null;
        startNewChat();
        DOM.historyList.innerHTML = '<div class="history-label">Recents</div>';
        DOM.authOverlay.classList.add('active');
    }

    // ════════════════════════════════════════════════════════════
    //  5. ON LOGIN
    // ════════════════════════════════════════════════════════════
    function onLogin(s) {
        session = s;
        DOM.authOverlay.classList.remove('active');
        const user = s.user;
        DOM.userEmail.textContent = user.email;
        DOM.userAvatar.textContent = user.email.charAt(0).toUpperCase();

        // Admin detection
        const username = user.user_metadata?.username || '';
        isAdmin = ADMIN_EMAILS.includes(user.email) || ADMIN_USERNAMES.includes(username);
        if (isAdmin) {
            effectivePlan = 'admin';
            DOM.devSettingsBtn.style.display = 'flex';
        }

        loadPlan(user);
        loadChats();
        loadMemory();
        checkRoute();
    }

    function showApp() {
        DOM.authOverlay.classList.remove('active');
    }

    async function loadPlan(user) {
        if (isAdmin) {
            currentPlan = 'admin';
            effectivePlan = 'admin';
            DOM.userPlanBadge.textContent = '⚡ Admin';
            updateModelLocks();
            return;
        }
        try {
            const { data } = await sb.from('users').select('plan').eq('id', user.id).single();
            currentPlan = data?.plan || 'free';
            if (!data) await sb.from('users').insert([{ id: user.id, email: user.email, plan: 'free' }]);
        } catch (_) { currentPlan = 'free'; }
        effectivePlan = currentPlan;
        DOM.userPlanBadge.textContent = effectivePlan.charAt(0).toUpperCase() + effectivePlan.slice(1) + ' Plan';
        updateModelLocks();
    }

    function updateModelLocks() {
        DOM.modelList.querySelectorAll('.model-option').forEach(opt => {
            const plan = opt.dataset.plan;
            if (!plan || plan === 'free') return;
            const unlocked = canUseModel(plan);
            opt.classList.toggle('model-locked', !unlocked);
            const lock = opt.querySelector('.lock-icon');
            if (lock) lock.style.display = unlocked ? 'none' : 'inline-block';
        });
    }

    // ════════════════════════════════════════════════════════════
    //  6. CHAT DB
    // ════════════════════════════════════════════════════════════
    async function loadChats() {
        if (!session || !sb) return;
        try {
            const { data, error } = await sb.from('chats').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
            DOM.historyList.innerHTML = '<div class="history-label">Recents</div>';
            if (error) { console.error('[chat] loadChats error:', error); return; }
            if (data) data.forEach(c => appendChatItem(c));
        } catch (e) { console.error('[chat] loadChats exception:', e); }
    }

    function appendChatItem(chat, container = DOM.historyList) {
        const el = document.createElement('div');
        el.className = 'history-item';
        el.dataset.chatId = chat.id;
        el.innerHTML = `
            <span class="chat-title">${esc(chat.title || 'New Chat')}</span>
            <div class="item-actions">
                <button class="item-action-btn rename-chat-btn" title="Rename"><i data-lucide="pen-line" style="width:12px;height:12px;"></i></button>
                <button class="item-action-btn delete-chat-btn" title="Delete"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
            </div>`;
        el.querySelector('.chat-title').onclick = () => selectChat(chat.id, el);
        el.querySelector('.rename-chat-btn').onclick = e => { e.stopPropagation(); inlineRename(el, chat.id); };
        el.querySelector('.delete-chat-btn').onclick = e => { e.stopPropagation(); deleteChat(chat.id, el); };
        container.appendChild(el);
        renderIcons(el);
    }

    async function createChat(firstMsg) {
        if (!sb || !session) return null;
        const title = firstMsg.substring(0, 35) + '…';
        const { data } = await sb.from('chats').insert([{ user_id: session.user.id, title }]).select().single();
        if (data) { currentChatId = data.id; loadChats(); }
        return data;
    }

    async function renameChat(id, newTitle) {
        if (!sb) return;
        await sb.from('chats').update({ title: newTitle }).eq('id', id);
    }

    async function deleteChat(id, el) {
        if (!confirm('Delete this chat?')) return;
        if (sb) await sb.from('chats').delete().eq('id', id);
        el.remove();
        if (currentChatId === id) startNewChat();
    }

    function inlineRename(el, id) {
        const titleEl = el.querySelector('.chat-title');
        const old = titleEl.textContent;
        titleEl.contentEditable = 'true';
        titleEl.focus();
        const sel = window.getSelection();
        sel.selectAllChildren(titleEl);
        function save() {
            titleEl.contentEditable = 'false';
            const val = titleEl.textContent.trim() || old;
            titleEl.textContent = val;
            renameChat(id, val);
        }
        titleEl.addEventListener('blur', save, { once: true });
        titleEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } });
    }

    function startNewChat() {
        currentChatId = null;
        DOM.messages.innerHTML = '';
        DOM.messages.appendChild(DOM.emptyState);
        DOM.emptyState.style.display = 'flex';
        DOM.canvasPanel.style.display = 'none';
        DOM.canvasOpenBtn.style.display = 'none';
        document.querySelectorAll('.history-item').forEach(e => e.classList.remove('active'));
        if (window.innerWidth <= 768) DOM.sidebar.classList.remove('open');
    }

    async function selectChat(id, el) {
        currentChatId = id;
        document.querySelectorAll('.history-item').forEach(e => e.classList.remove('active'));
        if (el) el.classList.add('active');
        if (window.innerWidth <= 768) DOM.sidebar.classList.remove('open');
        DOM.messages.innerHTML = '';
        DOM.emptyState.style.display = 'none';
        if (!sb) return;
        const { data } = await sb.from('messages').select('*').eq('chat_id', id).order('created_at', { ascending: true });
        if (data) data.forEach(m => appendMessage(m.role, m.content, m.thinking_content));
        scrollDown();
    }

    async function saveMsg(role, content, think = null) {
        if (!currentChatId || !sb) return;
        await sb.from('messages').insert([{ chat_id: currentChatId, role, content, thinking_content: think }]);
    }

    // ════════════════════════════════════════════════════════════
    //  7. FOLDERS
    // ════════════════════════════════════════════════════════════
    async function createFolder() {
        const name = prompt('Folder name:');
        if (!name || !sb) return;
        const { data } = await sb.from('chat_folders').insert([{ user_id: session.user.id, name }]).select().single();
        if (data) renderFolder(data);
    }

    function renderFolder(folder) {
        const tpl = $('folder-template');
        const clone = tpl.content.cloneNode(true);
        const el = clone.querySelector('.folder-item');
        el.dataset.folderId = folder.id;
        el.querySelector('.folder-name').textContent = folder.name;
        el.querySelector('.folder-header').addEventListener('click', () => {
            const chats = el.querySelector('.folder-chats');
            const chevron = el.querySelector('.folder-chevron');
            const open = chats.style.display !== 'none';
            chats.style.display = open ? 'none' : 'block';
            chevron.style.transform = open ? '' : 'rotate(90deg)';
            el.querySelector('.folder-icon').setAttribute('data-lucide', open ? 'folder' : 'folder-open');
            renderIcons(el);
        });
        el.querySelector('.rename-btn').addEventListener('click', e => {
            e.stopPropagation();
            const nameEl = el.querySelector('.folder-name');
            const old = nameEl.textContent;
            nameEl.contentEditable = 'true';
            nameEl.focus();
            nameEl.addEventListener('blur', async () => {
                nameEl.contentEditable = 'false';
                const val = nameEl.textContent.trim() || old;
                nameEl.textContent = val;
                if (sb) await sb.from('chat_folders').update({ name: val }).eq('id', folder.id);
            }, { once: true });
        });
        el.querySelector('.delete-btn').addEventListener('click', async e => {
            e.stopPropagation();
            if (!confirm('Delete folder and ungroup chats?')) return;
            if (sb) await sb.from('chat_folders').delete().eq('id', folder.id);
            el.remove();
        });
        // Drag-drop target
        el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
        el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
        el.addEventListener('drop', async e => {
            e.preventDefault();
            el.classList.remove('drag-over');
            const chatId = e.dataTransfer.getData('chatId');
            if (!chatId || !sb) return;
            await sb.from('chats').update({ folder_id: folder.id }).eq('id', chatId);
            loadChats();
        });
        DOM.historyList.insertBefore(el, DOM.historyList.querySelector('.history-item'));
        renderIcons(el);
    }

    // ════════════════════════════════════════════════════════════
    //  8. MEMORY
    // ════════════════════════════════════════════════════════════
    async function loadMemory() {
        if (!sb || !session) return;
        const { data } = await sb.from('user_memory').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
        memories = data || [];
        renderMemory();
    }

    function renderMemory() {
        if (!memories.length) { DOM.memorySec.style.display = 'none'; return; }
        DOM.memorySec.style.display = 'block';
        DOM.memoryList.innerHTML = '';
        memories.forEach(m => {
            const el = document.createElement('div');
            el.className = 'memory-item';
            el.innerHTML = `<span>${esc(m.value)}</span><button class="item-action-btn" data-id="${m.id}"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>`;
            el.querySelector('button').onclick = () => deleteMemory(m.id, el);
            DOM.memoryList.appendChild(el);
            renderIcons(el);
        });
    }

    async function addMemory(key, value) {
        if (!sb || !session) return;
        const { data } = await sb.from('user_memory').insert([{ user_id: session.user.id, key, value }]).select().single();
        if (data) { memories.unshift(data); renderMemory(); }
    }

    async function deleteMemory(id, el) {
        if (sb) await sb.from('user_memory').delete().eq('id', id);
        el.remove();
        memories = memories.filter(m => m.id !== id);
    }

    function buildMemoryContext() {
        if (!memories.length) return null;
        return '[User Memory]\n' + memories.map(m => '- ' + m.value).join('\n');
    }

    function processMemoryTags(text) {
        const regex = /<remember(?:\s+key="([^"]*)")?>([\s\S]*?)<\/remember>/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const key = match[1] || 'general';
            const value = match[2].trim();
            addMemory(key, value);
        }
        return text.replace(/<remember(?:\s+key="[^"]*")?>([\s\S]*?)<\/remember>/g, '').trim();
    }

    // ════════════════════════════════════════════════════════════
    //  9. WORKSPACES
    // ════════════════════════════════════════════════════════════
    function handleWorkspaceFiles(e) {
        const files = [...e.target.files];
        const toRead = [];
        files.forEach(f => {
            const reader = new FileReader();
            reader.onload = ev => {
                toRead.push({ name: f.name, webkitRelativePath: f.webkitRelativePath || f.name, content: ev.target.result });
                renderWsFileList(toRead);
            };
            reader.readAsText(f);
        });
    }

    let wsFilesBuffer = [];
    function renderWsFileList(files) {
        wsFilesBuffer = files;
        DOM.wsFileList.innerHTML = files.map(f => `<div class="ws-file-item"><i data-lucide="file-text" style="width:12px;height:12px;"></i> ${esc(f.webkitRelativePath || f.name)}</div>`).join('');
        renderIcons(DOM.wsFileList);
    }

    function saveWorkspace() {
        const name = DOM.wsNameInput.value.trim() || 'Workspace';
        const ws = { id: Date.now().toString(), name, files: [...wsFilesBuffer] };
        workspaces.push(ws);
        DOM.workspaceModal.classList.remove('active');
        DOM.wsNameInput.value = '';
        DOM.wsFileList.innerHTML = '';
        wsFilesBuffer = [];
        renderWorkspacesSidebar();
        activateWorkspace(ws);
    }

    function renderWorkspacesSidebar() {
        if (!workspaces.length) { DOM.workspacesSec.style.display = 'none'; return; }
        DOM.workspacesSec.style.display = 'block';
        DOM.workspacesList.innerHTML = '';
        workspaces.forEach(ws => {
            const el = document.createElement('div');
            el.className = 'ws-sidebar-item';
            el.innerHTML = `<i data-lucide="package" style="width:12px;height:12px;"></i><span>${esc(ws.name)}</span>`;
            el.onclick = () => activateWorkspace(ws);
            DOM.workspacesList.appendChild(el);
            renderIcons(el);
        });
    }

    function activateWorkspace(ws) {
        activeWorkspace = ws;
        DOM.activeWorkspaceBar.style.display = 'flex';
        DOM.activeWorkspaceName.textContent = ws.name;
        DOM.workspaceHint.textContent = `Workspace "${ws.name}" (${ws.files.length} files) active — AI has full file context.`;
        DOM.workspaceHint.style.display = 'block';
    }

    function deactivateWorkspace() {
        activeWorkspace = null;
        DOM.activeWorkspaceBar.style.display = 'none';
        DOM.workspaceHint.style.display = 'none';
    }

    function buildWorkspaceContext() {
        if (!activeWorkspace) return null;
        const lines = [`[Workspace: ${activeWorkspace.name}]`];
        activeWorkspace.files.forEach(f => {
            lines.push(`\n[File: ${f.webkitRelativePath || f.name}]`);
            lines.push(f.content);
        });
        return lines.join('\n');
    }

    async function exportWorkspace() {
        if (!activeWorkspace || !window.JSZip) return;
        const zip = new JSZip();
        activeWorkspace.files.forEach(f => { zip.file(f.webkitRelativePath || f.name, f.content); });
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = activeWorkspace.name + '.zip'; a.click();
        URL.revokeObjectURL(url);
    }

    // ════════════════════════════════════════════════════════════
    //  10. CANVAS
    // ════════════════════════════════════════════════════════════
    function switchCanvasTab(tab) {
        const isPreview = tab === 'preview';
        DOM.canvasIframe.style.display = isPreview ? 'block' : 'none';
        DOM.canvasCodeView.style.display = isPreview ? 'none' : 'block';
        DOM.canvasTabPreview.classList.toggle('active', isPreview);
        DOM.canvasTabCode.classList.toggle('active', !isPreview);
    }

    function detectCanvasContent(text) {
        // Full HTML document or multiple code blocks
        if (/<html[\s\S]*>/i.test(text)) return { type: 'html', code: text };
        const codeBlocks = [...text.matchAll(/```(\w*)\n([\s\S]*?)```/g)];
        if (codeBlocks.length >= 1) {
            const lang = codeBlocks[0][1].toLowerCase();
            if (['html', 'css', 'js', 'javascript', 'svg'].includes(lang)) {
                return { type: lang, code: codeBlocks[0][2] };
            }
        }
        return null;
    }

    function openCanvas(code, type) {
        currentCanvasCode = code;
        DOM.canvasCodeContent.textContent = code;
        // Build preview
        let html = code;
        if (type !== 'html') {
            html = type === 'svg'
                ? `<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;">${code}</body></html>`
                : `<html><head><style>body{margin:0;background:#111;color:#fff;font-family:sans-serif;}</style></head><body><script type="module">${code}<\/script></body></html>`;
        }
        DOM.canvasIframe.srcdoc = html;
        DOM.canvasPanel.style.display = 'flex';
        DOM.canvasOpenBtn.style.display = 'flex';
        switchCanvasTab('preview');
    }

    // ════════════════════════════════════════════════════════════
    //  11. RENDERING
    // ════════════════════════════════════════════════════════════
    function scrollDown() { DOM.messages.scrollTop = DOM.messages.scrollHeight; }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    function appendMessage(role, content, thinking = null) {
        DOM.emptyState.style.display = 'none';
        if (role === 'user') {
            const d = document.createElement('div');
            d.className = 'message user';
            // Use marked for user messages too so markdown works
            d.innerHTML = `<div class="message-content"><div class="response-body">${marked.parse(content || '')}</div></div>`;
            DOM.messages.appendChild(d);
        } else {
            const tpl = $('thinking-template');
            const clone = tpl.content.cloneNode(true);
            const msgDiv = clone.querySelector('.message');
            const tb = msgDiv.querySelector('.thinking-block');
            const tbody = msgDiv.querySelector('.thinking-body');
            const rb = msgDiv.querySelector('.response-body');

            if (thinking && thinking.trim()) {
                tb.style.display = 'block';
                tbody.textContent = thinking;
            } else {
                tb.style.display = 'none';
            }

            const clean = processMemoryTags(content || '');
            rb.innerHTML = (typeof marked !== 'undefined') ? marked.parse(clean) : esc(clean);

            // Wire message actions
            wireMessageActions(msgDiv, content, thinking);

            DOM.messages.appendChild(msgDiv);
            renderIcons(msgDiv);

            // Check for canvas content
            const canvas = detectCanvasContent(content || '');
            if (canvas) {
                msgDiv.querySelector('.canvas-btn').style.display = 'flex';
                msgDiv.querySelector('.canvas-btn').addEventListener('click', () => openCanvas(canvas.code, canvas.type));
                DOM.canvasOpenBtn.style.display = 'flex';
            }
        }
        scrollDown();
    }

    function wireMessageActions(msgDiv, content, thinking) {
        const copyBtn = msgDiv.querySelector('.copy-btn');
        const retryBtn = msgDiv.querySelector('.retry-btn');
        const prevBtn = msgDiv.querySelector('.prev-response-btn');
        const nextBtn = msgDiv.querySelector('.next-response-btn');
        const counter = msgDiv.querySelector('.response-counter');
        const rb = msgDiv.querySelector('.response-body');
        const tb = msgDiv.querySelector('.thinking-body');

        // Versions: store all retried responses
        const versions = [{ content, thinking }];
        let vIdx = 0;

        function showVersion(i) {
            vIdx = i;
            const v = versions[i];
            const clean = processMemoryTags(v.content || '');
            rb.innerHTML = marked ? marked.parse(clean) : esc(clean);
            if (v.thinking) { msgDiv.querySelector('.thinking-block').style.display = 'block'; tb.textContent = v.thinking; }
            else { msgDiv.querySelector('.thinking-block').style.display = 'none'; }
            counter.textContent = `${vIdx + 1} / ${versions.length}`;
            prevBtn.disabled = vIdx === 0;
            nextBtn.disabled = vIdx === versions.length - 1;
            renderIcons(msgDiv);
        }

        if (copyBtn) copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(versions[vIdx].content || '');
            copyBtn.innerHTML = '<i data-lucide="check" style="width:12px;height:12px;"></i>';
            renderIcons(copyBtn);
            setTimeout(() => { copyBtn.innerHTML = '<i data-lucide="copy" style="width:12px;height:12px;"></i>'; renderIcons(copyBtn); }, 1500);
        });

        if (retryBtn) retryBtn.addEventListener('click', async () => {
            // Get the user message before this one
            const allMsgs = [...DOM.messages.querySelectorAll('.message')];
            const myIdx = allMsgs.indexOf(msgDiv);
            const userMsgBefore = allMsgs.slice(0, myIdx).reverse().find(m => m.classList.contains('user'));
            if (!userMsgBefore) return;
            const userText = userMsgBefore.querySelector('.response-body')?.textContent || '';
            const newResp = await streamRetry(userText, rb, tb, msgDiv);
            if (newResp) {
                versions.push(newResp);
                showVersion(versions.length - 1);
                const pag = msgDiv.querySelector('.response-pagination');
                if (pag) pag.style.display = 'flex';
            }
        });

        if (prevBtn) prevBtn.addEventListener('click', () => showVersion(Math.max(0, vIdx - 1)));
        if (nextBtn) nextBtn.addEventListener('click', () => showVersion(Math.min(versions.length - 1, vIdx + 1)));
    }

    async function streamRetry(userText, rb, tb, msgDiv) {
        const model = DOM.modelSelector.dataset.value || 'glm-5';
        const token = session?.access_token;
        rb.innerHTML = '<span class="streaming-cursor">▋</span>';
        let full = '';
        let thinkText = '';
        try {
            const payload = [{ role: 'user', content: userText }];
            const res = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ model, messages: payload, stream: true })
            });
            if (!res.ok) { rb.innerHTML = '<p style="color:var(--red)">Retry failed.</p>'; return null; }
            const reader = res.body.getReader();
            const dec = new TextDecoder();
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = dec.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
                    try {
                        const d = JSON.parse(line.slice(6));
                        full += d.choices?.[0]?.delta?.content || '';
                        const p = extractThink(full);
                        if (p.think !== null) {
                            thinkText = p.think;
                            if (p.rest) { rb.innerHTML = marked.parse(p.rest) + '<span class="streaming-cursor">▋</span>'; }
                            tb.textContent = p.think;
                            msgDiv.querySelector('.thinking-block').style.display = 'block';
                        } else {
                            rb.innerHTML = marked.parse(full) + '<span class="streaming-cursor">▋</span>';
                        }
                        scrollDown();
                    } catch (_) { }
                }
            }
            const fp = extractThink(full);
            rb.innerHTML = marked.parse(processMemoryTags(fp.rest || full));
            return { content: fp.rest || full, thinking: fp.think };
        } catch (err) {
            rb.innerHTML = `<p style="color:var(--red)">Error: ${err.message}</p>`;
            return null;
        }
    }

    function extractThink(text) {
        const m = text.match(/<think>([\s\S]*?)<\/think>/);
        if (m) return { think: m[1].trim(), rest: text.replace(/<think>[\s\S]*?<\/think>/, '').trim() };
        if (text.includes('<think>')) return { think: text.split('<think>')[1].trim(), rest: '' };
        return { think: null, rest: text };
    }

    // ════════════════════════════════════════════════════════════
    //  12. SEND MESSAGE + STREAM
    // ════════════════════════════════════════════════════════════
    async function doSend() {
        const text = DOM.textarea.value.trim();
        if (!text || isSending) return;
        if (!session) { showAuthMsg('Please log in first.'); DOM.authOverlay.classList.add('active'); return; }

        isSending = true;
        const model = DOM.modelSelector.dataset.value || 'glm-5';
        DOM.textarea.value = '';
        DOM.textarea.style.height = 'auto';
        DOM.sendBtn.style.opacity = '0.5';

        if (!currentChatId) await createChat(text);

        // Append user message
        const userDiv = document.createElement('div');
        userDiv.className = 'message user';
        userDiv.innerHTML = `<div class="message-content"><div class="response-body">${marked ? marked.parse(text) : esc(text)}</div></div>`;
        DOM.emptyState.style.display = 'none';
        DOM.messages.appendChild(userDiv);
        await saveMsg('user', text);

        // Assistant placeholder
        const tpl = $('thinking-template');
        const clone = tpl.content.cloneNode(true);
        const aDiv = clone.querySelector('.message');
        const tb = aDiv.querySelector('.thinking-block');
        const tbody = aDiv.querySelector('.thinking-body');
        const rb = aDiv.querySelector('.response-body');
        const dot = aDiv.querySelector('.pulse-dot');
        // Show thinking by default as requested
        tb.style.display = 'block';
        tb.setAttribute('open', '');
        tbody.textContent = 'Thinking...';
        rb.innerHTML = '<span class="streaming-cursor">▋</span>';
        DOM.messages.appendChild(aDiv);
        renderIcons(aDiv);
        scrollDown();

        // Build messages payload
        const payload = [];
        const memCtx = buildMemoryContext();
        const wsCtx = buildWorkspaceContext();
        if (memCtx) payload.push({ role: 'system', content: memCtx });
        if (wsCtx) payload.push({ role: 'system', content: wsCtx });
        DOM.messages.querySelectorAll('.message').forEach(node => {
            if (node === aDiv || node === userDiv) return;
            const isUser = node.classList.contains('user');
            const c = node.querySelector('.response-body')?.textContent || '';
            if (c) payload.push({ role: isUser ? 'user' : 'assistant', content: c });
        });
        payload.push({ role: 'user', content: text });

        try {
            const token = session.access_token;
            const res = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ model, messages: payload, stream: true })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: { message: 'Request failed' } }));
                tb.style.display = 'none';
                rb.innerHTML = `<p style="color:var(--red)">Error: ${err.error?.message || 'Request failed'}</p>`;
                isSending = false;
                DOM.sendBtn.style.opacity = '1';
                return;
            }

            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let full = '';
            tbody.textContent = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = dec.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
                    try {
                        const d = JSON.parse(line.slice(6));
                        const tok = d.choices?.[0]?.delta?.content;
                        if (!tok) continue;
                        full += tok;
                        const p = extractThink(full);
                        if (p.think !== null) {
                            // Model is thinking
                            tb.style.display = 'block';
                            tbody.textContent = p.think;
                            if (p.rest) {
                                dot.style.animation = 'none'; dot.style.background = '#888';
                                rb.innerHTML = marked.parse(p.rest) + '<span class="streaming-cursor">▋</span>';
                            } else {
                                rb.innerHTML = '<span class="streaming-cursor">▋</span>';
                            }
                        } else {
                            // Normal response — no <think> tag yet
                            // But we keep the thinking block open with "Thinking..." until we get response text
                            if (full.trim()) {
                                tb.style.display = 'none';
                                rb.innerHTML = marked.parse(full) + '<span class="streaming-cursor">▋</span>';
                            } else {
                                tb.style.display = 'block';
                                tbody.textContent = 'Thinking...';
                            }
                        }
                        scrollDown();
                    } catch (_) { }
                }
            }

            // Finalize — remove streaming cursor cleanly
            dot.style.animation = 'none'; dot.style.background = '#888';
            const fp = extractThink(full);
            const finalContent = processMemoryTags(fp.rest || full);

            if (fp.think !== null && fp.think.trim()) {
                // Keep thinking block visible but collapse it
                tb.style.display = 'block';
                tb.removeAttribute('open');
                tbody.textContent = fp.think;
                rb.innerHTML = marked.parse(finalContent || '');
                await saveMsg('assistant', finalContent, fp.think);
            } else {
                tb.style.display = 'none';
                rb.innerHTML = marked.parse(finalContent || '');
                await saveMsg('assistant', finalContent, null);
            }

            wireMessageActions(aDiv, finalContent, fp.think);
            renderIcons(aDiv);

            // Check for canvas
            const canvas = detectCanvasContent(finalContent);
            if (canvas) {
                aDiv.querySelector('.canvas-btn').style.display = 'flex';
                aDiv.querySelector('.canvas-btn').addEventListener('click', () => openCanvas(canvas.code, canvas.type));
                DOM.canvasOpenBtn.style.display = 'flex';
            }

        } catch (err) {
            tb.style.display = 'none';
            rb.innerHTML = `<p style="color:var(--red)">Network Error: ${err.message}</p>`;
        }

        isSending = false;
        DOM.sendBtn.style.opacity = '1';
        scrollDown();
    }

    // ════════════════════════════════════════════════════════════
    //  13. LIVE UPDATE BANNER
    // ════════════════════════════════════════════════════════════
    async function initVersionCheck() {
        try {
            const res = await fetch('/v1/version');
            const { version } = await res.json();
            deployVersion = version;
        } catch (_) { }

        setInterval(async () => {
            try {
                const res = await fetch('/v1/version');
                const { version } = await res.json();
                if (deployVersion && version !== deployVersion) {
                    DOM.updateBanner.style.display = 'flex';
                }
            } catch (_) { }
        }, 60000);
    }

    // ════════════════════════════════════════════════════════════
    //  HELPERS
    // ════════════════════════════════════════════════════════════
    function showAuthMsg(msg, ok = false) {
        if (!DOM.authError) return;
        DOM.authError.textContent = msg;
        DOM.authError.style.color = ok ? '#4ade80' : '#f87171';
    }

    function setBtn(btn, loading, text) {
        if (!btn) return;
        btn.disabled = loading;
        btn.style.opacity = loading ? '0.6' : '1';
        if (text !== undefined) btn.textContent = text;
    }

    function renderIcons(root) {
        try { if (window.lucide) lucide.createIcons(root ? { nodes: [root] } : undefined); } catch (_) { }
    }

    // ════════════════════════════════════════════════════════════
    //  BOOT
    // ════════════════════════════════════════════════════════════
    wireButtons();
    renderIcons(document.body);
    checkRoute();
    initVersionCheck();
    initSupabase();

})();
