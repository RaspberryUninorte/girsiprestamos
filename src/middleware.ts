import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase/server';
import { PUBLIC_PATHS, canAccess, homeFor, type Profile } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  // Las rutas de cron se autentican con CRON_SECRET (ver cada endpoint), no
  // con sesion de usuario: Vercel las llama sin cookies de navegador, asi
  // que el chequeo de sesion de abajo las redirigiria siempre a /login.
  if (context.url.pathname.startsWith('/api/cron/')) {
    return next();
  }

  const supabase = createSupabaseServerClient(context.cookies, context.request.headers);
  context.locals.supabase = supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  context.locals.user = user;

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, student_code, email, role')
      .eq('id', user.id)
      .single();
    profile = data as Profile | null;
  }
  context.locals.profile = profile;

  const pathname = context.url.pathname;
  // Una URL inexistente renderiza 404.astro: debe verse con o sin sesión,
  // en lugar de redirigir a /login o al inicio del rol.
  const isPublicPath = PUBLIC_PATHS.includes(pathname) || context.routePattern === '/404';

  if (!user && !isPublicPath) {
    return context.redirect('/login');
  }

  if (user && (pathname === '/login' || pathname === '/registro' || pathname === '/verificar')) {
    return context.redirect(homeFor(profile));
  }

  // El RLS ya impide que un estudiante lea o modifique datos ajenos; esto
  // ademas evita que vea las pantallas de admin.
  if (user && !isPublicPath && !canAccess(profile, pathname)) {
    return context.redirect(homeFor(profile));
  }

  return next();
});
