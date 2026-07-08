'use client';

import { useRouter } from '@/i18n/navigation';
import { useAppStore } from '@/lib/store';
import { Check, Chrome, Compass, Eye, EyeOff, Lock, Mail, Sparkles, Star } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAppStore((s) => s.login);
  const onLoginSuccess = (email: string) => {
    login(email);
    router.push('/');
  };
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('baking.master@gmail.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('김베이커');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('이메일을 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    setErrorMsg('');
    if (isLoginTab) {
      setSuccessMsg('성공적으로 로그인되었습니다!');
      setTimeout(() => {
        onLoginSuccess(email);
      }, 800);
    } else {
      setSuccessMsg('회원가입이 완료되었습니다! 로그인 상태로 전환됩니다.');
      setTimeout(() => {
        onLoginSuccess(email);
      }, 1000);
    }
  };

  const handleSocialLogin = (provider: string) => {
    setSuccessMsg(`${provider} 간편 로그인으로 입장 중...`);
    setTimeout(() => {
      onLoginSuccess(`${provider.toLowerCase()}@ateliercreme.com`);
    }, 1000);
  };

  return (
    <div
      id="login-screen"
      className="flex items-center justify-center min-h-[80vh] px-4 py-12 bg-[#FAF4EA]"
    >
      <div
        id="login-card"
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#EFE8DC] overflow-hidden transform hover:scale-[1.01] transition-transform duration-300"
      >
        {/* Top styling strip */}
        <div className="h-2 bg-gradient-to-r from-[#B65538] via-[#B0863C] to-[#B65538]" />

        <div className="p-6 sm:p-10">
          {/* Logo & Subtext */}
          <div className="text-center mb-8">
            <span className="font-serif text-3xl font-bold tracking-tight text-[#2A211B]">
              Atelier Crème
            </span>
            <p className="text-xs text-[#5F4E43] mt-2 font-sans tracking-wide">
              디저트 아티스트의 고감도 VOD 베이킹 아틀리에
            </p>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-[#EFE8DC] mb-6">
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
                  ? 'text-[#B65538] border-b-2 border-[#B65538]'
                  : 'text-[#5F4E43]/60 hover:text-[#5F4E43]'
              }`}
            >
              로그인
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
                  ? 'text-[#B65538] border-b-2 border-[#B65538]'
                  : 'text-[#5F4E43]/60 hover:text-[#5F4E43]'
              }`}
            >
              회원가입
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
                <label className="block text-xs font-semibold text-[#2A211B] uppercase tracking-wide mb-1.5">
                  이름 (실명)
                </label>
                <div className="relative">
                  <input
                    id="input-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full px-4 py-2.5 bg-[#FAF4EA]/40 border border-[#EFE8DC] rounded-lg text-sm text-[#2A211B] placeholder-[#5F4E43]/40 focus:outline-none focus:ring-2 focus:ring-[#B65538] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#2A211B] uppercase tracking-wide mb-1.5">
                이메일 주소
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#5F4E43]/50">
                  <Mail size={16} />
                </span>
                <input
                  id="input-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creme@ateliercreme.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FAF4EA]/40 border border-[#EFE8DC] rounded-lg text-sm text-[#2A211B] placeholder-[#5F4E43]/40 focus:outline-none focus:ring-2 focus:ring-[#B65538] focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-[#2A211B] uppercase tracking-wide">
                  비밀번호
                </label>
                {isLoginTab && (
                  <a
                    href="#find-pw"
                    onClick={(e) => {
                      e.preventDefault();
                      setErrorMsg('이메일로 임시 비밀번호 전송 기능을 구현할 수 있습니다.');
                    }}
                    className="text-[10px] text-[#B0863C] hover:underline font-medium"
                  >
                    비밀번호를 잊으셨나요?
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#5F4E43]/50">
                  <Lock size={16} />
                </span>
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#FAF4EA]/40 border border-[#EFE8DC] rounded-lg text-sm text-[#2A211B] placeholder-[#5F4E43]/40 focus:outline-none focus:ring-2 focus:ring-[#B65538] focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5F4E43]/50 hover:text-[#5F4E43] cursor-pointer"
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
                    className="w-4 h-4 rounded text-[#B65538] border-[#EFE8DC] focus:ring-[#B65538] accent-[#B65538]"
                  />
                  <span className="text-xs text-[#5F4E43]">이메일 기억하기</span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="btn-auth-submit"
              type="submit"
              className="w-full py-3 px-4 bg-[#B65538] hover:bg-[#9E3E23] text-[#FAF4EA] font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isLoginTab ? '크렘 가입 계정으로 로그인' : '이메일로 회원가입 및 즉시 시작'}
            </button>
          </form>

          {/* Social Logins */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#EFE8DC]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-[#5F4E43]/50 font-medium">또는 간편 로그인</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Google Login */}
            <button
              id="google-login-btn"
              type="button"
              onClick={() => handleSocialLogin('Google')}
              className="flex items-center justify-center gap-2 py-2 px-3 border border-[#EFE8DC] rounded-lg bg-white hover:bg-[#FAF4EA]/40 transition-colors text-xs font-medium text-[#2A211B] cursor-pointer"
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
              Google 로그인
            </button>

            {/* Apple Login */}
            <button
              id="apple-login-btn"
              type="button"
              onClick={() => handleSocialLogin('Apple')}
              className="flex items-center justify-center gap-2 py-2 px-3 border border-[#EFE8DC] rounded-lg bg-white hover:bg-[#FAF4EA]/40 transition-colors text-xs font-medium text-[#2A211B] cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.04-1.92-14.12-6.17-3.56-2.9-7.51-7.72-11.83-14.45-5.13-7.87-9.43-16.73-12.87-26.6-3.44-9.87-5.18-19.14-5.18-27.8 0-12.52 3.11-23.01 9.34-31.47 6.23-8.46 14.18-12.73 23.85-12.82 5.09 0 10.22 1.51 15.41 4.5 5.19 3 9.07 4.5 11.64 4.5 2.13 0 5.65-1.39 10.53-4.17 6.06-3.4 11.63-4.99 16.71-4.75 16.14 1.39 28.18 7.72 36.14 19.01-14.09 8.56-20.9 20.08-20.43 34.53.47 11.63 5.13 21.03 13.98 28.2 4.16 3.4 8.78 5.92 13.88 7.57-2.67 7.76-5.83 15.11-9.47 22.05zm-33.17-105.15c0-8.3 2.94-15.82 8.82-21.57 5.88-5.75 13.06-8.98 21.54-9.69a26.13 26.13 0 0 1-7.23 18.91c-5.91 6.32-13.19 9.68-21.84 10.1-1.01-8.2-.18-14.88 1.29-17.75z" />
              </svg>
              Apple 로그인
            </button>
          </div>

          <p className="text-[10px] text-center text-[#5F4E43]/60 mt-8 leading-normal">
            가입 시 Atelier Crème의{' '}
            <a href="#terms" className="underline hover:text-[#B65538]">
              서비스 이용약관
            </a>{' '}
            및{' '}
            <a href="#privacy" className="underline hover:text-[#B65538]">
              개인정보 처리방침
            </a>
            에 동의하게 됩니다. 해외 수강생 서비스 및 중문 번역 기능은 로그인 후 프로필에서 설정
            가능합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
