'use client';

import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useMemo, useState } from 'react';
import type { Database } from '../../supabase/database.types';

/**
 * Supabase Auth의 영문 에러 메시지를 메시지 카탈로그 키로 옮긴다.
 * 매핑되지 않은 코드는 공급자 원문을 그대로 보여준다(번역할 근거가 없다).
 */
const AUTH_ERROR_KEYS: [RegExp, string][] = [
  [/invalid login credentials/i, 'errInvalidCredentials'],
  [/email not confirmed/i, 'errEmailNotConfirmed'],
  [/user already registered/i, 'errAlreadyRegistered'],
  [/password should be at least/i, 'errPasswordShort'],
];

export default function LoginScreen() {
  const router = useRouter();
  const t = useTranslations('login');
  const translateAuthError = (message: string): string => {
    const hit = AUTH_ERROR_KEYS.find(([re]) => re.test(message));
    return hit ? t(hit[1]) : message;
  };
  // Vercel에 NEXT_PUBLIC_SUPABASE_* 미설정 시 createClient throw로 페이지가 죽지 않게 한다.
  const supabase = useMemo<SupabaseClient<Database> | null>(() => {
    if (!getSupabasePublicEnv()) return null;
    return createClient();
  }, []);
  const [isLoginTab, setIsLoginTab] = useState(true);
  // 개발 편의용 프리필은 두지 않는다 — 시드 관리자 계정이 배포 화면에 그대로
  // 노출돼 누구나 엔터만 치면 로그인이 시도되는 상태였다(코드리뷰 H-5).
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!supabase) {
      setErrorMsg(t('errNoEnv'));
      return;
    }
    if (!email) {
      setErrorMsg(t('errEmailRequired'));
      return;
    }
    if (password.length < 6) {
      setErrorMsg(t('errPasswordShort'));
      return;
    }

    setSubmitting(true);
    if (isLoginTab) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(translateAuthError(error.message));
        setSubmitting(false);
        return;
      }
      setSuccessMsg(t('okLogin'));
      router.push('/');
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        setErrorMsg(translateAuthError(error.message));
        setSubmitting(false);
        return;
      }
      if (data.session) {
        setSuccessMsg(t('okRegister'));
        router.push('/');
        router.refresh();
      } else {
        // 이메일 확인이 켜진 경우 세션 없이 확인 메일 발송
        setSubmitting(false);
        setSuccessMsg(t('okConfirmSent'));
      }
    }
  };

  const handleSocialLogin = async (provider: 'google') => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!supabase) {
      setErrorMsg(t('errNoEnvSocial'));
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // 성공 시 브라우저가 provider로 리다이렉트됨. 실패(미설정 등) 시 안내.
    if (error) {
      setErrorMsg(t('errSocialUnavailable', { provider, message: error.message }));
    }
  };

  return (
    <div
      id="login-screen"
      className="flex items-center justify-center min-h-[80vh] px-4 py-12 bg-cream"
    >
      <div
        id="login-card"
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-brown-light overflow-hidden transform hover:scale-[1.01] transition-transform duration-300"
      >
        {/* Top styling strip */}
        <div className="h-2 bg-gradient-to-r from-terracotta via-gold to-terracotta" />

        <div className="p-6 sm:p-10">
          {/* Logo & Subtext */}
          <div className="text-center mb-8">
            <span className="font-serif text-3xl font-bold tracking-tight text-brown">
              Atelier Crème
            </span>
            <p className="text-xs text-brown-medium mt-2 font-sans tracking-wide">
              {t('tagline')}
            </p>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-brown-light mb-6">
            <button
              id="tab-login"
              type="button"
              onClick={() => {
                setIsLoginTab(true);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                isLoginTab
                  ? 'text-terracotta border-b-2 border-terracotta'
                  : 'text-brown-medium/60 hover:text-brown-medium'
              }`}
            >
              {t('tabLogin')}
            </button>
            <button
              id="tab-register"
              type="button"
              onClick={() => {
                setIsLoginTab(false);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                !isLoginTab
                  ? 'text-terracotta border-b-2 border-terracotta'
                  : 'text-brown-medium/60 hover:text-brown-medium'
              }`}
            >
              {t('tabRegister')}
            </button>
          </div>

          {/* Feedback message */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 font-sans">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded text-xs text-emerald-700 font-sans flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name - Register only */}
            {!isLoginTab && (
              <div>
                <label className="block text-xs font-semibold text-brown uppercase tracking-wide mb-1.5">
                  {t('nameLabel')}
                </label>
                <div className="relative">
                  <input
                    id="input-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('namePlaceholder')}
                    className="w-full px-4 py-2.5 bg-cream/40 border border-brown-light rounded-lg text-sm text-brown placeholder:text-brown-medium/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-brown uppercase tracking-wide mb-1.5">
                {t('emailLabel')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brown-medium/50">
                  <Mail size={16} />
                </span>
                <input
                  id="input-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creme@ateliercreme.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-cream/40 border border-brown-light rounded-lg text-sm text-brown placeholder:text-brown-medium/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-brown uppercase tracking-wide">
                  {t('passwordLabel')}
                </label>
                {isLoginTab && (
                  <a
                    href="#find-pw"
                    onClick={(e) => {
                      e.preventDefault();
                      setErrorMsg(t('notImplementedResetPw'));
                    }}
                    className="text-[10px] text-gold hover:underline font-medium"
                  >
                    {t('forgotPassword')}
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brown-medium/50">
                  <Lock size={16} />
                </span>
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-cream/40 border border-brown-light rounded-lg text-sm text-brown placeholder:text-brown-medium/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-brown-medium/50 hover:text-brown-medium cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me checkbox - Login only */}
            {isLoginTab && (
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="w-4 h-4 rounded text-terracotta border-brown-light focus:ring-terracotta accent-terracotta"
                  />
                  <span className="text-xs text-brown-medium">{t('rememberMe')}</span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="btn-auth-submit"
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-terracotta hover:bg-terracotta-deep disabled:opacity-60 disabled:cursor-not-allowed text-cream font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {submitting
                ? t('submitting')
                : isLoginTab
                  ? t('submitLogin')
                  : t('submitRegister')}
            </button>
          </form>

          {/* Social Logins */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brown-light" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-brown-medium/50 font-medium">
                {t('orSocial')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Google Login */}
            <button
              id="google-login-btn"
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center gap-2 py-2 px-3 border border-brown-light rounded-lg bg-white hover:bg-cream/40 transition-colors text-xs font-medium text-brown cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69c-.29 1.5-.143 2.78-1.566 3.73l2.451 1.91c1.433-1.32 2.26-3.26 2.26-5.56z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.83-2.97c-1.08.72-2.45 1.16-4.1 1.16-3.16 0-5.83-2.14-6.79-5.01H1.28v3.09C3.25 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.21 14.27a7.08 7.08 0 010-4.54V6.64H1.28a11.936 11.936 0 000 10.72l3.93-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.93 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.64l3.93 3.09c.96-2.87 3.63-5.01 6.79-5.01z"
                />
              </svg>
              {t('googleLogin')}
            </button>
          </div>

          <p className="text-[10px] text-center text-brown-medium/60 mt-8 leading-normal">
            {t.rich('terms', {
              terms: (chunks) => (
                <a href="#terms" className="underline hover:text-terracotta">
                  {chunks}
                </a>
              ),
              privacy: (chunks) => (
                <a href="#privacy" className="underline hover:text-terracotta">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
