'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Ticket, Lock, Eye, EyeOff, CheckCircle2, Sun, Moon } from 'lucide-react';
import { login } from '@/api/auth';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useThemeStore } from '@/store/theme-store';

type LoginForm = z.infer<ReturnType<typeof buildLoginSchema>>;

// Dictionnaire de traductions bilingue FR / EN
const TRANSLATIONS = {
  FR: {
    heroTitle: 'Plateforme de billetterie de stade',
    heroSub: 'Billetterie, cartographie 2D, guichet, contrôle d’accès et Business Intelligence — une seule plateforme pour opérer votre enceinte de A à Z.',
    loginTitle: 'Connexion sécurisée',
    loginSub: 'Accédez à votre espace de gestion',
    usernameLabel: 'Identifiant',
    usernamePlaceholder: 'admin@eticket.pro',
    passwordLabel: 'Mot de passe',
    forgotPassword: 'Mot de passe oublié ?',
    rememberMe: 'Se souvenir de moi',
    submitBtn: 'Se connecter',
    submittingBtn: 'Connexion en cours...',
    serverStatus: 'Serveur Central Opérationnel',
    rights: 'Somayar. Tous droits réservés.',
    minUsernameErr: 'Minimum 3 caractères',
    minPasswordErr: 'Minimum 6 caractères',
    showPassword: 'Afficher',
    hidePassword: 'Masquer',
    tags: ['RBAC', 'Cartographie 2D', 'POS', 'E-Ticket-Access', 'BI Report'],
    loginSuccess: 'Connexion réussie',
    loginError: 'Connexion impossible. Vérifiez vos identifiants.',
  },
  EN: {
    heroTitle: 'Stadium Ticketing Platform',
    heroSub: 'Ticketing, 2D mapping, POS, access control, and Business Intelligence — a single platform to operate your venue from A to Z.',
    loginTitle: 'Secure Login',
    loginSub: 'Access your management workspace',
    usernameLabel: 'Username / Email',
    usernamePlaceholder: 'admin@eticket.pro',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot password?',
    rememberMe: 'Remember me',
    submitBtn: 'Sign In',
    submittingBtn: 'Signing in...',
    serverStatus: 'Central Server Operational',
    rights: 'Somayar. All rights reserved.',
    minUsernameErr: 'Minimum 3 characters',
    minPasswordErr: 'Minimum 6 characters',
    showPassword: 'Show',
    hidePassword: 'Hide',
    tags: ['RBAC', '2D Mapping', 'POS', 'E-Ticket-Access', 'BI Report'],
    loginSuccess: 'Successfully logged in',
    loginError: 'Unable to login. Please check your credentials.',
  },
};

function buildLoginSchema(dict: typeof TRANSLATIONS['FR']) {
  return z.object({
    username: z.string().min(3, dict.minUsernameErr).max(50),
    password: z.string().min(6, dict.minPasswordErr).max(128),
  });
}

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [lang, setLang] = useState<'FR' | 'EN'>('FR');

  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  const t = TRANSLATIONS[lang];
  const loginSchema = useMemo(() => buildLoginSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'admin',
      password: '',
    },
  });

  const onSubmit = async (values: LoginForm) => {
    setIsSubmitting(true);
    try {
      const result = await login(values.username, values.password);
      setTokens(result.accessToken, result.refreshToken);
      toast.success(t.loginSuccess);
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.loginError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-slate-950">
      {/* Volet Gauche : 62% de largeur pour l'image du stade */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-slate-950 p-8 sm:p-12 lg:w-[62%] lg:min-h-screen">
        {/* Photo du Stade panoramique grand angle avec vue du haut */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
          style={{ backgroundImage: "url('/images/stadium-night.jpg')" }}
        />
        
        {/* Gradients pour révéler la profondeur du stade et la ville en arrière-plan */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-slate-950/40" />
        <div className="absolute inset-0 bg-emerald-950/15 mix-blend-color-dodge" />

        {/* Logo Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00875A] text-white shadow-lg shadow-black/40 ring-1 ring-white/20">
            <Ticket className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">E-Ticket Pro</span>
        </div>

        {/* Titre & Description multilingue */}
        <div className="relative z-10 mt-16 lg:mt-0 max-w-lg">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl drop-shadow-lg transition-all duration-300">
            {t.heroTitle}
          </h1>
          <p className="mt-3 text-sm text-slate-200 leading-relaxed font-normal drop-shadow transition-all duration-300">
            {t.heroSub}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {t.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-black/40 backdrop-blur-md px-3.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/15"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Volet Droit : Formulaire avec traductions & fonctionnalités avancées */}
      <div className="relative flex w-full flex-1 flex-col justify-between bg-[#F8F9FA] dark:bg-[#090d16] px-6 py-10 sm:px-10 lg:w-[38%] lg:px-14 lg:py-14 transition-colors">
        {/* Sélecteur de Langue & Mode Sombre */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-amber-400 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all shadow-xs"
            title="Thème Clair / Sombre"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="inline-flex items-center rounded-full bg-slate-200/80 dark:bg-slate-700/80 p-0.5 ring-1 ring-slate-300/60 dark:ring-slate-600/60">
            <button
              type="button"
              onClick={() => setLang('FR')}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                lang === 'FR'
                  ? 'bg-[#00875A] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLang('EN')}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                lang === 'EN'
                  ? 'bg-[#00875A] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Zone Formulaire */}
        <div className="my-auto mx-auto w-full max-w-sm py-4">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t.loginTitle}</h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t.loginSub}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Champ Identifiant */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.usernameLabel}
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder={t.usernamePlaceholder}
                className={`w-full rounded-xl border-0 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white text-sm ring-1 ring-inset ${
                  errors.username ? 'ring-red-500 focus:ring-red-600' : 'ring-slate-300/80 dark:ring-slate-600/80 focus:ring-2 focus:ring-[#00875A]'
                } placeholder:text-slate-400 focus:outline-none transition-all shadow-xs`}
                {...register('username')}
              />
              {errors.username && (
                <p className="mt-1.5 text-xs font-medium text-red-600">{errors.username.message}</p>
              )}
            </div>

            {/* Champ Mot de passe avec oeil de visibilité */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.passwordLabel}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#00875A] hover:underline transition-colors"
                >
                  {t.forgotPassword}
                </Link>
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full rounded-xl border-0 bg-white dark:bg-slate-900 pl-4 pr-11 py-2.5 text-slate-900 dark:text-white text-sm ring-1 ring-inset ${
                    errors.password ? 'ring-red-500 focus:ring-red-600' : 'ring-slate-300/80 dark:ring-slate-600/80 focus:ring-2 focus:ring-[#00875A]'
                  } placeholder:text-slate-400 focus:outline-none transition-all shadow-xs`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none p-1"
                  title={showPassword ? t.hidePassword : t.showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Case à cocher "Se souvenir de moi" */}
            <div className="flex items-center gap-2.5 pt-1">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-[#00875A] focus:ring-[#00875A] cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                {t.rememberMe}
              </label>
            </div>

            {/* Bouton de Connexion */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00875A] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#00875A]/20 hover:bg-[#00754e] active:bg-[#006342] transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00875A]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{t.submittingBtn}</span>
                </div>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>{t.submitBtn}</span>
                </>
              )}
            </button>
          </form>

          {/* Badge d'État du Serveur (Live Status) */}
          <div className="mt-8 flex items-center justify-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 ring-1 ring-emerald-200/60 w-max mx-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">{t.serverStatus}</span>
          </div>
        </div>

        {/* Footer discret */}
        <div className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} E-Ticket Pro · {t.rights}
        </div>
      </div>
    </div>
  );
}



