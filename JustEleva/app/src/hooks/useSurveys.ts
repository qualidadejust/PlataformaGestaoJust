import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type SurveyQuestion = { id: string; dimension_id: string; text: string; kind: 'scale' | 'enps'; allow_na: boolean; sort_order: number };
export type SurveyDimension = { id: string; form_id: string; title: string; sort_order: number; questions: SurveyQuestion[] };
export type SurveyForm = { id: string; name: string; is_active: boolean; dimensions: SurveyDimension[] };

export type SurveyCampaign = {
  id: string; name: string; revision?: string | null; form_id: string; form_name?: string;
  start_date?: string | null; end_date?: string | null; status: 'draft' | 'open' | 'closed'; min_n: number;
  response_count?: number; action_count?: number;
};

export type ResultCell = { media: number; favorability: number | null; n: number } | { suppressed: true };
export type DimensionResult = { id: string; title: string; cells: Record<string, ResultCell>; geral: number | null; favorability: number | null };
export type SurveyResults = {
  campaign: { id: string; name: string; revision?: string | null; status: string; min_n: number };
  costCenters: string[];
  nByCostCenter: Record<string, number>;
  byDimension: DimensionResult[];
  overallMedia: number | null;
  enps: number | null;
  comments: { id: string; text: string; cost_center?: string | null }[];
  questionMeta: { id: string; text: string; kind: string; dimension_title: string }[];
};

export type SurveyAction = {
  id: string; campaign_id: string; dimension_title: string; cost_center?: string | null;
  title: string; description?: string | null; owner?: string | null; status: 'pending' | 'in_progress' | 'completed'; deadline?: string | null;
};

const BASE = '/api/surveys';
async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type SurveyFormInput = {
  name: string;
  is_active?: boolean;
  dimensions?: { title: string; questions?: { text: string; kind?: 'scale' | 'enps' }[] }[];
};

export function useSurveyForms() {
  return useQuery<SurveyForm[]>({ queryKey: ['survey-forms'], queryFn: () => fetchJSON(`${BASE}/forms`) });
}

export function useCreateSurveyForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SurveyFormInput) => fetchJSON<SurveyForm>(`${BASE}/forms`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['survey-forms'] }),
  });
}
export function useUpdateSurveyForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: SurveyFormInput & { id: string }) => fetchJSON<SurveyForm>(`${BASE}/forms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['survey-forms'] }),
  });
}
export function useDeleteSurveyForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/forms/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['survey-forms'] }),
  });
}
export function useSurveyForm(id?: string) {
  return useQuery<SurveyForm>({ queryKey: ['survey-forms', id], queryFn: () => fetchJSON(`${BASE}/forms/${id}`), enabled: !!id });
}

export function useSurveyCampaigns() {
  return useQuery<SurveyCampaign[]>({ queryKey: ['survey-campaigns'], queryFn: () => fetchJSON(`${BASE}/campaigns`) });
}
export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SurveyCampaign> & { name: string; form_id: string }) =>
      fetchJSON<SurveyCampaign>(`${BASE}/campaigns`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['survey-campaigns'] }),
  });
}
export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<SurveyCampaign> & { id: string }) =>
      fetchJSON<SurveyCampaign>(`${BASE}/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['survey-campaigns'] }),
  });
}

export function useSurveyResults(campaignId?: string) {
  return useQuery<SurveyResults>({
    queryKey: ['survey-results', campaignId],
    queryFn: () => fetchJSON(`${BASE}/campaigns/${campaignId}/results`),
    enabled: !!campaignId,
  });
}

export function useSubmitResponse(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { cost_center?: string; answers: Record<string, number | null>; comment?: string }) =>
      fetchJSON(`${BASE}/campaigns/${campaignId}/responses`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['survey-results', campaignId] });
      qc.invalidateQueries({ queryKey: ['survey-campaigns'] });
    },
  });
}

export function useSurveyActions(campaignId?: string) {
  return useQuery<SurveyAction[]>({
    queryKey: ['survey-actions', campaignId],
    queryFn: () => fetchJSON(`${BASE}/campaigns/${campaignId}/actions`),
    enabled: !!campaignId,
  });
}
export function useCreateSurveyAction(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SurveyAction> & { title: string; dimension_title: string }) =>
      fetchJSON<SurveyAction>(`${BASE}/campaigns/${campaignId}/actions`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['survey-actions', campaignId] }); qc.invalidateQueries({ queryKey: ['survey-campaigns'] }); },
  });
}
export function useUpdateSurveyAction(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<SurveyAction> & { id: string }) =>
      fetchJSON<SurveyAction>(`${BASE}/actions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['survey-actions', campaignId] }),
  });
}
export function useDeleteSurveyAction(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/actions/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['survey-actions', campaignId] }); qc.invalidateQueries({ queryKey: ['survey-campaigns'] }); },
  });
}
