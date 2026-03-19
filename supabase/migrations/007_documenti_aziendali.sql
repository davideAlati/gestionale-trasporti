-- Storage policies per bucket documenti-aziendali
CREATE POLICY "Autenticati possono leggere documenti-aziendali"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documenti-aziendali');

CREATE POLICY "Autenticati possono caricare documenti-aziendali"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documenti-aziendali');

CREATE POLICY "Autenticati possono eliminare documenti-aziendali"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documenti-aziendali');
