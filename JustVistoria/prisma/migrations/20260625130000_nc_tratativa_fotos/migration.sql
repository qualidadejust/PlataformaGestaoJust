-- Enriquece nao_conformidades: tratativa (NC crítica), categorização/distribuição
-- (pendências) e evidência fotográfica múltipla. Tudo aditivo e nulável.
ALTER TABLE "nao_conformidades" ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'inspecao_final';
ALTER TABLE "nao_conformidades" ADD COLUMN "categoria" TEXT;
ALTER TABLE "nao_conformidades" ADD COLUMN "equipe" TEXT;
ALTER TABLE "nao_conformidades" ADD COLUMN "tipo" TEXT;
ALTER TABLE "nao_conformidades" ADD COLUMN "causa_raiz" TEXT;
ALTER TABLE "nao_conformidades" ADD COLUMN "acoes" TEXT;
ALTER TABLE "nao_conformidades" ADD COLUMN "dias_resolucao" INTEGER;
ALTER TABLE "nao_conformidades" ADD COLUMN "fotos" TEXT;

CREATE INDEX "nao_conformidades_severidade_idx" ON "nao_conformidades"("severidade");
CREATE INDEX "nao_conformidades_categoria_idx" ON "nao_conformidades"("categoria");
