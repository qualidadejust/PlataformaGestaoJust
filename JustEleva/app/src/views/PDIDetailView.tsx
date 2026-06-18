import { useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, Calendar, Plus, MessageSquare, Target, Lightbulb, X, Sparkles, Loader2, Play } from "lucide-react";
import { usePdiPlan, useUpdatePdiAction, useAddPdiAction, type PdiPlan, type PdiAction } from "../hooks/usePdi";
import { type PDIActionType, type CompetenceGroup } from "../types";
import { cn } from "../lib/utils";

function fmtDeadline(d: string) {
  if (!d) return '—';
  if (d.includes('/')) return d;
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

export function PDIDetailView({ pdiId, onBack }: { pdiId?: string; onBack: () => void }) {
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Partial<PdiAction>[]>([]);
  const [newAction, setNewAction] = useState({
    title: '', description: '', deadline: '',
    related_competency: '', action_type: '',
    resources_needed: '', expected_outcomes: '',
    status: 'pending' as const
  });

  const { data: pdi, isLoading } = usePdiPlan(pdiId);
  const updateAction = useUpdatePdiAction();
  const addAction = useAddPdiAction();

  const generateAiInsights = () => {
    setShowAiInsights(true);
    setIsGeneratingAi(true);
    setTimeout(() => {
      const ALL_COMPETENCIES = ['Capacidade de Gestão', 'Preparo e Qualificação', 'Trabalho em Equipe', 'Compromisso com Resultados', 'Visão Institucional', 'Características Comportamentais'];
      const ALL_TYPES: Array<PdiAction['action_type']> = ['treinamento_formal', 'mentoria', 'pratica_supervisionada', 'projeto', 'apresentacao'];
      const usedComps = new Set((pdi?.actions ?? []).map(a => a.related_competency).filter(Boolean));
      const usedTypes = new Set((pdi?.actions ?? []).map(a => a.action_type).filter(Boolean));
      const missing = ALL_COMPETENCIES.filter(c => !usedComps.has(c));
      const unusedTypes = ALL_TYPES.filter(t => !usedTypes.has(t));

      const suggestions: Partial<PdiAction>[] = missing.slice(0, 2).map((comp, i) => ({
        title: `Desenvolvimento em ${comp}`,
        description: `Ação de desenvolvimento focada no bloco "${comp}" para ${pdi?.employee_name ?? 'o colaborador'} (${pdi?.employee_role ?? ''}).`,
        related_competency: comp,
        action_type: unusedTypes[i] ?? ALL_TYPES[i % ALL_TYPES.length],
        expected_outcomes: `Melhoria observável em "${comp}" ao longo do ciclo ${pdi?.cycle_name ?? ''}.`,
        resources_needed: '',
        deadline: '',
      }));

      if (suggestions.length === 0) {
        suggestions.push({
          title: 'Aprofundamento e Multiplicação',
          description: `Todas as competências já têm ações no PDI de ${pdi?.employee_name ?? 'o colaborador'}. Considere ações de maior complexidade ou que desenvolvam outras pessoas.`,
          related_competency: pdi?.actions[0]?.related_competency ?? '',
          action_type: 'apresentacao',
          expected_outcomes: 'Fortalecimento como referência técnica e desenvolvimento de liderança.',
          resources_needed: '',
          deadline: '',
        });
      }

      setAiSuggestions(suggestions);
      setIsGeneratingAi(false);
    }, 1500);
  };

  const applyAiSuggestion = (suggestion: Partial<PdiAction>) => {
    setNewAction(n => ({
      ...n,
      title: suggestion.title ?? '',
      description: suggestion.description ?? '',
      deadline: suggestion.deadline ?? '',
      related_competency: suggestion.related_competency ?? '',
      action_type: suggestion.action_type ?? '',
      resources_needed: suggestion.resources_needed ?? '',
      expected_outcomes: suggestion.expected_outcomes ?? '',
    }));
    setIsAddingAction(true);
    setShowAiInsights(false);
  };

  const handleSaveAction = () => {
    if (!pdiId || !newAction.title || !newAction.description || !newAction.deadline) return;
    addAction.mutate({ planId: pdiId, ...newAction }, { onSuccess: () => {
      setIsAddingAction(false);
      setNewAction({ title:'', description:'', deadline:'', related_competency:'', action_type:'', resources_needed:'', expected_outcomes:'', status:'pending' });
    }});
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Não Iniciado</span>;
      case 'in_progress': return <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-xs font-semibold border border-brand-200 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Em Andamento</span>;
      case 'completed': return <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Concluído</span>;
    }
  };

  const getActionTypeLabel = (type: string | undefined) => {
    switch(type) {
        case 'treinamento_formal': return "Treinamento Formal";
        case 'leitura_orientada': return "Leitura Orientada";
        case 'mentoria': return "Mentoria / Coaching";
        case 'job_rotation': return "Job Rotation";
        case 'acompanhamento_gestor': return "Acompanhamento com Gestor";
        case 'pratica_supervisionada': return "Prática Supervisionada";
        case 'projeto': return "Participação em Projeto";
        case 'apresentacao': return "Apresentação / Workshop Interno";
        case 'comportamental': return "Desenvolvimento Comportamental";
        case 'rotina_processo': return "Melhoria de Rotina/Processo";
        default: return "Não Definido";
    }
  };

  if (isLoading || !pdi) return <div className="p-8 text-center text-slate-400">Carregando...</div>;

  const completedCount = pdi.actions.filter(a => a.status === 'completed').length;
  const progress = pdi.actions.length ? Math.round((completedCount / pdi.actions.length) * 100) : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para visão geral
      </button>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-medium border border-brand-200 shadow-inner">
            {pdi.employee_name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{pdi.employee_name}</h1>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{pdi.cycle_name}</span>
            </div>
            <p className="text-sm font-medium text-slate-500">{pdi.employee_role}</p>
          </div>
        </div>
        
        <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="text-center px-4 border-r border-slate-200">
            <p className="text-3xl font-extrabold text-slate-900">{pdi.actions.length}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Ações</p>
          </div>
          <div className="text-center px-4">
            <p className="text-3xl font-extrabold text-brand-600">{progress}%</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Progresso</p>
          </div>
        </div>
      </div>

      {pdi.actions.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Resumo das Ações</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
              <p className="text-2xl font-bold text-slate-700">{pdi.actions.filter(a => a.status === 'pending').length}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Planejadas</p>
            </div>
            <div className="bg-brand-50 rounded-xl p-4 text-center border border-brand-100">
              <p className="text-2xl font-bold text-brand-700">{pdi.actions.filter(a => a.status === 'in_progress').length}</p>
              <p className="text-xs font-semibold text-brand-600 mt-1">Em Andamento</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
              <p className="text-2xl font-bold text-emerald-700">{pdi.actions.filter(a => a.status === 'completed').length}</p>
              <p className="text-xs font-semibold text-emerald-600 mt-1">Concluídas</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
         <h2 className="text-lg font-semibold text-slate-900">Detalhamento das Ações</h2>
         <div className="flex gap-3">
           {!isAddingAction && (
             <>
               <button 
                 onClick={generateAiInsights}
                 className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg text-sm font-medium hover:bg-brand-100 transition-colors shadow-sm"
               >
                 <Sparkles className="w-4 h-4" /> Sugestões com IA
               </button>
               <button 
                 onClick={() => setIsAddingAction(true)}
                 className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
               >
                 <Plus className="w-4 h-4" /> Nova Ação
               </button>
             </>
           )}
         </div>
      </div>

      <div className="space-y-6">
        {showAiInsights && (
          <div className="bg-gradient-to-br from-brand-900 to-slate-900 rounded-2xl border border-brand-800 p-1 mb-8 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-4 relative">
            <button 
              onClick={() => setShowAiInsights(false)}
              className="absolute top-4 right-4 p-2 text-brand-300 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-brand-950/40 p-6 md:p-8 rounded-xl relative overflow-hidden">
               {/* Decorative background blurs */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
               
               <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center border border-brand-400/30">
                     <Sparkles className="w-5 h-5 text-brand-300" />
                   </div>
                   <div>
                     <h3 className="text-lg font-bold text-white">Análise Inteligente e Sugestões</h3>
                     <p className="text-sm text-brand-200">Baseado no ciclo "{pdi.cycle_name}" de {pdi.employee_name}.</p>
                   </div>
                 </div>

                 {isGeneratingAi ? (
                   <div className="py-12 flex flex-col items-center justify-center text-center">
                     <Loader2 className="w-8 h-8 text-brand-400 animate-spin mb-4" />
                     <p className="text-brand-200 font-medium animate-pulse">Analisando defasagens de competências e comentários do gestor...</p>
                   </div>
                 ) : (
                   <div className="space-y-4">
                     <p className="text-sm text-brand-100/80 mb-4 bg-black/20 p-4 rounded-xl border border-white/5">
                       <strong>Sugestões para {pdi.employee_name}:</strong> Baseado nas competências já cobertas no PDI do ciclo "{pdi.cycle_name}", as ações abaixo focam nas áreas ainda não trabalhadas.
                     </p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {aiSuggestions.map((sug, idx) => (
                         <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors group relative overflow-hidden backdrop-blur-sm">
                           <div className="flex items-start gap-4">
                             <div className="flex-1">
                               <div className="flex items-center gap-2 mb-2">
                                 {sug.related_competency && (
                                   <span className="text-[10px] font-bold uppercase tracking-wider text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                                     Eixo: {sug.related_competency}
                                   </span>
                                 )}
                                 {sug.action_type && (
                                   <span className="text-[10px] font-bold uppercase tracking-wider text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                                     Tipo: {getActionTypeLabel(sug.action_type)}
                                   </span>
                                 )}
                               </div>
                               <h4 className="font-bold text-white mb-2">{sug.title}</h4>
                               <p className="text-sm text-brand-200 mb-4">{sug.description}</p>
                               <div className="space-y-2">
                                 {sug.expected_outcomes && (
                                   <div className="flex items-start gap-2 text-xs">
                                     <Target className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
                                     <span className="text-brand-100/70">{sug.expected_outcomes}</span>
                                   </div>
                                 )}
                               </div>
                             </div>
                           </div>
                           <button 
                             onClick={() => applyAiSuggestion(sug)}
                             className="w-full mt-5 py-2 px-4 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                           >
                             <Plus className="w-4 h-4" /> Adicionar ao PDI
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}

        {isAddingAction && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 relative shrink-0">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                   <Target className="w-5 h-5 text-brand-600" /> Adicionar Nova Ação de Desenvolvimento
                </h3>
                <button 
                  onClick={() => setIsAddingAction(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 md:p-8 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="space-y-1.5 md:col-span-2">
                     <label className="text-sm font-medium text-slate-700">Equacionador / Eixo (PDI)</label>
                     <select
                       value={newAction.related_competency}
                       onChange={e => setNewAction(n => ({ ...n, related_competency: e.target.value }))}
                       className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                     >
                       <option value="">Selecione um bloco de competência...</option>
                       <option value="Capacidade de Gestão">Capacidade de Gestão</option>
                       <option value="Preparo e Qualificação">Preparo e Qualificação</option>
                       <option value="Trabalho em Equipe">Trabalho em Equipe</option>
                       <option value="Compromisso com Resultados">Compromisso com Resultados</option>
                       <option value="Visão Institucional">Visão Institucional</option>
                       <option value="Características Comportamentais">Características Comportamentais</option>
                     </select>
                   </div>
                   <div className="space-y-1.5 md:col-span-2">
                     <label className="text-sm font-medium text-slate-700">Tipo de Ação</label>
                     <select
                       value={newAction.action_type}
                       onChange={e => setNewAction(n => ({ ...n, action_type: e.target.value }))}
                       className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                     >
                       <option value="">Selecione o tipo...</option>
                       <option value="treinamento_formal">Treinamento Formal</option>
                       <option value="mentoria">Mentoria / Coaching</option>
                       <option value="pratica_supervisionada">Prática Supervisionada</option>
                       <option value="projeto">Participação em Projeto</option>
                       <option value="apresentacao">Apresentação / Workshop</option>
                     </select>
                   </div>
                   <div className="space-y-1.5 md:col-span-2">
                     <label className="text-sm font-medium text-slate-700">Título da Ação</label>
                     <input type="text" value={newAction.title} onChange={e => setNewAction(n => ({ ...n, title: e.target.value }))} placeholder="Ex: Curso de Liderança, Mentoria..." className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                   </div>
                   <div className="space-y-1.5 md:col-span-2">
                     <label className="text-sm font-medium text-slate-700">Descrição Detalhada</label>
                     <textarea rows={3} value={newAction.description} onChange={e => setNewAction(n => ({ ...n, description: e.target.value }))} placeholder="Descreva o que será feito..." className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"></textarea>
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-sm font-medium text-slate-700">Prazo Estimado</label>
                     <input type="date" value={newAction.deadline} onChange={e => setNewAction(n => ({ ...n, deadline: e.target.value }))} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-600" />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-sm font-medium text-slate-700">Recursos Necessários</label>
                     <input type="text" value={newAction.resources_needed} onChange={e => setNewAction(n => ({ ...n, resources_needed: e.target.value }))} placeholder="Ex: Orçamento de R$ 500, tempo dedicado..." className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                   </div>
                   <div className="space-y-1.5 md:col-span-2">
                     <label className="text-sm font-medium text-slate-700">Resultados Esperados</label>
                     <textarea rows={2} value={newAction.expected_outcomes} onChange={e => setNewAction(n => ({ ...n, expected_outcomes: e.target.value }))} placeholder="Como saberemos que a ação foi um sucesso?" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"></textarea>
                   </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button 
                  onClick={() => setIsAddingAction(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-white border border-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAction}
                  disabled={addAction.isPending}
                  className="px-5 py-2.5 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  Salvar Ação
                </button>
              </div>
            </div>
          </div>
        )}

        {pdi.actions.map(action => (
          <div key={action.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
            <div className={cn(
              "w-2 shrink-0 hidden md:block",
              action.status === 'completed' ? "bg-emerald-500" :
              action.status === 'in_progress' ? "bg-brand-500" : "bg-slate-300"
            )}></div>
            <div className="p-6 md:p-8 flex-1">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {action.related_competency && (
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-700 border border-brand-100 rounded text-[10px] font-bold uppercase tracking-wider">
                        Eixo: {action.related_competency}
                      </span>
                    )}
                    {action.action_type && (
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-700 border border-brand-100 rounded text-[10px] font-bold uppercase tracking-wider">
                        Tipo: {getActionTypeLabel(action.action_type)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{action.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium"><Calendar className="w-4 h-4 text-slate-400" /> Prazo: {fmtDeadline(action.deadline)}</span>
                  </div>
                </div>
                <div>
                  {getStatusBadge(action.status)}
                </div>
              </div>
              
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed mb-6 space-y-4">
                <p>{action.description}</p>
                {(action.resources_needed || action.expected_outcomes) && (
                  <div className="border-t border-slate-200 pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {action.resources_needed && (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                           <Lightbulb className="w-3.5 h-3.5" /> Recursos
                        </div>
                        <p className="text-slate-600">{action.resources_needed}</p>
                      </div>
                    )}
                    {action.expected_outcomes && (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                           <Target className="w-3.5 h-3.5" /> Resultados
                        </div>
                        <p className="text-slate-600">{action.expected_outcomes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 border-t border-slate-100 pt-4">
                 <span className="text-sm font-medium text-slate-300 flex items-center gap-2 cursor-not-allowed" title="Em desenvolvimento">
                   <MessageSquare className="w-4 h-4" /> Comentário / Evidência
                 </span>
                 {action.status === 'pending' && (
                   <button
                     onClick={() => updateAction.mutate({ planId: pdiId!, actionId: action.id, ...action, status: 'in_progress' })}
                     className="text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-lg ml-auto flex items-center gap-1.5"
                   >
                     <Play className="w-3.5 h-3.5" /> Iniciar
                   </button>
                 )}
                 {action.status === 'in_progress' && (
                   <button
                     onClick={() => updateAction.mutate({ planId: pdiId!, actionId: action.id, ...action, status: 'completed' })}
                     className="text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg ml-auto flex items-center gap-1.5"
                   >
                     <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
                   </button>
                 )}
                 {action.status === 'completed' && (
                   <button
                     onClick={() => updateAction.mutate({ planId: pdiId!, actionId: action.id, ...action, status: 'in_progress' })}
                     className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-lg ml-auto flex items-center gap-1.5"
                   >
                     <Clock className="w-3.5 h-3.5" /> Reabrir
                   </button>
                 )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
