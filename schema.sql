-- AnyLM Database Schema (Supabase)
-- ═══════════════════════════════════════════════
-- This schema is designed for a fresh Supabase project.
-- Run this in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════

-- 1. Tables for API Key Management
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

CREATE INDEX IF NOT EXISTS idx_user_api_keys_key ON user_api_keys(key);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id);

-- 2. Tables for User Balances and Subscriptions
CREATE TABLE IF NOT EXISTS user_credits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance NUMERIC(20, 6) DEFAULT 2.000000, -- Default $2.00 for new users
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'plus', 'pro', 'admin')),
    plan_expires_at TIMESTAMPTZ,
    monthly_allowance NUMERIC(20, 6) DEFAULT 0,
    last_refill_at TIMESTAMPTZ
);

-- 3. Detailed Transaction Logs
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(20, 6) NOT NULL,
    balance_after NUMERIC(20, 6) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('usage', 'deposit', 'refill', 'admin_grant')),
    model TEXT,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    api_key_id UUID REFERENCES user_api_keys(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at);

-- 5. Payment Integration (MoonPay)
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
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    new_balance NUMERIC;
BEGIN
    UPDATE user_credits
    SET balance = GREATEST(balance - p_amount, 0)
    WHERE user_id = p_user_id
    RETURNING balance INTO new_balance;

    -- If no row existed, create one with default $2 minus deduction
    IF NOT FOUND THEN
        INSERT INTO user_credits (user_id, balance)
        VALUES (p_user_id, GREATEST(2.0 - p_amount, 0))
        RETURNING balance INTO new_balance;
    END IF;

    RETURN new_balance;
END;
$$;

-- ═══════════════════════════════════════════════
-- Row Level Security (RLS) Configuration
-- ═══════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moonpay_transactions ENABLE ROW LEVEL SECURITY;

-- 1. Service Role Permissions (Full Access for Backend)
CREATE POLICY "service_role_all" ON user_api_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON user_credits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON credit_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON moonpay_transactions FOR ALL USING (true) WITH CHECK (true);

-- 2. User-Specific Permissions (Read Only own data)
CREATE POLICY "users_read_own_keys" ON user_api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_read_own_credits" ON user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_read_own_transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════
-- Admin Note: anymousxe
-- ═══════════════════════════════════════════════
-- The application code in lib/auth.js automatically identifies 
-- anymousxe.info@gmail.com and 'anymousxe' as admin.
-- This bypasses credit checks while keeping the ledger clean.
