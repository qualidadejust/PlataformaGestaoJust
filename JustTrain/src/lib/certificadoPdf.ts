import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export interface CertData {
  participacao: {
    colaborador_nome: string;
    colaborador_cargo?: string | null;
    empresa_nome?: string | null;
    assinatura_img?: string | null;
    assinatura_tipo?: string | null;
    bio_match?: boolean | null;
    certificado_valido_ate?: string | null;
  };
  turma: {
    treinamento_nome: string;
    treinamento_codigo?: string | null;
    setor: string;
    carga_horaria: number;
    data: string;
    instrutor?: string | null;
  };
}

// Converte uma URL de imagem para base64 (necessário para html2canvas cross-origin em dev).
async function toBase64(url: string): Promise<string> {
  try {
    const r = await fetch(url);
    const blob = await r.blob();
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

// Recolore um PNG (data-URI) para branco preservando o canal alpha. Usado no logo, pois
// o html2canvas ignora `filter:brightness(0)invert(1)`; sem isto o logo navy some no header.
async function recolorWhite(dataUri: string): Promise<string> {
  if (!dataUri) return "";
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || img.width;
      c.height = img.naturalHeight || img.height;
      const ctx = c.getContext("2d");
      if (!ctx) { resolve(dataUri); return; }
      ctx.drawImage(img, 0, 0);
      try {
        const id = ctx.getImageData(0, 0, c.width, c.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 10) { d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; }
        }
        ctx.putImageData(id, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch {
        resolve(dataUri);
      }
    };
    img.onerror = () => resolve(dataUri);
    img.src = dataUri;
  });
}

