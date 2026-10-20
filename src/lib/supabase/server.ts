import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const cookieOptions: CookieOptionsWithName = {
  path: '/',
};

export function createSupabaseServerClient(cookies: AstroCookies, headers: Headers) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return headers
            .get('cookie')
            ?.split(';')
            .map((cookie) => {
              const [name, ...rest] = cookie.trim().split('=');
              return { name, value: rest.join('=') };
            }) ?? [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, options);
          });
        },
      },
    },
  );
}
