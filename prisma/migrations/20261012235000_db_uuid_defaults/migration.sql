-- Génération des UUID côté base (permet les inserts REST / SQL directs)
-- sans que l'id soit fourni par l'appelant (auparavant : défaut côté client Prisma).

ALTER TABLE "faculties" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "programs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "program_options" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "academic_levels" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "subjects" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "academic_years" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "document_categories" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "documents" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();