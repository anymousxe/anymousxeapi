-- AnyLM Database Schema (Supabase)
-- ═══════════════════════════════════════════════

-- 1. Users & Plan Identity
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'plus', 'pro', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. API Key Management
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL UNIQUE,
    label TEXT DEFAULT 'default',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    request_count INTEGER DEFAULT 0
);

-- 3. Balances & Credits
CREATE TABLE IF NOT EXISTS user_credits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance NUMERIC(20, 6) DEFAULT 2.000000,
    plan_expires_at TIMESTAMPTZ,
    monthly_allowance NUMERIC(20, 6) DEFAULT 0,
    last_refill_at TIMESTAMPTZ
);

-- 4. Chat History
CREATE TABLE IF NOT EXISTS chat_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES chat_folders(id) ON DELETE SET NULL,
    title TEXT DEFAULT 'New Chat',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    thinking_content TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. User Memory & Workspaces
CREATE TABLE IF NOT EXISTS user_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT DEFAULT 'general',
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    files JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Auth & Tokens
CREATE TABLE IF NOT EXISTS otp_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Transactions & Payments
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(20, 6) NOT NULL,
    balance_after NUMERIC(20, 6) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('usage', 'deposit', 'refill', 'admin_grant')),
    model TEXT,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moonpay_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    moonpay_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    amount_usd NUMERIC(12, 2) DEFAULT 0,
    status TEXT NOT NULL,
    plan TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════
-- Atomic Credit Deduction Function
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE new_balance NUMERIC;
BEGIN
    UPDATE user_credits SET balance = GREATEST(balance - p_amount, 0)
    WHERE user_id = p_user_id RETURNING balance INTO new_balance;
    IF NOT FOUND THEN
        INSERT INTO user_credits (user_id, balance) VALUES (p_user_id, GREATEST(2.0 - p_amount, 0))
        RETURNING balance INTO new_balance;
    END IF;
    RETURN new_balance;
END; $$;

-- ═══════════════════════════════════════════════
-- RLS Configuration
-- ═══════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moonpay_transactions ENABLE ROW LEVEL SECURITY;

-- Policies (Service Role gets full access, Users get own data)
DROP POLICY IF EXISTS "service_role_all" ON users;
CREATE POLICY "service_role_all" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all" ON user_api_keys;
CREATE POLICY "service_role_all" ON user_api_keys FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all" ON user_credits;
CREATE POLICY "service_role_all" ON user_credits FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all" ON chat_folders;
CREATE POLICY "service_role_all" ON chat_folders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all" ON chats;
CREATE POLICY "service_role_all" ON chats FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all" ON messages;
CREATE POLICY "service_role_all" ON messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all" ON user_memory;
CREATE POLICY "service_role_all" ON user_memory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all" ON user_workspaces;
CREATE POLICY "service_role_all" ON user_workspaces FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user_own_data" ON users;
CREATE POLICY "user_own_data" ON users FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_own_keys" ON user_api_keys;
CREATE POLICY "user_own_keys" ON user_api_keys FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_credits" ON user_credits;
CREATE POLICY "user_own_credits" ON user_credits FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_folders" ON chat_folders;
CREATE POLICY "user_own_folders" ON chat_folders FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_chats" ON chats;
CREATE POLICY "user_own_chats" ON chats FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_messages" ON messages;
CREATE POLICY "user_own_messages" ON messages FOR ALL USING (EXISTS (SELECT 1 FROM chats WHERE id = messages.chat_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "user_own_memory" ON user_memory;
CREATE POLICY "user_own_memory" ON user_memory FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_workspaces" ON user_workspaces;
CREATE POLICY "user_own_workspaces" ON user_workspaces FOR ALL USING (auth.uid() = user_id);
