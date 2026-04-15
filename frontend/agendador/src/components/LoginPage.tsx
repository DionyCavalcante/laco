import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface LoginPageProps {
  clinicName?: string;
  onNext: (name: string, whatsapp: string) => void;
}

const LoginPage = ({ clinicName, onNext }: LoginPageProps) => {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [shake, setShake]   = useState({ name: false, whatsapp: false });
  const [error, setError]   = useState({ name: false, whatsapp: false });

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11);
    if (limited.length <= 2) return limited;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const nameValid    = name.trim().length > 3;
  const phoneValid   = whatsapp.replace(/\D/g, '').length === 11;
  const isValid      = nameValid && phoneValid;

  const handleSubmit = () => {
    if (isValid) {
      onNext(name.trim(), whatsapp.replace(/\D/g, ''));
      return;
    }
    const invalid = { name: !nameValid, whatsapp: !phoneValid };
    setShake(invalid);
    setError(invalid);
    setTimeout(() => setShake({ name: false, whatsapp: false }), 600);
  };

  return (
    <div className="min-h-screen bg-brand-offwhite flex flex-col text-brand-navy selection:bg-brand-lavender/20 relative overflow-hidden">
      <div className="bg-pattern" />

      {/* Header — logo mais acima */}
      <header className="pt-7 pb-6 px-8 relative z-10">
        <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center">
          <div className="w-12 h-12 mb-3 border-[0.5px] border-brand-lavender/30 rounded-full flex items-center justify-center text-brand-lavender font-extralight text-lg tracking-tighter bg-white/30 backdrop-blur-sm shadow-sm">
            {clinicName ? clinicName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') : 'BE'}
          </div>
          <h1 className="text-brand-navy/80 font-bold text-[0.55rem] uppercase tracking-[0.4em] mb-1">
            {clinicName || 'Clínica'}
          </h1>
          <div className="h-[0.5px] w-3 bg-brand-lavender/30" />
        </div>
      </header>

      <main className="flex-grow px-10 py-2 max-w-md mx-auto w-full relative z-10">
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-14 text-center"
        >
          <h2 className="text-[2.2rem] font-medium mb-3 text-brand-navy heading-editorial tracking-tight">
            Olá!<br />
            <span className="font-serif italic text-brand-lavender font-normal">Bem-vinda</span>
          </h2>
          <p className="text-brand-slate text-[0.8rem] leading-relaxed font-light mx-auto max-w-[220px] opacity-70">
            Inicie sua jornada de beleza personalizada com exclusividade.
          </p>
        </motion.section>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Nome */}
          <div className={cn('flex flex-col space-y-2', shake.name && 'shake')}>
            <label className="text-brand-navy/40 font-bold label-minimalist uppercase ml-0.5 tracking-[0.25em]">
              NOME COMPLETO
            </label>
            <div className="relative group">
              <input
                className="input-refined w-full px-4 py-4 rounded-lg outline-none placeholder:text-gray-300 text-brand-navy font-normal text-sm transition-all"
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(4px)',
                  border: error.name ? '1px solid rgba(220,60,60,0.8)' : '1px solid rgba(200,170,130,0.45)',
                }}
                onFocus={e => (e.currentTarget.style.border = error.name ? '1px solid rgba(220,60,60,1)' : '1px solid rgba(200,170,130,0.85)')}
                onBlur={e  => (e.currentTarget.style.border = error.name ? '1px solid rgba(220,60,60,0.8)' : '1px solid rgba(200,170,130,0.45)')}
                placeholder="Ex: Maria Silva"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error.name) setError(prev => ({ ...prev, name: false }));
                }}
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div className={cn('flex flex-col space-y-2', shake.whatsapp && 'shake')}>
            <label className="text-brand-navy/40 font-bold label-minimalist uppercase ml-0.5 tracking-[0.25em]">
              WHATSAPP
            </label>
            <div className="relative group">
              <input
                className="input-refined w-full px-4 py-4 rounded-lg outline-none placeholder:text-gray-300 text-brand-navy font-normal text-sm transition-all"
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(4px)',
                  border: error.whatsapp ? '1px solid rgba(220,60,60,0.8)' : '1px solid rgba(200,170,130,0.45)',
                }}
                onFocus={e => (e.currentTarget.style.border = error.whatsapp ? '1px solid rgba(220,60,60,1)' : '1px solid rgba(200,170,130,0.85)')}
                onBlur={e  => (e.currentTarget.style.border = error.whatsapp ? '1px solid rgba(220,60,60,0.8)' : '1px solid rgba(200,170,130,0.45)')}
                placeholder="(11) 99999-9999"
                type="tel"
                inputMode="numeric"
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(formatWhatsApp(e.target.value));
                  if (error.whatsapp) setError(prev => ({ ...prev, whatsapp: false }));
                }}
              />
            </div>
          </div>
        </form>
      </main>

      <footer className="p-10 pt-6 max-w-md mx-auto w-full bg-transparent relative z-10">
        <button
          onClick={handleSubmit}
          className="w-full gradient-button hover:translate-y-[-1px] active:scale-[0.99] text-white font-medium py-4 rounded-xl flex items-center justify-center space-x-2.5 transition-all relative overflow-hidden group"
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          <span className="text-[0.65rem] uppercase tracking-[0.25em] relative z-10">Explorar Procedimentos</span>
          <ChevronRight size={16} className="relative z-10 transition-transform group-hover:translate-x-0.5" />
        </button>
        <p className="text-center mt-5 text-[0.55rem] text-brand-slate/40 uppercase tracking-[0.3em] font-medium">
          Experiência Aura Elite
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
