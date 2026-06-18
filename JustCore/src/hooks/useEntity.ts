import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/utils";

export type Row = Record<string, any>;

export function useList(path: string, enabled = true) {
  return useQuery({
    queryKey: [path],
    queryFn: () => api.get<Row[]>(`/api/${path}`),
    enabled,
  });
}

export function useSave(path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Row) =>
      row.id ? api.put<Row>(`/api/${path}/${row.id}`, row) : api.post<Row>(`/api/${path}`, row),
    onSuccess: () => qc.invalidateQueries({ queryKey: [path] }),
  });
}

export function useRemove(path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/${path}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [path] }),
  });
}
