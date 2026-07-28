-- CreateTable
CREATE TABLE "ticket_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255),
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "background_color" VARCHAR(9) NOT NULL DEFAULT '#ffffff',
    "background_image_url" VARCHAR(500),
    "elements" JSONB NOT NULL DEFAULT '[]',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_tickets" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "checksum" VARCHAR(10) NOT NULL,
    "nfc_tag_id" VARCHAR(100),
    "dataSnapshot" JSONB NOT NULL,
    "reprint_count" INTEGER NOT NULL DEFAULT 0,
    "last_reprinted_at" TIMESTAMP(3),
    "last_reprinted_by" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "generated_tickets_code_key" ON "generated_tickets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "generated_tickets_nfc_tag_id_key" ON "generated_tickets"("nfc_tag_id");

-- CreateIndex
CREATE INDEX "generated_tickets_template_id_idx" ON "generated_tickets"("template_id");

-- AddForeignKey
ALTER TABLE "generated_tickets" ADD CONSTRAINT "generated_tickets_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ticket_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
