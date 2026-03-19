-- =============================================
-- Storage policies per bucket autisti-docs
-- =============================================

-- Lettura: utenti autenticati
CREATE POLICY "Autenticati possono leggere autisti-docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'autisti-docs');

-- Upload: utenti autenticati
CREATE POLICY "Autenticati possono caricare autisti-docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'autisti-docs');

-- Eliminazione: utenti autenticati
CREATE POLICY "Autenticati possono eliminare autisti-docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'autisti-docs');

-- =============================================
-- Documenti: policy per utenti autenticati
-- (fallback se role metadata non è impostato)
-- =============================================

CREATE POLICY "Autenticati accesso completo documenti"
ON documenti
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