function montarElemento(cert: CertData, logoBase64: string): HTMLDivElement {
  const { participacao: p, turma: t } = cert;
  const codigo = t.treinamento_codigo ? `${t.treinamento_codigo} — ` : "";
  const cargo = [p.colaborador_cargo, p.empresa_nome].filter(Boolean).join("  ·  ");

  // Selo geométrico — minimalista, corporativo. Embutido como <img> data-URI (html2canvas
  // não rasteriza <svg> inline de forma confiável; ver nota na marca d'água).
  const seloSvgRaw =
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">` +
    `<circle cx="40" cy="40" r="37" fill="none" stroke="#C9A84C" stroke-width="1.5"/>` +
    `<circle cx="40" cy="40" r="31" fill="none" stroke="#C9A84C" stroke-width="0.6"/>` +
    `<circle cx="40" cy="40" r="25" fill="#0f2742"/>` +
    `<text x="40" y="36" text-anchor="middle" font-family="Georgia,serif" font-size="8.5" font-weight="bold" letter-spacing="1.5" fill="#C9A84C">JUST</text>` +
    `<text x="40" y="46" text-anchor="middle" font-family="Georgia,serif" font-size="5.5" letter-spacing="1" fill="#ffffff">CONSTRUTORA</text>` +
    `<text x="40" y="55" text-anchor="middle" font-family="Georgia,serif" font-size="5" letter-spacing="0.5" fill="#C9A84C">&#10022; &#10022; &#10022;</text>` +
    `</svg>`;
  const seloSvg = `<img src="data:image/svg+xml;base64,${btoa(seloSvgRaw)}" width="80" height="80" style="width:80px;height:80px;" alt="selo" />`;

  const assinaturaColabImg = p.assinatura_img
    ? `<img src="${p.assinatura_img}" style="height:36px;object-fit:contain;margin-bottom:4px;" alt="assinatura"/>`
    : `<div style="height:36px;"></div>`;

  const sigColaborador = `
    <div style="display:flex;flex-direction:column;align-items:center;min-width:200px;">
      ${assinaturaColabImg}
      <div style="width:180px;border-top:1px solid #94a3b8;margin-bottom:4px;"></div>
      <span style="font-size:10.5px;font-weight:700;color:#0f2742;letter-spacing:0.3px;">${p.colaborador_nome}</span>
      <span style="font-size:9px;color:#64748b;font-style:italic;margin-top:1px;">
        ${p.assinatura_tipo ?? "Participante"}${p.bio_match ? " ✓" : ""}
      </span>
    </div>`;

  const sigInstrutor = `
    <div style="display:flex;flex-direction:column;align-items:center;min-width:200px;">
      <div style="height:36px;"></div>
      <div style="width:180px;border-top:1px solid #94a3b8;margin-bottom:4px;"></div>
      <span style="font-size:10.5px;font-weight:700;color:#0f2742;letter-spacing:0.3px;">${t.instrutor ?? "Gestão de Treinamentos"}</span>
      <span style="font-size:9px;color:#64748b;font-style:italic;margin-top:1px;">${t.instrutor ? "Instrutor Responsável" : "Construtora JUST"}</span>
    </div>`;

  // logoBase64 já vem recolorido para branco (html2canvas ignora filter CSS).
  const logoTag = logoBase64
    ? `<img src="${logoBase64}" alt="JUST" style="height:48px;object-fit:contain;" />`
    : `<span style="font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#fff;letter-spacing:3px;">JUST</span>`;

  const divOuter = document.createElement("div");
  divOuter.style.cssText =
    "position:fixed;left:-9999px;top:-9999px;width:1122px;height:794px;z-index:-1;overflow:hidden;";

  divOuter.innerHTML = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
  .cert-root * { box-sizing: border-box; margin: 0; padding: 0; }
</style>
<div class="cert-root" style="
  width:1122px; height:794px;
  background:#fafaf8;
  position:relative;
  font-family:'Cormorant Garamond', Georgia, serif;
  overflow:hidden;
  display:flex;
  flex-direction:column;
">

  <!-- Faixa de cabeçalho navy (cor sólida: html2canvas pode rasterizar gradiente via
       createPattern e falhar com canvas 0×0 em alguns navegadores). -->
  <div style="
    background:#143257;
    height:140px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:0 56px;
    position:relative;
    flex-shrink:0;
  ">
    <!-- Logo -->
    <div style="display:flex;align-items:center;gap:20px;">
      ${logoTag}
    </div>

    <!-- Título no cabeçalho -->
    <div style="text-align:right;padding-right:90px;">
      <div style="font-family:Georgia,serif;font-size:13px;letter-spacing:5px;text-transform:uppercase;color:#C9A84C;font-weight:400;">
        Construtora JUST
      </div>
      <div style="font-family:Georgia,serif;font-size:36px;font-weight:700;letter-spacing:8px;text-transform:uppercase;color:#ffffff;line-height:1.15;margin-top:2px;">
        CERTIFICADO
      </div>
    </div>
  </div>

  <!-- Linha ouro sob o cabeçalho -->
  <div style="height:3px;background:#C9A84C;flex-shrink:0;"></div>
  <div style="height:1px;background:#e2e8f0;flex-shrink:0;"></div>

  <!-- Corpo central. Altura EXPLÍCITA (não flex:1) p/ os filhos absolutos resolverem
       altura no html2canvas. Espaçamento por margens (gap de flex é ignorado). -->
  <div style="
    height:536px;
    flex-shrink:0;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    padding:0 100px;
    position:relative;
  ">
    <!-- Faixas laterais navy (altura explícita + cor sólida) -->
    <div class="cert-stripe" style="position:absolute; left:0; top:0; height:536px; width:8px; background:#163a66;"></div>
    <div class="cert-stripe" style="position:absolute; right:0; top:0; height:536px; width:8px; background:#163a66;"></div>

    <p style="font-size:13px;color:#64748b;letter-spacing:1px;font-style:italic;text-transform:uppercase;margin:0;">
      de conclusão de treinamento
    </p>

    <!-- Divisor ouro -->
    <div style="display:flex;align-items:center;margin:12px 0;">
      <div style="height:1px;width:120px;background:#C9A84C;"></div>
      <div style="width:6px;height:6px;background:#C9A84C;transform:rotate(45deg);margin:0 10px;"></div>
      <div style="height:1px;width:120px;background:#C9A84C;"></div>
    </div>

    <p style="font-size:14px;color:#475569;font-style:italic;letter-spacing:0.5px;margin:0 0 4px;">
      Certificamos que
    </p>

    <!-- Nome em cursiva. line-height alto + padding p/ os glifos não invadirem o cargo. -->
    <div style="
      font-family:'Dancing Script', 'Brush Script MT', cursive;
      font-size:54px;
      font-weight:700;
      color:#0f2742;
      line-height:1.4;
      text-align:center;
      padding:0 0 18px;
      margin:0;
    ">${p.colaborador_nome}</div>

    ${cargo ? `<p style="font-size:11px;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;margin:0 0 16px;">${cargo}</p>` : `<div style="height:16px;"></div>`}

    <!-- Texto do treinamento -->
    <p style="
      font-size:13.5px;
      color:#334155;
      text-align:center;
      line-height:1.7;
      max-width:680px;
      margin:0;
    ">
      concluiu o treinamento
      <strong style="color:#0f2742;">${codigo}${t.treinamento_nome}</strong>,
      com carga horária de <strong style="color:#0f2742;">${t.carga_horaria} horas</strong>,
      realizado em <strong style="color:#0f2742;">${t.data}</strong>${t.instrutor ? `, sob instrução de <strong style="color:#0f2742;">${t.instrutor}</strong>` : ""}.
    </p>

    ${p.certificado_valido_ate
      ? `<p style="font-size:10.5px;color:#92400e;margin:10px 0 0;letter-spacing:0.3px;">
           Validade para reciclagem: ${p.certificado_valido_ate}
         </p>`
      : ""}
  </div>

  <!-- Linha ouro de rodapé -->
  <div style="height:1px;background:#e2e8f0;flex-shrink:0;"></div>
  <div style="height:3px;background:#C9A84C;flex-shrink:0;"></div>

  <!-- Rodapé de assinaturas -->
  <div style="
    background:#f8fafc;
    height:110px;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:60px;
    padding:0 80px;
    flex-shrink:0;
    position:relative;
  ">
    ${sigColaborador}

    <!-- Selo central -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;margin-bottom:4px;">
      ${seloSvg}
    </div>

    ${sigInstrutor}
  </div>

</div>`;

  document.body.appendChild(divOuter);
  return divOuter;
}

function aguardarImagens(el: HTMLElement): Promise<void> {
  const imgs = Array.from(el.querySelectorAll("img")) as HTMLImageElement[];
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) { resolve(); return; }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  ).then(() => undefined);
}

// Renderiza o certificado num canvas (fonte única usada pelo preview e pelo PDF).
async function renderCanvas(cert: CertData): Promise<HTMLCanvasElement> {
  const logoRaw = await toBase64("/logos/logo-just.png");
  const logoBase64 = await recolorWhite(logoRaw);
  const container = montarElemento(cert, logoBase64);
  try {
    await document.fonts.ready;
    await aguardarImagens(container);
    await new Promise((r) => setTimeout(r, 150));

    const certEl = container.querySelector(".cert-root") as HTMLElement;
    const opts = {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#fafaf8",
      width: 1122,
      height: 794,
    };

    try {
      return await html2canvas(certEl, opts);
    } catch (e) {
      // Fallback: alguns navegadores fazem o html2canvas falhar (createPattern com canvas
      // 0×0) em elementos decorativos. Remove-os e tenta de novo — garante o certificado.
      console.warn("[certificado] html2canvas falhou, regenerando sem decoração:", (e as Error).message);
      certEl.querySelectorAll(".cert-stripe").forEach((n) => n.remove());
      return await html2canvas(certEl, opts);
    }
  } finally {
    container.remove();
  }
}

export async function gerarCertificadoPdf(cert: CertData): Promise<Blob> {
  const canvas = await renderCanvas(cert);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 297, 210);
  return pdf.output("blob");
}

// Imagem PNG (data-URL) do certificado — usada no preview da tela (o que você vê = o PDF).
export async function gerarCertificadoImg(cert: CertData): Promise<string> {
  const canvas = await renderCanvas(cert);
  return canvas.toDataURL("image/png");
}
