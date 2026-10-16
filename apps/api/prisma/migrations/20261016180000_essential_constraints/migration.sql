-- Constraints essenciais (§35.7) não representáveis no schema Prisma.
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_version_positive" CHECK ("version" >= 1);
ALTER TABLE "users" ADD CONSTRAINT "users_version_positive" CHECK ("version" >= 1);
ALTER TABLE "users" ADD CONSTRAINT "users_failed_login_count_non_negative" CHECK ("failed_login_count" >= 0);
-- Só existe a linha do proprietário; `false` nunca é usado (§44.1).
ALTER TABLE "users" ADD CONSTRAINT "users_is_owner_true" CHECK ("is_owner");
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email"));
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_valid_period" CHECK ("expires_at" > "created_at");
