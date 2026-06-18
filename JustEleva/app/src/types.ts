export type User = {
  id: string;
  name: string;
  role: string;
  department: string;
  avatarUrl?: string;
};

export type EvaluationStatus = 'pending' | 'draft' | 'submitted' | 'feedback_pending' | 'completed';

export type EvaluationItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  status: EvaluationStatus;
  dueDate: string;
  type?: 'Autoavaliação' | 'Avaliação pelo Gestor' | 'Consenso' | 'Feedback';
};

// Escala de desempenho 1-5 + N/S (instrumento oficial Construtora JUST — Rev 03)
// 1 Muito abaixo · 2 Abaixo · 3 Atende · 4 Acima · 5 Referência · NS Não sei avaliar
export type Score = 1 | 2 | 3 | 4 | 5 | 'NS' | null;

// Avaliação de Potencial (1: Discorda, 2: Concorda Parcialmente, 3: Concorda Totalmente)
export type PotentialScore = 1 | 2 | 3 | null;

export type PDIActionType = 
  | 'treinamento_formal'
  | 'leitura_orientada'
  | 'mentoria'
  | 'job_rotation'
  | 'acompanhamento_gestor'
  | 'pratica_supervisionada'
  | 'projeto'
  | 'apresentacao'
  | 'comportamental'
  | 'rotina_processo';

export type CompetenceGroup = 
  | 'Capacidade de Gestão'
  | 'Preparo e Qualificação'
  | 'Trabalho em Equipe'
  | 'Compromisso com Resultados'
  | 'Visão Institucional'
  | 'Características Comportamentais';

export type PDIActionStatus = 'pending' | 'in_progress' | 'completed';

export type PDIAction = {
  id: string;
  title: string;
  description: string;
  status: PDIActionStatus;
  deadline: string;
  resourcesNeeded?: string;
  expectedOutcomes?: string;
  relatedCompetency?: CompetenceGroup;
  actionType?: PDIActionType;
};

export type PDIPlan = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  cycle: string;
  actions: PDIAction[];
};

// Modelos de avaliação editáveis (carregados do banco)
export type AnswerType = 'scale' | 'yesno' | 'text';
export type TemplateQuestion = { id: string; block_id: string; text: string; answer_type: AnswerType; sort_order: number };
export type EvaluationBlock = {
  id: string;
  template_id: string;
  title: string;
  sort_order: number;
  manager_only: boolean;
  questions: TemplateQuestion[];
};
export type EvaluationTemplate = {
  id: string;
  name: string;
  description?: string | null;
  scale_max: number;
  applies_to: 'default' | 'managers';
  is_active: boolean;
  blocks: EvaluationBlock[];
};

export const POTENTIAL_QUESTIONS = [
  { id: 'pot1', text: 'Orientação para o aprendizado e adaptação rápida a novos cenários.' },
  { id: 'pot2', text: 'Maturidade emocional sob pressão e capacidade de assumir responsabilidades maiores.' },
  { id: 'pot3', text: 'Abrangência de análise sistêmica (vê o todo da obra/empresa, não apenas sua tarefa).' }
];
