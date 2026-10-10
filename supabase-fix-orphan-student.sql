-- One-off fix: a user created by hand in the Supabase dashboard (Authentication
-- -> Add user) has a login in auth.users but NO row in public.students. The app
-- only creates that row in its own /api/auth/register, so such a user is
-- invisible in the admin panel and cannot be given access.
--
-- Run in Supabase -> SQL Editor. Replace the email on the marked line (it
-- appears ONCE in each block). Run STEP 1 first and check the result.

-- STEP 1. Look before changing anything: is she in auth.users, and does she
-- already have a profile row?
select u.id, u.email, u.created_at,
       u.raw_user_meta_data->>'full_name' as name_in_auth,
       s.id is not null as has_profile,
       s.service_type, s.subscription_status, s.access_expires_at
from auth.users u
left join public.students s on s.id = u.id
where lower(u.email) = lower('STUDENT_EMAIL@gmail.com');   -- <-- her email

-- STEP 2 (paid access, the 10 000 ₽ two-year purchase). Creates the profile if
-- missing, then activates paid access exactly like a PIN activation does:
-- subscription_status = 'active', access window = 2 years from now.
-- full_name: taken from the auth metadata, or the part of the email before @.
-- Edit the name later in the admin panel if needed.
insert into public.students (id, email, full_name, role, service_type, subscription_status, pin_code, access_expires_at)
select u.id,
       lower(u.email),
       coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
       'student', 'diy', 'active', null, now() + interval '2 years'
from auth.users u
where lower(u.email) = lower('STUDENT_EMAIL@gmail.com')   -- <-- her email
on conflict (id) do update
  set subscription_status = 'active',
      access_expires_at   = now() + interval '2 years',
      pin_code            = null;

-- STEP 2 alternative: ONLY if she bought the premium tariff (personal support
-- by Iana), use this instead of the block above.
-- insert into public.students (id, email, full_name, role, service_type, subscription_status, pin_code, access_expires_at)
-- select u.id, lower(u.email),
--        coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
--        'student', 'premium', 'active', null, now() + interval '2 years'
-- from auth.users u
-- where lower(u.email) = lower('STUDENT_EMAIL@gmail.com')
-- on conflict (id) do update
--   set service_type = 'premium', subscription_status = 'active',
--       access_expires_at = now() + interval '2 years', pin_code = null;

-- STEP 3. Check: run STEP 1 again. Expect has_profile = true,
-- subscription_status = active, access_expires_at about two years from today.
-- She then logs out and back in (or refreshes) on app.kaykitay.ru.
