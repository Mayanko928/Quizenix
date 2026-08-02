DROP POLICY IF EXISTS "profiles read all" ON public.profiles;
CREATE POLICY "profiles read own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);