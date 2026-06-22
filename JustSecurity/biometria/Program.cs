using SourceAFIS;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

// Serviço local de biometria (SourceAFIS). Roda em 127.0.0.1:4002 e é consumido
// só pelo backend do JustSecurity (nunca exposto à rede). Dois usos:
//   POST /extract  { image }                 -> { template }     (cadastro)
//   POST /match    { probe|probeTemplate, candidates[] } -> { bestScore, bestIndex }
// A digital U.are.U 4500 tem ~500 dpi.

const int DPI = 500;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

static byte[] DecodeBase64(string s)
{
    var comma = s.IndexOf(',');
    if (s.StartsWith("data:") && comma >= 0) s = s[(comma + 1)..];
    return Convert.FromBase64String(s);
}

// PNG (base64) -> template SourceAFIS serializado.
static FingerprintTemplate BuildTemplate(string base64Png)
{
    var bytes = DecodeBase64(base64Png);
    using var image = Image.Load<L8>(bytes); // L8 = 1 byte/pixel (tons de cinza)
    int w = image.Width, h = image.Height;
    var gray = new byte[w * h];
    image.ProcessPixelRows(accessor =>
    {
        for (int y = 0; y < accessor.Height; y++)
        {
            var row = accessor.GetRowSpan(y);
            for (int x = 0; x < row.Length; x++)
                gray[y * w + x] = row[x].PackedValue;
        }
    });
    var fp = new FingerprintImage(w, h, gray, new FingerprintImageOptions { Dpi = DPI });
    return new FingerprintTemplate(fp);
}

app.MapGet("/health", () => Results.Json(new { ok = true, service = "biometria-sourceafis" }));

// Extrai o template de uma imagem (cadastro).
app.MapPost("/extract", (ExtractReq req) =>
{
    try
    {
        var t = BuildTemplate(req.image);
        return Results.Json(new { template = Convert.ToBase64String(t.ToByteArray()) });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = "falha ao extrair template: " + ex.Message });
    }
});

// Compara uma digital (probe) contra N templates cadastrados; devolve o melhor score.
// O backend decide o limiar (SourceAFIS: ~40 ≈ FMR 0,01%).
app.MapPost("/match", (MatchReq req) =>
{
    try
    {
        FingerprintTemplate probe = !string.IsNullOrEmpty(req.probeTemplate)
            ? new FingerprintTemplate(DecodeBase64(req.probeTemplate))
            : BuildTemplate(req.probe!);

        var matcher = new FingerprintMatcher(probe);
        double best = 0;
        int bestIndex = -1;
        var cands = req.candidates ?? Array.Empty<string>();
        for (int i = 0; i < cands.Length; i++)
        {
            if (string.IsNullOrEmpty(cands[i])) continue;
            double s = matcher.Match(new FingerprintTemplate(DecodeBase64(cands[i])));
            if (s > best) { best = s; bestIndex = i; }
        }
        return Results.Json(new { bestScore = best, bestIndex });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = "falha no match: " + ex.Message });
    }
});

app.Run("http://127.0.0.1:4002");

record ExtractReq(string image);
record MatchReq(string? probe, string? probeTemplate, string[]? candidates);
