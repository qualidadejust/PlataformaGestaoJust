/**
 * Wrapper do leitor de digitais DigitalPersona / HID U.are.U 4500.
 *
 * O navegador NÃO acessa o leitor por USB diretamente. O caminho oficial é o
 * agente local "DigitalPersona Lite Client / WebSDK", que abre um WebSocket em
 * localhost. O cliente JS `@digitalpersona/websdk` (global `window.WebSdk`)
 * conversa com esse agente, e `@digitalpersona/devices` expõe o FingerprintReader.
 *
 * Carregamos tudo dinamicamente (try/catch). Se o agente NÃO estiver instalado,
 * o app cai no modo "simulado" para testar o fluxo de ponta a ponta.
 */

export type CaptureTipo = "digital" | "simulado";

export interface CaptureResult {
  dataUrl: string; // data:image/png;base64,...
  tipo: CaptureTipo;
}

export interface ReaderHandle {
  start(): Promise<void>;
  stop(): Promise<void>;
}

interface ReaderCallbacks {
  onSample: (r: CaptureResult) => void;
  onStatus: (msg: string) => void;
  onError: (msg: string) => void;
  /** Chamado quando o agente local não responde (não instalado/parado). */
  onUnavailable: (msg: string) => void;
  /** Sinal de que o agente está vivo (leitor conectado / aquisição iniciada). */
  onAlive: () => void;
}

// base64url -> base64 padrão (BioSample.Data vem como base64url)
function toStandardBase64(b64url: string): string {
  let s = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return s;
}

function extractPng(samples: unknown): string | null {
  const first = Array.isArray(samples) ? samples[0] : samples;
  const b64url =
    typeof first === "string" ? first : (first as any)?.Data ?? (first as any)?.data ?? null;
  if (!b64url) return null;
  return `data:image/png;base64,${toStandardBase64(String(b64url))}`;
}

/**
 * Cria e inicia o leitor real. Lança erro se o SDK/agente não puder ser
 * carregado — quem chama trata e oferece o modo simulado.
 */
export async function createRealReader(cb: ReaderCallbacks): Promise<ReaderHandle> {
  // O cliente WebSDK é carregado como <script> clássico no index.html, que
  // define o global window.WebSdk (usado por @digitalpersona/devices).
  if (!(globalThis as any).WebSdk?.WebChannelClient) {
    throw new Error("Global WebSdk ausente (script /websdk.client.ui.js não carregou).");
  }

  const sdk: any = await import("@digitalpersona/devices");

  const reader = new sdk.FingerprintReader();

  reader.on("DeviceConnected", () => {
    cb.onAlive();
    cb.onStatus("Leitor conectado. Posicione o dedo.");
  });
  reader.on("DeviceDisconnected", () => cb.onStatus("Leitor desconectado."));
  reader.on("AcquisitionStarted", () => {
    cb.onAlive();
    cb.onStatus("Aguardando o dedo no leitor…");
  });
  reader.on("QualityReported", (e: any) =>
    cb.onStatus(e?.quality === 0 ? "Leitura boa." : "Reposicione o dedo (qualidade baixa).")
  );
  reader.on("ErrorOccurred", (e: any) =>
    cb.onError(`Erro no leitor (código ${e?.error ?? "?"}).`)
  );
  reader.on("CommunicationFailed", () =>
    cb.onUnavailable("Sem comunicação com o agente DigitalPersona.")
  );
  reader.on("SamplesAcquired", (e: any) => {
    const dataUrl = extractPng(e?.samples);
    if (dataUrl) cb.onSample({ dataUrl, tipo: "digital" });
    else cb.onError("Não foi possível ler a amostra da digital.");
  });

  const format = sdk.SampleFormat?.PngImage ?? 5; // PngImage = 5

  return {
    async start() {
      await reader.startAcquisition(format);
    },
    async stop() {
      try {
        await reader.stopAcquisition();
      } catch {
        /* ignore */
      }
      try {
        reader.off();
      } catch {
        /* ignore */
      }
    },
  };
}

/** Gera uma "digital" simulada (PNG) só para testar o fluxo sem o agente instalado. */
export function gerarSimulado(): CaptureResult {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 200;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0e2148";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#7e97d9";
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.ellipse(80, 100, 8 + i * 5, 12 + i * 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px sans-serif";
  ctx.fillText("SIMULADO", 50, 190);
  return { dataUrl: canvas.toDataURL("image/png"), tipo: "simulado" };
}
