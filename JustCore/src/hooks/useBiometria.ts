import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/utils";

export interface ColaboradorBio {
  id: string;
  nome: string;
  cargo?: { nome: string } | null;
  empresa?: { razao_social: string; nome_fantasia: string | null } | null;
}

export interface ResumoBio {
  colaborador_id: string;
  total: number;
  ultimo: string;
}

export interface DigitalCadastrada {
  id: string;
  dedo: string | null;
  created_at: string;
}

export function useColaboradores() {
  return useQuery({ queryKey: ["colaboradores"], queryFn: () => api.get<ColaboradorBio[]>("/api/colaboradores") });
}

export function useBioHealth() {
  return useQuery({
    queryKey: ["biometria", "health"],
    queryFn: () => api.get<{ online: boolean }>("/api/biometria/health"),
    refetchInterval: 15000,
  });
}

export function useBioResumo() {
  return useQuery({ queryKey: ["biometria", "resumo"], queryFn: () => api.get<ResumoBio[]>("/api/biometria/resumo") });
}

export function useDigitais(colaboradorId: string | null) {
  return useQuery({
    queryKey: ["biometria", "colaborador", colaboradorId],
    queryFn: () =>
      api.get<{ colaborador_id: string; total: number; digitais: DigitalCadastrada[] }>(
        `/api/biometria/colaboradores/${colaboradorId}`
      ),
    enabled: !!colaboradorId,
  });
}

export function useEnroll(colaboradorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { dedo: string; imagens: string[] }) =>
      api.post<{ ok: boolean; cadastradas: number }>(`/api/biometria/colaboradores/${colaboradorId}/enroll`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biometria"] }),
  });
}

export function useDeleteDigital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/biometria/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biometria"] }),
  });
}

export const DEDOS = [
  { value: "indicador_direito", label: "Indicador direito" },
  { value: "polegar_direito", label: "Polegar direito" },
  { value: "medio_direito", label: "Médio direito" },
  { value: "indicador_esquerdo", label: "Indicador esquerdo" },
  { value: "polegar_esquerdo", label: "Polegar esquerdo" },
  { value: "medio_esquerdo", label: "Médio esquerdo" },
];

export const DEDOS_ALVO = 3; // dedos a cadastrar por colaborador
