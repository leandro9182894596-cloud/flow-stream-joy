CREATE TABLE public.app_config (
  id integer PRIMARY KEY DEFAULT 1,
  logo text,
  background text,
  banner text,
  banner_link text,
  dns_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_password text NOT NULL DEFAULT 'admin',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_config_single_row CHECK (id = 1)
);

GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;