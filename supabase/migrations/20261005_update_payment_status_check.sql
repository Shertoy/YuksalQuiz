-- Migration: 20261005_update_payment_status_check.sql
-- Expands status CHECK constraint on payments table to support auto_approved, pending_manual, etc.

DO $$
BEGIN
    -- Drop existing status check constraints if present
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
    
    -- Add updated status check constraint supporting new workflows
    ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (
        status IN (
            'pending',
            'approved',
            'rejected',
            'auto_approved',
            'pending_manual',
            'manual_approved',
            'manual_rejected',
            'warn_reset'
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        -- If constraint recreation fails, ignore so it does not block operations
        NULL;
END $$;
