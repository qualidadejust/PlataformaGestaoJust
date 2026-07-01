import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, ScrollText, Stethoscope, Search, Loader2, ExternalLink,
  Users, Building, Briefcase, Wallet, KeyRound,
} from 'lucide-react';
import { dataService } from '../services';
import { searchCidCatalogo, getCidCount } from '../services/cidCatalog';
import type { AuditEvento, Cid } from '../types';

// A tela de Configurações do JustAtestados é enxuta de propósito: colaboradores, obras, cargos,
// centros de custo, parâmetros de custo (custo por hora) e usuários/perfis são geridos no
// JustCore (fonte única). Aqui ficam só os recursos próprios do módulo: auditoria e consulta CID.

type AdminSection = 'audit' | 'cid';

const CORE_URL = (import.meta as any).env?.VITE_URL_CORE
  ? `https://${(import.meta as any).env.VITE_URL_CORE}`
  : 'http://localhost:4101';

const NO_CORE = [
  { icon: Users, label: 'Colaboradores' },
  { icon: Building, label: 'Obras / Unidades' },
  { icon: Briefcase, label: 'Cargos e setores' },
  { icon: Wallet, label: 'Centros de custo e custo por hora' },
  { icon: KeyRound, label: 'Usuários e perfis de acesso' },
];

function InfoCore() {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-50">
        <ShieldCheck className="w-4 h-4 text-petroleum-600" /> Cadastros centralizados no JustCore
      </h3>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
        Para manter uma fonte única de verdade, estes itens são gerenciados no <strong>JustCore</strong> —
        o JustAtestados apenas os consome:
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {NO_CORE.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Icon className="w-4 h-4 text-slate-400" /> {label}
          </li>
        ))}
      </ul>
      <a
        href={CORE_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-petroleum-700 hover:text-petroleum-800 dark:text-petroleum-400"
      >
        Abrir o JustCore <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

function AuditSection() {
  const [eventos, setEventos] = useState<AuditEvento[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEventos(await dataService.listEventos(200));
    } catch {
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {loading ? (
        <div className="py-10 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando…
        </div>
      ) : eventos.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <ScrollText className="w-10 h-10 mb-3 opacity-40 mx-auto" />
          <p className="font-medium">Sem eventos registrados ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Quando</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Módulo</th>
                <th className="px-4 py-3">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {eventos.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                    {new Date(e.ts).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2.5 text-slate-900 dark:text-slate-50">{e.usuario}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{e.acao}</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{e.modulo}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{e.detalhe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CidSection() {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<Cid[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => { getCidCount().then(setTotal).catch(() => setTotal(null)); }, []);
  useEffect(() => {
    let vivo = true;
    if (!q.trim()) { setResultados([]); return; }
    setBuscando(true);
    searchCidCatalogo(q, 40)
      .then((r) => { if (vivo) setResultados(r); })
      .finally(() => { if (vivo) setBuscando(false); });
    return () => { vivo = false; };
  }, [q]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Catálogo CID-10/CID-O do DataSUS{total !== null && <> — <strong>{total.toLocaleString('pt-BR')}</strong> códigos</>}.
        Consulte por código ou descrição (é o mesmo catálogo usado no lançamento).
      </p>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex.: A09 ou diarreia…"
          className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 rounded-md focus:outline-none focus:ring-2 focus:ring-petroleum-500 sm:text-sm"
        />
      </div>
      {buscando ? (
        <div className="text-slate-400 text-sm flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Buscando…</div>
      ) : resultados.length > 0 ? (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-w-2xl">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {resultados.map((c) => (
                <tr key={c.codigo} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-2 font-mono text-xs font-semibold text-petroleum-700 dark:text-petroleum-400 whitespace-nowrap">{c.codigo}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{c.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : q.trim() ? (
        <p className="text-sm text-slate-400">Nenhum CID encontrado para “{q}”.</p>
      ) : null}
    </div>
  );
}

export function Admin() {
  const [section, setSection] = useState<AdminSection>('audit');
  const tabs: { id: AdminSection; label: string; icon: typeof ScrollText }[] = [
    { id: 'audit', label: 'Auditoria', icon: ScrollText },
    { id: 'cid', label: 'Consulta CID', icon: Stethoscope },
  ];

  const tabCls = (active: boolean) =>
    [
      'flex items-center gap-2 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors',
      active
        ? 'border-petroleum-600 text-petroleum-700 dark:border-petroleum-400 dark:text-petroleum-300'
        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
    ].join(' ');

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Configurações</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Recursos do módulo de atestados.</p>
      </div>

      <InfoCore />

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setSection(t.id)} className={tabCls(section === t.id)}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {section === 'audit' ? <AuditSection /> : <CidSection />}
    </div>
  );
}
