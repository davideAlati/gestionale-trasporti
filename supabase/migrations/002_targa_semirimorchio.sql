-- Aggiunge campo targa semirimorchio alla tabella spedizioni
ALTER TABLE spedizioni
  ADD COLUMN IF NOT EXISTS targa_semirimorchio VARCHAR(20);
