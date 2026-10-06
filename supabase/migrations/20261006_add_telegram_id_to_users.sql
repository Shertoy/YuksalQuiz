-- Migration: 20261006_add_telegram_id_to_users.sql
-- Adds telegram_id column and indices for fast and accurate Telegram ID queries

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_id TEXT;

-- Backfill telegram_id from id where id is numeric or starts with tg_
UPDATE public.users
SET telegram_id = regexp_replace(id, '^tg_', '')
WHERE telegram_id IS NULL AND (id ~ '^[0-9]+$' OR id ~ '^tg_[0-9]+$');

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users (telegram_id);
