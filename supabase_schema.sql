-- ==========================================
-- PeerTrust v2 Supabase Database Schema
-- Place: Run inside Supabase SQL Editor
-- ==========================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Helper trigger function to update updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- 2. Profiles Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    role text NOT NULL CHECK (role IN ('buyer', 'seller', 'admin')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- 3. Wallets Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    available_balance numeric NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
    escrow_balance numeric NOT NULL DEFAULT 0 CHECK (escrow_balance >= 0),
    pending_withdrawal numeric NOT NULL DEFAULT 0 CHECK (pending_withdrawal >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- 4. Offers Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    price numeric NOT NULL CHECK (price >= 0),
    delivery_time text NOT NULL,
    category text NOT NULL,
    rating numeric NOT NULL DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5.0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- 5. Trades Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
    amount numeric NOT NULL CHECK (amount >= 0),
    status text NOT NULL DEFAULT 'created' CHECK (status IN (
        'created', 
        'funds_locked', 
        'seller_working', 
        'delivered', 
        'buyer_confirmed', 
        'completed', 
        'disputed', 
        'cancelled', 
        'refunded'
    )),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- 6. Wallet Transactions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    reference text NOT NULL UNIQUE,
    type text NOT NULL CHECK (type IN (
        'deposit', 
        'withdrawal', 
        'escrow_lock', 
        'escrow_release', 
        'escrow_refund', 
        'platform_fee', 
        'payout'
    )),
    amount numeric NOT NULL CHECK (amount >= 0),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'locked')),
    description text,
    created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 7. Escrow Transactions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    buyer_id uuid NOT NULL REFERENCES public.profiles(id),
    seller_id uuid NOT NULL REFERENCES public.profiles(id),
    amount numeric NOT NULL CHECK (amount >= 0),
    fee numeric NOT NULL DEFAULT 0 CHECK (fee >= 0),
    status text NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded')),
    created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 8. Disputes Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.disputes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    raised_by uuid NOT NULL REFERENCES public.profiles(id),
    reason text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
    resolution text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- 9. Notifications Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    read boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 10. Admin Action Logs Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL REFERENCES public.profiles(id),
    action text NOT NULL,
    target text,
    created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 11. Platform Settings Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_percentage numeric NOT NULL DEFAULT 1.5 CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
    min_trade_amount numeric NOT NULL DEFAULT 1000 CHECK (min_trade_amount >= 0),
    max_trade_amount numeric NOT NULL DEFAULT 5000000 CHECK (max_trade_amount >= min_trade_amount),
    demo_mode boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Prepopulate single Platform Settings Row
INSERT INTO public.platform_settings (fee_percentage, min_trade_amount, max_trade_amount, demo_mode)
VALUES (1.5, 1000, 5000000, true)
ON CONFLICT DO NOTHING;

-- ==========================================
-- 12. Triggers for updating timestamps
-- ==========================================
CREATE TRIGGER trigger_update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 13. Optimized Performance Indexes
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON public.offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON public.trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller_id ON public.trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_disputes_trade_id ON public.disputes(trade_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- ==========================================
-- 14. Row Level Security Policies
-- ==========================================

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------
CREATE POLICY "Allow public inserts during registration" 
ON public.profiles FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow profile owners to read their own record" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Allow profile owners to update their own record" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Allow admin role to view all profiles" 
ON public.profiles FOR SELECT 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Allow admin role to update all profiles" 
ON public.profiles FOR UPDATE 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ------------------------------------------
-- WALLETS POLICIES
-- ------------------------------------------
CREATE POLICY "Allow wallet inserts during registration" 
ON public.wallets FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow owners to view their own wallet" 
ON public.wallets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Allow owners to update their own wallet" 
ON public.wallets FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Allow admin to view all wallets" 
ON public.wallets FOR SELECT 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Allow admin to update all wallets" 
ON public.wallets FOR UPDATE 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
