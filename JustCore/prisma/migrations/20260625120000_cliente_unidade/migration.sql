-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
    "obra_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'apartamento',
    "bloco" TEXT,
    "pavimento" TEXT,
    "identificador" TEXT NOT NULL,
    "codigo" TEXT,
    "sublocais" TEXT,
    "area_m2" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unidades_obra_id_idx" ON "unidades"("obra_id");

-- CreateIndex
CREATE INDEX "unidades_cliente_id_idx" ON "unidades"("cliente_id");

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
