import { Bell, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Employee } from "../hooks/useEmployees";
import { Logo } from "./Logo";

interface HeaderProps {
  onMenuClick?: () => void;
  currentUser?: Employee;
  employees?: Employee[];
  onUserChange?: (id: string) => void;
}

export function Header({ onMenuClick, currentUser, employees = [], onUserChange }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = currentUser
    ? currentUser.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '??';

  return (
    <header className="relative h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
      <Logo className="h-7 absolute left-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="flex items-center gap-3 sm:gap-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center relative text-slate-500 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="h-6 w-px bg-slate-200"></div>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700 leading-tight">{currentUser?.name ?? 'Carregando...'}</p>
              <p className="text-xs text-slate-500 leading-tight">{currentUser?.role ?? ''}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-700 font-semibold border border-brand-100 text-sm">
              {initials}
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trocar usuário</p>
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => { onUserChange?.(emp.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${emp.id === currentUser?.id ? 'bg-brand-50' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${emp.id === currentUser?.id ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {emp.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{emp.name}</p>
                    <p className="text-xs text-slate-500 truncate">{emp.role}</p>
                  </div>
                  {emp.is_manager ? <span className="shrink-0 text-[9px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded uppercase">Gestor</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
