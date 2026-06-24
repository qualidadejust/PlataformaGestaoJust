/**
 * index.ts — ponto de entrada único do serviço de dados.
 * Plataforma JUST: implementação HTTP (back do JustAtestados + JustCore + auth central).
 *
 * Uso nas telas:  import { dataService } from '../services';
 */
export type { DataService } from "./dataService";
export type {
  User, Obra, Colaborador, Cid, CentroCusto, Cargo, AuditEvento,
  Documento, DocumentoFiltros, DocumentoView, ResumoFila, Anexo, KPI,
} from "./dataService";

import { ApiDataService } from "./apiDataService";
import type { DataService } from "./dataService";

export const dataService: DataService = new ApiDataService();
