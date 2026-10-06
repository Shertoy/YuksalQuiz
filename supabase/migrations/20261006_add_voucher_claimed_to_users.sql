-- Migration: Add voucher_claimed to users table
-- Ensures users cannot reclaim initial starting voucher and maintains persistence across logins/syncs.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS voucher_claimed BOOLEAN DEFAULT false;

-- Create an index for quick checks if needed
CREATE INDEX IF NOT EXISTS idx_users_voucher_claimed ON public.users(voucher_claimed);
