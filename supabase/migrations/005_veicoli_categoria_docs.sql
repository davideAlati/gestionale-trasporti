-- Aggiunge categoria al veicolo
ALTER TABLE veicoli
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'Camion';

-- Storage policies per bucket veicoli-docs
CREATE POLICY "Autenticati possono leggere veicoli-docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'veicoli-docs');

CREATE POLICY "Autenticati possono caricare veicoli-docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'veicoli-docs');

CREATE POLICY "Autenticati possono eliminare veicoli-docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'veicoli-docs');
