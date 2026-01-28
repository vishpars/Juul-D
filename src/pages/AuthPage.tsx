
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Hexagon, LogIn, Key, Mail, User, UserPlus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BackgroundAmbience } from '../components/layout/BackgroundAmbience';

type AuthMode = 'login' | 'register';

const VKIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zM17.6 12.8c.63.61 1.25 1.22 1.83 1.87.41.46.42.66.07.96-.28.24-.61.35-1.07.35-.91 0-1.63-.44-2.22-1.09-.41-.46-.8-.94-1.28-.9-.23.02-.34.21-.34.46-.01 1.1-.2 1.41-1.31 1.48-2.61.16-4.66-.8-6.32-2.73-2.07-2.4-3.69-5.17-3.69-8.49 0-.25.07-.37.37-.37 1.03 0 2.05.01 3.08 0 .34 0 .54.16.63.49 1.06 3.69 3.19 5.37 4.7 5.4.38.01.44-.16.44-.46.01-1.5-.32-2.67-1.74-3.09-.34-.1-.29-.44-.09-.61.27-.22.69-.36 1.1-.37 1.23-.02 1.63.14 1.88.8.08.2.14.42.14.64.03.96.03 1.93.38 2.29.17.18.57.06.77-.17 1.14-1.27 1.94-3.79 2.18-5.32.06-.39.29-.57.69-.58.94-.01 1.89-.01 2.83 0 .36 0 .52.17.43.53-.33 1.42-.99 2.72-1.73 3.96-.24.4-.22.58.12.92z" fillRule="evenodd" clipRule="evenodd" opacity="0"/>
        <path d="M13.162 18.994c.609 0 1.016-.217 1.016-.599v-1.018c0-.483.463-.967 1.217-.967 1.35 0 3.078 2.453 4.415 2.584h2.19c1.45 0 .204-2.584-1.928-4.996 1.882-1.777 2.19-2.825 2.023-3.147h-2.357c-1.393 2.013-2.553 2.174-3.078 2.013v-4.188c0-1.127.306-1.611-.532-1.611h-2.903c-.274 0-.462.19-.462.37 0 .387.575.474.634 1.562v3.705c0 .403-.075.644-.37.644-.694 0-2.38-2.545-3.38-5.462H6.975c-.322 0-.398.145-.398.306 0 2.835 3.037 10.806 9.89 10.806h-3.305z"/>
    </svg>
);

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"/></svg>
);

export const AuthPage: React.FC = () => {
  const { signIn, signInWithProvider, signInWithVK, signUp, signInAsGuest, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ошибка авторизации");
    }
  };

  const handleVK = async () => {
      setErrorMsg(null);
      try {
          await signInWithVK();
          navigate('/');
      } catch (err: any) {
          setErrorMsg("Ошибка ВК: " + (err.message || "Не удалось войти"));
      }
  };

  const handleOAuth = async (provider: 'google') => {
      setErrorMsg(null);
      try {
          await signInWithProvider(provider);
          // Redirect happens automatically
      } catch (err: any) {
          setErrorMsg(err.message || "Ошибка входа через соцсеть");
      }
  };

  const handleGuestLogin = async () => {
    await signInAsGuest();
    navigate('/');
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambience Background for Auth */}
      <BackgroundAmbience />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-8 animate-fadeIn">
           <div className="relative mb-4">
              <div className="absolute inset-0 bg-violet-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
              <Hexagon className="w-16 h-16 text-violet-500 fill-violet-900/20 stroke-[1.5px]" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-fantasy font-bold text-xl text-violet-200 tracking-tighter pt-1">JD</span>
           </div>
           <h1 className="font-fantasy text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 tracking-[0.2em] text-center drop-shadow-sm">
             JUUL-D SYSTEM
           </h1>
           <p className="text-slate-500 text-xs uppercase tracking-widest mt-2">
             {mode === 'login' ? 'Идентификация Личности' : 'Регистрация Сущности'}
           </p>
        </div>

        {/* Card */}
        <div className="bg-[#050b14]/80 backdrop-blur-md border border-violet-500/20 p-8 rounded-lg shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
           
           {errorMsg && (
             <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-200 text-xs text-center font-bold">
               {errorMsg}
             </div>
           )}

           {/* OAuth Buttons */}
           <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                    onClick={handleVK}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-2.5 rounded bg-[#0077FF]/10 border border-[#0077FF]/30 text-[#0077FF] hover:bg-[#0077FF]/20 hover:text-white transition-all font-bold text-sm"
                >
                    <VKIcon /> VK ID
                </button>
                <button 
                    onClick={() => handleOAuth('google')}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-2.5 rounded bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all font-bold text-sm"
                >
                    <GoogleIcon /> Google
                </button>
           </div>

           <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-slate-800 flex-1"></div>
              <span className="text-[10px] text-slate-600 uppercase font-bold">Или email</span>
              <div className="h-px bg-slate-800 flex-1"></div>
           </div>

           <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-xs text-slate-400 font-bold uppercase tracking-wider ml-1">Почта</label>
                 <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded p-3 pl-10 text-slate-200 text-sm focus:border-violet-500 focus:shadow-[0_0_10px_rgba(139,92,246,0.2)] outline-none transition-all placeholder:text-slate-700"
                      placeholder="traveller@void.com"
                      required
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-xs text-slate-400 font-bold uppercase tracking-wider ml-1">Пароль</label>
                 <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded p-3 pl-10 text-slate-200 text-sm focus:border-violet-500 focus:shadow-[0_0_10px_rgba(139,92,246,0.2)] outline-none transition-all placeholder:text-slate-700"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                 </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-violet-700 hover:bg-violet-600 text-white font-fantasy uppercase tracking-widest py-3 rounded shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all flex items-center justify-center gap-2 relative overflow-hidden group/btn"
              >
                 <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? "Обработка..." : (mode === 'login' ? <>Войти <LogIn size={16} /></> : <>Создать <UserPlus size={16} /></>)}
                 </span>
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
           </form>

           {/* Toggle Mode */}
           <div className="mt-4 text-center">
             <button 
                onClick={toggleMode}
                className="text-xs text-slate-500 hover:text-violet-300 transition-colors flex items-center justify-center gap-1 mx-auto"
             >
                {mode === 'login' ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
                <ArrowRight size={12} />
             </button>
           </div>

           <div className="space-y-3 mt-6 border-t border-slate-800 pt-4">
               <button 
                 onClick={handleGuestLogin}
                 className="w-full bg-emerald-900/10 hover:bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 py-3 rounded flex items-center justify-center gap-2 font-bold text-sm transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
               >
                  <User className="w-5 h-5" />
                  Продолжить Гостем
               </button>
           </div>
        </div>
        
        <div className="text-center mt-6">
           <p className="text-[10px] text-slate-600 font-mono">
              SYSTEM v.4.0.5 | RECRUITMENT ACTIVE
           </p>
        </div>
      </div>
    </div>
  );
};
