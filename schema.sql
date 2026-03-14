-- AnyLM Database Schema (Supabase)
-- Run this in the Supabase SQL Editor

-- ═══════════════════════════════════════════════
-- User API Keys
-- ═══════════════════════════════════════════════
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

CREATE INDEX idx_user_api_keys_key ON user_api_keys(key);
CREATE INDEX idx_user_api_keys_user ON user_api_keys(user_id);

-- ═══════════════════════════════════════════════
-- User Credits
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_credits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance NUMERIC(12, 6) DEFAULT 2.000000,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'plus', 'pro')),
    plan_expires_at TIMESTAMPTZ,
    monthly_allowance NUMERIC(12, 6) DEFAULT 0,
    last_refill_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════
-- Credit Transactions
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 6) NOT NULL,
    balance_after NUMERIC(12, 6) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('usage', 'deposit', 'refill', 'admin_grant')),
    model TEXT,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    api_key_id UUID REFERENCES user_api_keys(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at);

-- ═══════════════════════════════════════════════
-- OTP Codes (for password reset and email verification)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_otp_codes_email ON otp_codes(email);

-- ═══════════════════════════════════════════════
-- MoonPay Transactions
-- ═══════════════════════════════════════════════
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

CREATE INDEX idx_moonpay_transactions_moonpay_id ON moonpay_transactions(moonpay_id);

-- ═══════════════════════════════════════════════
-- Stored Procedure: Atomic Credit Deduction
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
-- Enable RLS (Row Level Security)
-- ═══════════════════════════════════════════════
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moonpay_transactions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by Workers)
CREATE POLICY "service_role_all" ON user_api_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON user_credits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON credit_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON moonpay_transactions FOR ALL USING (true) WITH CHECK (true);

-- Users can read their own data
CREATE POLICY "users_read_own_keys" ON user_api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_read_own_credits" ON user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_read_own_transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
