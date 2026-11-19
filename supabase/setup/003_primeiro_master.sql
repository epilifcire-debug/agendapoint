-- Depois de criar sua conta (Authentication → Users → Add user, ou login pelo app),
-- troque o e-mail abaixo e rode para torná-la Administrador Master.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin_master'::public.app_role FROM auth.users WHERE email = 'SEU-EMAIL@exemplo.com'
ON CONFLICT DO NOTHING;
