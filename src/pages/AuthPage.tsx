
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Hexagon, LogIn, Key, Mail, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BackgroundAmbience } from '../components/layout/BackgroundAmbience';

export const AuthPage: React.FC = () => {
  const { signIn, signInAsGuest, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
    navigate('/');
  };

  const handleGuestLogin = async () => {
    await signInAsGuest();
    navigate('/');
  };

  const handleVKLogin = () => {
    console.log("VK Auth coming soon");
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
           <p className="text-slate-500 text-xs uppercase tracking-widest mt-2">Идентификация Личности</p>
        </div>

        {/* Card */}
        <div className="bg-[#050b14]/80 backdrop-blur-md border border-violet-500/20 p-8 rounded-lg shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
           
           <form onSubmit={handleLogin} className="space-y-6">
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
                    />
                 </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-violet-700 hover:bg-violet-600 text-white font-fantasy uppercase tracking-widest py-3 rounded shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all flex items-center justify-center gap-2 relative overflow-hidden group/btn"
              >
                 <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? "Синхронизация..." : <>Войти <LogIn size={16} /></>}
                 </span>
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
              </button>
           </form>

           <div className="flex items-center gap-4 my-6">
              <div className="h-px bg-slate-800 flex-1"></div>
              <span className="text-[10px] text-slate-600 uppercase font-bold">Способы</span>
              <div className="h-px bg-slate-800 flex-1"></div>
           </div>

           <div className="space-y-3">
               <button 
                 onClick={handleVKLogin}
                 className="w-full bg-[#0077FF]/10 hover:bg-[#0077FF]/20 border border-[#0077FF]/30 text-[#0077FF] py-3 rounded flex items-center justify-center gap-2 font-bold text-sm transition-all hover:shadow-[0_0_15px_rgba(0,119,255,0.2)]"
               >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zM17.6 14.65c.5.5.9.88.93 1.05.02.13-.1.25-.43.25h-1.45c-.83 0-1.18-.38-1.78-1.03-.2-.2-.48-.48-.65-.45-.18.02-.25.28-.25.85v.6c0 .32-.1.38-.63.38h-2.5c-2.6 0-4.75-2.2-6.55-5.9-.2-.38.15-.55.53-.55h1.53c.4 0 .6.15.75.53.8 2.2 2.1 4.1 2.65 4.1.2 0 .28-.1.28-.65V11.2c-.08-1.15-.7-1.25-.7-1.68 0-.2.18-.33.48-.33h2.8c.38 0 .5.18.5.58v2.75c0 .28.13.38.2.38.13 0 .28-.1.53-.35 1.03-1.13 1.75-2.73 1.75-2.73.1-.2.35-.3.55-.3h1.53c.53 0 .63.25.5.58-.23.75-2.3 3.65-2.3 3.65-.2.3-.23.43 0 .7.53.53 1.8 1.75 2.05 1.9z"/></svg>
                  Войти через ВКонтакте
               </button>

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
              SYSTEM v.4.0.3 | ДОСТУП ОГРАНИЧЕН
           </p>
        </div>
      </div>
    </div>
  );
};
