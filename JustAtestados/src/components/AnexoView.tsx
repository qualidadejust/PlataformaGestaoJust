// Pré-visualização do anexo (imagem/PDF). Para anexos no GED do Core (download mediado +
// sensível), uma navegação <img src>/<iframe src> não enviaria o token → 401. Aqui buscamos
// o conteúdo com fetch autenticado e renderizamos a partir de um blob: URL.
import { useEffect, useState } from "react";
import type { Anexo } from "../types";
import { fetchBlobUrl } from "../api-base";

export function AnexoView({ anexo, className }: { anexo: Anexo; className?: string }) {
  const ehData = anexo.dataUrl?.startsWith("data:");
  const [url, setUrl] = useState<string | null>(ehData ? anexo.dataUrl : null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (ehData || !anexo.dataUrl) return;
    let revoke: string | null = null;
    let vivo = true;
    fetchBlobUrl(anexo.dataUrl).then((b) => {
      if (!vivo) {
        if (b) URL.revokeObjectURL(b);
        return;
      }
      if (b) {
        revoke = b;
        setUrl(b);
      } else {
        setErro(true);
      }
    });
    return () => {
      vivo = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [anexo.dataUrl, ehData]);

  if (erro) return <div className={className}>Não foi possível carregar o anexo.</div>;
  if (!url) return <div className={className}>Carregando anexo…</div>;
  return anexo.tipo.startsWith("image/") ? (
    <img src={url} alt={anexo.nome} className={className} />
  ) : (
    <iframe src={url} title={anexo.nome} className={className} />
  );
}
