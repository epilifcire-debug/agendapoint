ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS soundcloud text,
  ADD COLUMN IF NOT EXISTS twitter text;