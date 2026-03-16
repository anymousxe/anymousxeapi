/* ════════════════════════════════════════════════════════════════
   chat.js  v8.0  - AnyLM Chat
   Full feature set: streaming, thinking, folders, memory,
   workspaces, canvas, admin override, copy/retry, live update,
   API key management, credit display, web search toggle
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
        signupUsername: $('auth-username'),
        signupEmail: $('auth-email'),
        signupPass: $('auth-password'),
        loginEmail: $('login-email'),
        loginPass: $('login-password'),
        btnSignupSubmit: $('btn-signup-submit'),
        btnLoginSubmit: $('btn-login-submit'),
        linkToLogin: $('link-to-login'),
        linkToSignup: $('link-to-signup'),
        authError: $('auth-error'),
        // settings
        settingsOverlay: $('settings-overlay'),
        settingsUsername: $('settings-username'),
        settingsEmail: $('settings-email'),
        settingsNewEmail: $('settings-new-email'),
        settingsNewPass: $('settings-new-password'),
        btnCloseSettings: $('settings-close-btn'),
        editUsernameBtn: $('btn-update-username'),
        editEmailInitBtn: $('btn-change-email-init'),
        editEmailSubmitBtn: $('btn-update-email-submit'),
        editPassBtn: $('btn-settings-update-pass'),
        userInfoClick: $('user-info-click'),
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
        apiKeysBtn: $('api-keys-btn'),
        memorySec: $('memory-section'),
        memoryList: $('memory-list'),
        workspacesSec: $('workspaces-section'),
        workspacesList: $('workspaces-list'),
        // credits
        creditWidget: $('credit-widget'),
        creditBalance: $('credit-balance'),
        addCreditsBtn: $('add-credits-btn'),
        // overlays
        plansOverlay: $('plans-overlay'),
        adminOverlay: $('admin-dashboard-overlay'),
        devPlanSelect: $('dev-plan-select'),
        devPlanApply: $('dev-plan-apply'),
        closeAdmin: document.querySelector('.close-admin'),
        keysOverlay: $('keys-overlay'),
        keyLabelInput: $('key-label-input'),
        createKeyBtn: $('create-key-btn'),
        keysList: $('keys-list'),
        keysCloseBtn: $('keys-close-btn'),
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
        webSearchToggle: $('web-search-toggle'),
        textarea: $('chat-textarea'),
        sendBtn: $('send-btn'),
        messages: $('messages-container'),
        emptyState: $('empty-state'),
        workspaceHint: $('workspace-hint'),
        activeWorkspaceBar: $('active-workspace-bar'),
        activeWorkspaceName: $('active-workspace-name'),
        wsExportBtn: $('workspace-export-btn'),
        wsDeactivateBtn: $('workspace-deactivate-btn'),
        // deposit
        depositOverlay: $('deposit-overlay'),
        closeDeposit: document.querySelector('.close-deposit'),
        depositAmount: $('custom-deposit-amount'),
        depositPresets: document.querySelectorAll('.deposit-preset-btn'),
        summaryCredits: $('summary-credits'),
        summaryTotal: $('summary-total'),
        cryptoDepositBtn: $('btn-crypto-deposit'),
        // admin
        adminUserEmail: $('admin-user-email'),
        adminCreditAmt: $('admin-credit-amount'),
        adminGrantBtn: $('admin-grant-credits-btn'),
        adminPlanSelect: $('admin-plan-select'),
        adminGrantPlanBtn: $('admin-grant-plan-btn'),
    };

    // ─── State ──────────────────────────────────────────────────
    let sb = null;
    let session = null;
    let currentPlan = 'free';
    let effectivePlan = 'free';
    let isAdmin = false;
    let currentChatId = null;
    let pendingEmail = '';
    let pendingPassword = '';
    let memories = [];
    let workspaces = [];
    let activeWorkspace = null;
    let currentCanvasCode = '';
    let deployVersion = null;
    let isSending = false;
    let webSearchEnabled = false;

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
    //  1. WIRE ALL BUTTONS
    // ════════════════════════════════════════════════════════════
    function wireButtons() {
        // ── Auth toggles ──
        if (DOM.linkToLogin) DOM.linkToLogin.addEventListener('click', e => { e.preventDefault(); window.history.pushState({}, '', '/chat/login'); checkRoute(); });
        if (DOM.linkToSignup) DOM.linkToSignup.addEventListener('click', e => { e.preventDefault(); window.history.pushState({}, '', '/chat/signup'); checkRoute(); });
        if (DOM.btnSignupSubmit) DOM.btnSignupSubmit.addEventListener('click', doSignup);
        if (DOM.btnLoginSubmit) DOM.btnLoginSubmit.addEventListener('click', doLogin);

        // ── Account Settings ──
        if (DOM.userInfoClick) DOM.userInfoClick.addEventListener('click', openSettings);
        if (DOM.userAvatar) DOM.userAvatar.addEventListener('click', openSettings);
        if (DOM.btnCloseSettings) DOM.btnCloseSettings.addEventListener('click', () => hideOverlay(DOM.settingsOverlay));
        if (DOM.editUsernameBtn) DOM.editUsernameBtn.addEventListener('click', updateUsername);
        if (DOM.editEmailInitBtn) DOM.editEmailInitBtn.addEventListener('click', () => {
            $('email-change-step-2').style.display = 'block';
            DOM.editEmailInitBtn.style.display = 'none';
        });
        if (DOM.editEmailSubmitBtn) DOM.editEmailSubmitBtn.addEventListener('click', updateEmail);
        if (DOM.editPassBtn) DOM.editPassBtn.addEventListener('click', updatePassword);

        // ── Plans ──
        if (DOM.upgradeBtn) DOM.upgradeBtn.addEventListener('click', e => { e.preventDefault(); showOverlay(DOM.plansOverlay); });
        document.querySelectorAll('.close-plans').forEach(btn => btn.addEventListener('click', () => hideOverlay(DOM.plansOverlay)));

        // ── Credits ──
        if (DOM.addCreditsBtn) DOM.addCreditsBtn.addEventListener('click', () => showOverlay(DOM.depositOverlay));
        if (DOM.closeDeposit) DOM.closeDeposit.addEventListener('click', () => hideOverlay(DOM.depositOverlay));

        // ── API Keys ──
        if (DOM.apiKeysBtn) DOM.apiKeysBtn.addEventListener('click', () => { showOverlay(DOM.keysOverlay); loadApiKeys(); });
        if (DOM.keysCloseBtn) DOM.keysCloseBtn.addEventListener('click', () => hideOverlay(DOM.keysOverlay));
        if (DOM.createKeyBtn) DOM.createKeyBtn.addEventListener('click', createApiKey);
        if (DOM.logoutBtn) DOM.logoutBtn.addEventListener('click', e => { e.preventDefault(); doLogout(); });

        // ── Admin Dashboard ──
        if (DOM.devSettingsBtn) DOM.devSettingsBtn.addEventListener('click', () => showOverlay(DOM.adminOverlay));
        if (DOM.closeAdmin) DOM.closeAdmin.addEventListener('click', () => hideOverlay(DOM.adminOverlay));
        
        // ── Dev settings (simulated role) ──
        if (DOM.devPlanApply) DOM.devPlanApply.addEventListener('click', () => {
            effectivePlan = DOM.devPlanSelect.value;
            DOM.userPlanBadge.textContent = effectivePlan.charAt(0).toUpperCase() + effectivePlan.slice(1) + ' Plan (Simulated)';
            updateModelLocks();
            hideOverlay(DOM.adminOverlay);
        });

        // ── Update banner ──
        if (DOM.dismissBanner) DOM.dismissBanner.addEventListener('click', () => { DOM.updateBanner.style.display = 'none'; });

        // ── Web Search toggle ──
        if (DOM.webSearchToggle) DOM.webSearchToggle.addEventListener('click', () => {
            webSearchEnabled = !webSearchEnabled;
            DOM.webSearchToggle.classList.toggle('active', webSearchEnabled);
        });

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
                    selectModelOption(opt);
                });
            });
            DOM.modelList.querySelectorAll('.model-locked').forEach(opt => {
                opt.addEventListener('click', e => {
                    e.stopPropagation();
                    if (canUseModel(opt.dataset.plan)) {
                        selectModelOption(opt);
                    } else {
                        showOverlay(DOM.plansOverlay);
                    }
                });
            });
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
        if (DOM.newWorkspaceBtn) DOM.newWorkspaceBtn.addEventListener('click', () => showOverlay(DOM.workspaceModal));
        if (DOM.wsCancelBtn) DOM.wsCancelBtn.addEventListener('click', () => hideOverlay(DOM.workspaceModal));
        if (DOM.wsImportBtn) DOM.wsImportBtn.addEventListener('click', () => DOM.wsFileInput.click());
        if (DOM.wsFileInput) DOM.wsFileInput.addEventListener('change', handleWorkspaceFiles);
        if (DOM.wsSaveBtn) DOM.wsSaveBtn.addEventListener('click', saveWorkspace);
        if (DOM.wsExportBtn) DOM.wsExportBtn.addEventListener('click', exportWorkspace);
        if (DOM.wsDeactivateBtn) DOM.wsDeactivateBtn.addEventListener('click', deactivateWorkspace);

        // ── Dev Settings ──
        if (DOM.devSettingsBtn) DOM.devSettingsBtn.addEventListener('click', () => showOverlay(DOM.devOverlay));
        if (DOM.devSettingsClose) DOM.devSettingsClose.addEventListener('click', () => hideOverlay(DOM.devOverlay));

        // ── Canvas ──
        if (DOM.canvasClose) DOM.canvasClose.addEventListener('click', () => { DOM.canvasPanel.style.display = 'none'; });
        if (DOM.canvasOpenBtn) DOM.canvasOpenBtn.addEventListener('click', () => { DOM.canvasPanel.style.display = 'flex'; });
        if (DOM.canvasTabPreview) DOM.canvasTabPreview.addEventListener('click', () => switchCanvasTab('preview'));
        if (DOM.canvasTabCode) DOM.canvasTabCode.addEventListener('click', () => switchCanvasTab('code'));

        // ── MoonPay upgrade buttons ──
        if (DOM.cryptoDepositBtn) {
            DOM.cryptoDepositBtn.addEventListener('click', () => {
                const amount = DOM.depositAmount.value;
                alert(`MoonPay checkout for $${amount} deposit coming soon! Contact anymousxe.info@gmail.com for manual top-up.`);
            });
        }
        
        if (DOM.depositAmount) {
            DOM.depositAmount.addEventListener('input', () => {
                const val = parseFloat(DOM.depositAmount.value) || 0;
                if (DOM.summaryCredits) DOM.summaryCredits.textContent = `$${val.toFixed(2)}`;
                if (DOM.summaryTotal) DOM.summaryTotal.textContent = `$${val.toFixed(2)}`;
                DOM.depositPresets.forEach(btn => btn.classList.remove('active'));
            });
        }

        DOM.depositPresets.forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.value;
                DOM.depositAmount.value = val;
                DOM.depositPresets.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const numericVal = parseFloat(val);
                if (DOM.summaryCredits) DOM.summaryCredits.textContent = `$${numericVal.toFixed(2)}`;
                if (DOM.summaryTotal) DOM.summaryTotal.textContent = `$${numericVal.toFixed(2)}`;
            });
        });
    }

    function selectModelOption(opt) {
        DOM.modelList.querySelectorAll('.model-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        DOM.selectedName.textContent = opt.dataset.name;
        DOM.modelSelector.dataset.value = opt.dataset.value;
        DOM.modelList.classList.remove('show');
        DOM.modelHeader.classList.remove('active');
    }

    // ── Overlay helpers ──
    function showOverlay(el) { if (el) el.classList.add('active'); }
    function hideOverlay(el) { if (el) el.classList.remove('active'); }

    // ════════════════════════════════════════════════════════════
    //  2. ROUTING
    // ════════════════════════════════════════════════════════════
    function hideAuthSteps() {
        DOM.stepSignup.style.display = 'none';
        DOM.stepLogin.style.display = 'none';
        DOM.authError.textContent = '';
    }

    function checkRoute() {
        const path = window.location.pathname;
        if (session && (path === '/chat/login' || path === '/chat/signup')) {
            window.history.replaceState({}, '', '/chat');
            showApp();
            return;
        }
        hideAuthSteps();
        if (path === '/chat/login') {
            showOverlay(DOM.authOverlay);
            DOM.stepLogin.style.display = 'block';
            DOM.authTitle.textContent = 'Welcome Back';
            DOM.authSubtitle.textContent = 'Enter your details to log in.';
        } else if (path === '/chat/signup') {
            showOverlay(DOM.authOverlay);
            DOM.stepSignup.style.display = 'block';
            DOM.authTitle.textContent = 'Create Account';
            DOM.authSubtitle.textContent = 'Join AnymousxeAPI today.';
        } else if (!session) {
            showOverlay(DOM.authOverlay);
            DOM.stepLogin.style.display = 'block';
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
            if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) { showAuthMsg('Missing Supabase config.'); showOverlay(DOM.authOverlay); return; }
            if (!window.supabase) { showAuthMsg('Supabase lib failed to load.'); showOverlay(DOM.authOverlay); return; }
            sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
            const { data: { session: s } } = await sb.auth.getSession();
            if (s) { onLogin(s); } else { showOverlay(DOM.authOverlay); }
            sb.auth.onAuthStateChange((evt, s2) => {
                if (s2) onLogin(s2); else { session = null; showOverlay(DOM.authOverlay); }
            });
        } catch (err) {
            console.error('[chat] Supabase init failed:', err);
            showOverlay(DOM.authOverlay);
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
        if (password.length < 6) return showAuthMsg('Password must be at least 6 characters.');
        if (!sb) return showAuthMsg('Supabase not connected.');
        setBtn(DOM.btnSignupSubmit, true, 'Creating...');
        try {
            // Use custom backend endpoint to bypass email confirmation
            const res = await fetch('/v1/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Signup failed');

            // After auto-confirmed signup, log in immediately
            const { error: loginError } = await sb.auth.signInWithPassword({ email, password });
            if (loginError) throw loginError;

            showToast('Account created! Welcome.');
            DOM.authOverlay.classList.remove('active');
            window.history.replaceState({}, '', '/chat');
        } catch (err) {
            console.error('Signup error:', err);
            showAuthMsg(err.message);
        } finally {
            setBtn(DOM.btnSignupSubmit, false, 'Create Account');
        }
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


    async function doLogout() {
        if (!sb) return;
        localStorage.clear();
        sessionStorage.clear();
        await sb.auth.signOut();
        window.location.href = '/chat/login';
    }


    // ── Account Management ──
    async function openSettings() {
        if (!session) return;
        DOM.settingsUsername.value = session.user.user_metadata?.username || '';
        DOM.settingsEmail.value = session.user.email;
        $('email-change-step-2').style.display = 'none';
        DOM.editEmailInitBtn.style.display = 'block';
        showOverlay(DOM.settingsOverlay);
        loadUsage();
    }

    async function loadUsage() {
        const list = $('usage-list');
        if (!list || !session) return;
        try {
            const res = await fetch('/v1/user/usage', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'Failed load');
            
            list.innerHTML = data.stats.filter(s => s.limit !== 'Unlimited' || s.usage > 0).map(s => {
                const limitNum = parseInt(s.limit) || 0;
                const perc = limitNum > 0 ? Math.min(100, (s.usage / limitNum) * 100) : 0;
                const color = perc >= 100 ? '#f87171' : (perc >= 80 ? '#fbbf24' : '#60a5fa');
                
                return `
                    <div class="usage-item" style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                        <span style="color:var(--text); font-weight:500;">${s.name}</span>
                        <span style="color:var(--text-muted); font-family:var(--font-mono); font-size:0.75rem;">${s.usage} / ${s.limit}</span>
                    </div>
                    <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden; margin-top:4px;">
                        <div style="height:100%; width:${s.limit === 'Unlimited' ? '100%' : perc + '%'}; background:${s.limit === 'Unlimited' ? '#4ade80' : color}; transition: width 0.3s ease;"></div>
                    </div>
                `;
            }).join('') || '<div class="muted small text-center" style="margin-top:10px;">No usage recorded today.</div>';
        } catch (err) {
            list.innerHTML = `<div class="error-msg small">${err.message}</div>`;
        }
    }

    async function updateUsername() {
        const username = DOM.settingsUsername.value.trim();
        if (!username) return alert('Username required');
        setBtn(DOM.editUsernameBtn, true, '...');
        try {
            const { error } = await sb.auth.updateUser({ data: { username } });
            if (error) throw error;
            alert('Username updated!');
            onLogin({...session, user: {...session.user, user_metadata: {...session.user.user_metadata, username}}});
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setBtn(DOM.editUsernameBtn, false, 'Update');
        }
    }

    async function updateEmail() {
        const newEmail = DOM.settingsNewEmail.value.trim();
        if (!newEmail) return alert('New email required');
        setBtn(DOM.editEmailSubmitBtn, true, '...');
        try {
            const { error } = await sb.auth.updateUser({ email: newEmail });
            if (error) throw error;
            alert('Verification emails sent to both your old and new addresses. Please confirm both to complete the change.');
            $('email-change-step-2').style.display = 'none';
            DOM.editEmailInitBtn.style.display = 'block';
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setBtn(DOM.editEmailSubmitBtn, false, 'Verify New Email');
        }
    }

    async function updatePassword() {
        const password = DOM.settingsNewPass.value.trim();
        if (!password || password.length < 6) return alert('Password must be at least 6 characters');
        setBtn(DOM.editPassBtn, true, '...');
        try {
            const { error } = await sb.auth.updateUser({ password });
            if (error) throw error;
            alert('Password updated!');
            DOM.settingsNewPass.value = '';
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setBtn(DOM.editPassBtn, false, 'Change Password');
        }
    }

    // ════════════════════════════════════════════════════════════
    //  5. ON LOGIN
    // ════════════════════════════════════════════════════════════
    function onLogin(s) {
        session = s;
        hideOverlay(DOM.authOverlay);
        const user = s.user;
        DOM.userEmail.textContent = user.email;
        DOM.userAvatar.textContent = user.email.charAt(0).toUpperCase();

        const username = user.user_metadata?.username || '';
        isAdmin = false;
        fetch('/v1/admin/check', {
            headers: { 'Authorization': `Bearer ${s.access_token}` },
        }).then(res => res.json()).then(data => {
            isAdmin = !!data.admin;
            if (isAdmin) {
                effectivePlan = 'admin';
                DOM.userPlanBadge.textContent = 'Admin';
                DOM.devSettingsBtn.style.display = 'flex';
                updateModelLocks();
            }
        }).catch(err => console.error('[chat] Admin check failed:', err));

        loadPlan(user);
        loadChats();
        loadFolders();
        loadWorkspaces();
        loadMemory();
        loadCredits();
        checkRoute();
    }

    function showApp() { hideOverlay(DOM.authOverlay); }

    async function loadPlan(user) {
        if (isAdmin) {
            currentPlan = 'admin';
            effectivePlan = 'admin';
            DOM.userPlanBadge.textContent = 'Admin';
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
    //  5b. CREDITS
    // ════════════════════════════════════════════════════════════
    async function loadCredits() {
        if (!session) return;
        try {
            const res = await fetch('/v1/credits', {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (res.ok) {
                const data = await res.json();
                DOM.creditBalance.textContent = '$' + (data.balance || 0).toFixed(2);
            }
        } catch (err) {
            console.error('[chat] loadCredits error:', err);
        }
    }

    // ════════════════════════════════════════════════════════════
    //  5c. API KEYS
    // ════════════════════════════════════════════════════════════
    async function loadApiKeys() {
        if (!session) return;
        DOM.keysList.innerHTML = '<div class="muted small" style="padding:8px;text-align:center;">Loading...</div>';
        try {
            const res = await fetch('/v1/keys', {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (!res.ok) throw new Error('Failed to load keys');
            const data = await res.json();
            renderApiKeys(data.keys || []);
        } catch (err) {
            console.error('[chat] loadApiKeys error:', err);
            DOM.keysList.innerHTML = `<div class="muted small" style="padding:12px;text-align:center;color:var(--red);">Failed to load keys: ${err.message}</div>`;
        }
    }

    function renderApiKeys(keys) {
        if (!keys.length) {
            DOM.keysList.innerHTML = '<div class="muted small" style="padding:12px;text-align:center;">No API keys yet. Create one above.</div>';
            return;
        }
        DOM.keysList.innerHTML = '';
        keys.forEach(k => {
            const el = document.createElement('div');
            el.className = 'key-item';
            el.innerHTML = `
                <div class="key-item-info">
                    <div class="key-item-label">${esc(k.label)}</div>
                    <div class="key-item-value">${esc(k.key)}</div>
                </div>
                <div class="key-item-actions">
                    <button class="key-action-btn copy" title="Copy key"><i data-lucide="copy" style="width:14px;height:14px;"></i></button>
                    <button class="key-action-btn delete" title="Delete key"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                </div>`;
            el.querySelector('.copy').addEventListener('click', () => {
                navigator.clipboard.writeText(k.key);
                el.querySelector('.copy').innerHTML = '<i data-lucide="check" style="width:14px;height:14px;"></i>';
                renderIcons(el);
                setTimeout(() => { el.querySelector('.copy').innerHTML = '<i data-lucide="copy" style="width:14px;height:14px;"></i>'; renderIcons(el); }, 1500);
            });
            el.querySelector('.delete').addEventListener('click', () => deleteApiKey(k.id));
            DOM.keysList.appendChild(el);
            renderIcons(el);
        });
    }

    async function createApiKey() {
        const label = DOM.keyLabelInput.value.trim() || 'default';
        setBtn(DOM.createKeyBtn, true, 'Creating...');
        try {
            const res = await fetch('/v1/keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ label }),
            });
            if (!res.ok) throw new Error('Failed to create key');
            DOM.keyLabelInput.value = '';
            await loadApiKeys();
        } catch (err) {
            alert('Failed to create key: ' + err.message);
        }
        setBtn(DOM.createKeyBtn, false, 'Create Key');
    }

    async function deleteApiKey(id) {
        if (!confirm('Delete this API key?')) return;
        try {
            await fetch(`/v1/keys/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            await loadApiKeys();
        } catch (err) {
            alert('Failed to delete key');
        }
    }

    // ════════════════════════════════════════════════════════════
    //  6. CHAT DB
    // ════════════════════════════════════════════════════════════
    async function loadChats() {
        if (!session || !sb) return;
        try {
            const { data, error } = await sb.from('chats').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
            // Clear but keep the recents label if no folders are loaded yet
            if (!document.querySelector('.folder-item')) {
                DOM.historyList.innerHTML = '<div class="history-label">Recents</div>';
            }
            if (error) { console.error('[chat] loadChats error:', error); return; }
            if (data) {
                data.forEach(c => {
                    if (c.folder_id) {
                        const folderEl = document.querySelector(`.folder-item[data-folder-id="${c.folder_id}"]`);
                        if (folderEl) {
                            appendChatItem(c, folderEl.querySelector('.folder-chats'));
                            return;
                        }
                    }
                    appendChatItem(c);
                });
            }
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
        
        // Drag to folder
        el.draggable = true;
        el.addEventListener('dragstart', e => {
            e.dataTransfer.setData('chatId', chat.id);
            el.classList.add('dragging');
        });
        el.addEventListener('dragend', () => el.classList.remove('dragging'));

        container.appendChild(el);
        renderIcons(el);
    }

    async function createChat(firstMsg) {
        if (!sb || !session) return null;
        const title = firstMsg.substring(0, 35) + (firstMsg.length > 35 ? '...' : '');
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
    
    async function loadFolders() {
        if (!sb || !session) return;
        DOM.historyList.innerHTML = '<div class="history-label">Recents</div>'; // Reset
        try {
            const { data, error } = await sb.from('chat_folders').select('*').eq('user_id', session.user.id);
            if (error) throw error;
            if (data) data.forEach(f => renderFolder(f));
        } catch (e) { console.error('[chat] loadFolders error:', e); }
    }

    function renderFolder(folder) {
        const tpl = $('folder-template');
        const clone = tpl.content.cloneNode(true);
        const el = clone.querySelector('.folder-item');
        el.dataset.folderId = folder.id;
        el.querySelector('.folder-name').textContent = folder.name;
        el.querySelector('.folder-header').addEventListener('click', () => {
            el.classList.toggle('open');
            renderIcons(el);
        });
        
        // Drop zone for chats
        el.addEventListener('dragover', e => {
            e.preventDefault();
            el.classList.add('drag-over');
        });
        el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
        el.addEventListener('drop', async e => {
            e.preventDefault();
            el.classList.remove('drag-over');
            const chatId = e.dataTransfer.getData('chatId');
            if (chatId) {
                await moveChatToFolder(chatId, folder.id);
                // Move the DOM element
                const chatEl = document.querySelector(`.history-item[data-chat-id="${chatId}"]`);
                if (chatEl) el.querySelector('.folder-chats').appendChild(chatEl);
            }
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
            addMemory(match[1] || 'general', match[2].trim());
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

    async function saveWorkspace() {
        const name = DOM.wsNameInput.value.trim() || 'Workspace';
        const ws = { id: Date.now().toString(), name, files: [...wsFilesBuffer] };
        workspaces.push(ws);
        hideOverlay(DOM.workspaceModal);
        DOM.wsNameInput.value = '';
        DOM.wsFileList.innerHTML = '';
        wsFilesBuffer = [];
        renderWorkspacesSidebar();
        activateWorkspace(ws);
        if (sb) await sb.from('user_workspaces').insert([{ user_id: session.user.id, name, files: ws.files }]);
    }
    
    async function loadWorkspaces() {
        if (!sb || !session) return;
        try {
            const { data, error } = await sb.from('user_workspaces').select('*').eq('user_id', session.user.id);
            if (error) throw error;
            workspaces = data || [];
            renderWorkspacesSidebar();
        } catch (e) { console.error('[chat] loadWorkspaces error:', e); }
    }

    function renderWorkspacesSidebar() {
        if (!workspaces.length) { DOM.workspacesSec.style.display = 'none'; return; }
        DOM.workspacesSec.style.display = 'block';
        DOM.workspacesList.innerHTML = '';
        workspaces.forEach(ws => {
            const el = document.createElement('div');
            el.className = 'ws-sidebar-item';
            el.innerHTML = `
                <div class="ws-item-ctrl">
                    <i data-lucide="package" style="width:12px;height:12px;"></i>
                    <span>${esc(ws.name)}</span>
                </div>
                <button class="item-action-btn delete-ws-btn" title="Delete"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
            `;
            el.querySelector('.ws-item-ctrl').onclick = () => activateWorkspace(ws);
            el.querySelector('.delete-ws-btn').onclick = (e) => { e.stopPropagation(); deleteWorkspace(ws.id, el); };
            DOM.workspacesList.appendChild(el);
            renderIcons(el);
        });
    }

    async function deleteWorkspace(id, el) {
        if (!confirm('Delete this workspace?')) return;
        if (sb) await sb.from('user_workspaces').delete().eq('id', id);
        workspaces = workspaces.filter(w => w.id !== id);
        el.remove();
        if (activeWorkspace && activeWorkspace.id === id) deactivateWorkspace();
    }

    function activateWorkspace(ws) {
        activeWorkspace = ws;
        DOM.activeWorkspaceBar.style.display = 'flex';
        DOM.activeWorkspaceName.textContent = ws.name;
        DOM.workspaceHint.textContent = `Workspace "${ws.name}" (${ws.files.length} files) active.`;
        DOM.workspaceHint.style.display = 'block';
    }

    function deactivateWorkspace() {
        activeWorkspace = null;
        DOM.activeWorkspaceBar.style.display = 'none';
        DOM.workspaceHint.style.display = 'none';
    }

    function exportWorkspace() {
        if (!activeWorkspace) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeWorkspace));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", activeWorkspace.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".json");
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
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
            wireMessageActions(msgDiv, content, thinking);
            DOM.messages.appendChild(msgDiv);
            renderIcons(msgDiv);

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
        const model = DOM.modelSelector.dataset.value || 'gemini-3.1-flash-lite-preview-thinking';
        const token = session?.access_token;
        rb.innerHTML = '<span class="streaming-cursor">&#9611;</span>';
        let full = '';
        let thinkText = '';
        try {
            const payload = [{ role: 'user', content: userText }];
            const reqBody = { model, messages: payload, stream: true };
            if (webSearchEnabled) reqBody.web_search = true;

            const res = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(reqBody),
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
                            rb.innerHTML = (p.rest ? marked.parse(p.rest) : '') + '<span class="streaming-cursor">&#9611;</span>';
                            tb.textContent = p.think;
                            msgDiv.querySelector('.thinking-block').style.display = 'block';
                        } else {
                            rb.innerHTML = marked.parse(full) + '<span class="streaming-cursor">&#9611;</span>';
                        }
                        scrollDown();
                    } catch (_) {}
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
        // More robust regex to match <think> or <thought> tags (case-insensitive)
        const m = text.match(/<think>([\s\S]*?)<\/think>/i) || text.match(/<thought>([\s\S]*?)<\/thought>/i);
        if (m) {
            const thinkContent = m[1].trim();
            const restContent = text.replace(m[0], '').trim();
            return { think: thinkContent, rest: restContent };
        }
        
        // Handle unclosed tags while streaming
        const openMatch = text.match(/<think>([\s\S]*)/i) || text.match(/<thought>([\s\S]*)/i);
        if (openMatch) {
            const index = openMatch.index;
            const thinkContent = openMatch[1].trim();
            const restContent = text.substring(0, index).trim();
            return { think: thinkContent, rest: restContent };
        }
        
        return { think: null, rest: text };
    }

    // ════════════════════════════════════════════════════════════
    //  12. SEND MESSAGE + STREAM
    // ════════════════════════════════════════════════════════════
    async function doSend() {
        const text = DOM.textarea.value.trim();
        if (!text || isSending) return;
        if (!session) { showAuthMsg('Please log in first.'); showOverlay(DOM.authOverlay); return; }

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
        tb.style.display = 'none';
        tbody.textContent = '';
        rb.innerHTML = '<span class="streaming-cursor">&#9611;</span>';
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
            const reqBody = { model, messages: payload, stream: true };
            if (webSearchEnabled) reqBody.web_search = true;

            const res = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(reqBody),
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
            let tokenQueue = [];
            let isReading = true;

            const drainQueue = () => {
                if (!isReading && tokenQueue.length === 0) return;
                
                // Adaptive processing speed: process more tokens if the queue is backing up
                const toProcess = tokenQueue.length > 20 ? Math.ceil(tokenQueue.length / 5) : 1;
                const chunkTokens = tokenQueue.splice(0, toProcess).join('');

                if (chunkTokens) {
                    full += chunkTokens;
                    const p = extractThink(full);

                    if (p.think !== null) {
                        tb.style.display = 'block';
                        if (!tb.hasAttribute('open')) tb.setAttribute('open', '');
                        tbody.textContent = p.think;
                        
                        // User requested "grey block" loading thingy (dot) to look nice
                        dot.style.display = 'inline-block';
                        dot.style.animation = 'pulse 1.5s infinite'; 
                        
                        if (p.rest) {
                            rb.innerHTML = marked.parse(p.rest) + '<span class="streaming-cursor">&#9611;</span>';
                        } else {
                            rb.innerHTML = '<span class="streaming-cursor">&#9611;</span>';
                        }
                    } else {
                        tb.style.display = 'none';
                        rb.innerHTML = marked.parse(full) + '<span class="streaming-cursor">&#9611;</span>';
                    }
                    scrollDown();
                }

                if (isReading || tokenQueue.length > 0) {
                    setTimeout(drainQueue, tokenQueue.length > 50 ? 8 : 16);
                }
            };

            setTimeout(drainQueue, 0);

            let sseBuffer = '';
            let hasOpenedThink = false;
            let hasClosedThink = false;
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) { 
                    isReading = false; 
                    if (hasOpenedThink && !hasClosedThink) tokenQueue.push('</think>');
                    break; 
                }
                sseBuffer += dec.decode(value, { stream: true });

                let nlIdx;
                while ((nlIdx = sseBuffer.indexOf('\n')) >= 0) {
                    const line = sseBuffer.slice(0, nlIdx).trim();
                    sseBuffer = sseBuffer.slice(nlIdx + 1);
                    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
                    try {
                        const d = JSON.parse(line.slice(6));
                        const reasonTok = d.choices?.[0]?.delta?.reasoning_content;
                        if (reasonTok) {
                            if (!hasOpenedThink) {
                                tokenQueue.push('<think>');
                                hasOpenedThink = true;
                            }
                            tokenQueue.push(reasonTok);
                        } else {
                            const tok = d.choices?.[0]?.delta?.content;
                            if (tok) {
                                if (hasOpenedThink && !hasClosedThink) {
                                    tokenQueue.push('</think>');
                                    hasClosedThink = true;
                                }
                                tokenQueue.push(tok);
                            }
                        }
                    } catch (_) {}
                }
            }

            while (tokenQueue.length > 0) {
                await new Promise(r => setTimeout(r, 16));
            }

            dot.style.animation = 'none'; dot.style.background = '#888';
            const fp = extractThink(full);
            const finalContent = processMemoryTags(fp.rest || full);

            if (fp.think !== null && fp.think.trim()) {
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

            const canvas = detectCanvasContent(finalContent);
            if (canvas) {
                aDiv.querySelector('.canvas-btn').style.display = 'flex';
                aDiv.querySelector('.canvas-btn').addEventListener('click', () => openCanvas(canvas.code, canvas.type));
                DOM.canvasOpenBtn.style.display = 'flex';
            }

            // Refresh credits after request
            loadCredits();

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
        } catch (_) {}

        setInterval(async () => {
            try {
                const res = await fetch('/v1/version');
                const { version } = await res.json();
                if (deployVersion && version !== deployVersion) {
                    DOM.updateBanner.style.display = 'flex';
                }
            } catch (_) {}
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

    function showToast(msg, duration = 3000) {
        console.log('Toast:', msg);
        const container = $('toast-container');
        if (!container) {
            console.warn('Toast container missing');
            return;
        }
        const toast = document.createElement('div');
        toast.className = 'toast show';
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    function renderIcons(root) {
        try { if (window.lucide) lucide.createIcons(root ? { nodes: [root] } : undefined); } catch (_) {}
    }

    // ════════════════════════════════════════════════════════════
    //  BOOT
    // ════════════════════════════════════════════════════════════
    wireButtons();
    renderIcons(document.body);
    checkRoute();
    initVersionCheck();
    initSupabase();

    if (DOM.adminGrantBtn) DOM.adminGrantBtn.onclick = adminGrantCredits;
    if (DOM.adminGrantPlanBtn) DOM.adminGrantPlanBtn.onclick = adminGrantPlan;

    async function moveChatToFolder(chatId, folderId) {
        if (!sb) return;
        await sb.from('chats').update({ folder_id: folderId }).eq('id', chatId);
        showToast('Chat moved to folder');
    }

    async function adminGrantCredits() {
        if (!session) return;
        const identifier = DOM.adminUserEmail.value.trim();
        const amount = parseFloat(DOM.adminCreditAmt.value);
        if (!identifier || isNaN(amount)) return showToast('Invalid input');

        setBtn(DOM.adminGrantBtn, true, 'Granting...');

        try {
            const body = identifier.includes('@') ? { email: identifier, amount } : { username: identifier, amount };
            const res = await fetch('/v1/admin/add-credits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (res.ok) {
                showToast(`Granted ${amount} credits to ${identifier}`);
                DOM.adminCreditAmt.value = '';
                loadCredits(); // Refresh local UI
            } else {
                showToast('Failed: ' + (data.error?.message || 'Unknown error'));
            }
        } catch (err) {
            showToast('Network error: ' + err.message);
        } finally {
            setBtn(DOM.adminGrantBtn, false, 'Grant');
        }
    }

    async function adminGrantPlan() {
        if (!session) return;
        const identifier = DOM.adminUserEmail.value.trim();
        const plan = DOM.adminPlanSelect.value;
        if (!identifier) return showToast('Invalid input');

        setBtn(DOM.adminGrantPlanBtn, true, 'Applying...');

        try {
            const body = identifier.includes('@') ? { email: identifier, plan } : { username: identifier, plan };
            const res = await fetch('/v1/admin/set-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (res.ok) {
                showToast(`Set plan to ${plan} for ${identifier}`);
                loadCredits(); // Refresh local UI
            } else {
                showToast('Failed: ' + (data.error?.message || 'Unknown error'));
            }
        } catch (err) {
            showToast('Network error: ' + err.message);
        } finally {
            setBtn(DOM.adminGrantPlanBtn, false, 'Apply');
        }
    }

})();
