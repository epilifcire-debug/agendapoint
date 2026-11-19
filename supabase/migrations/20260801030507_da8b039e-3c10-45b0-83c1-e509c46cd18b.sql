ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_fit text NOT NULL DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS cover_zoom integer NOT NULL DEFAULT 100;