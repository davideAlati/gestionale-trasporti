-- Tabella voci preventivo
CREATE TABLE IF NOT EXISTS preventivi_voci (
  id SERIAL PRIMARY KEY,
  preventivo_id INT NOT NULL REFERENCES preventivi(id) ON DELETE CASCADE,
  carico VARCHAR(255),
  scarico VARCHAR(255),
  descrizione TEXT,
  km NUMERIC,
  mtl NUMERIC,
  peso NUMERIC,
  importo NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE preventivi_voci ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticati accesso completo preventivi_voci"
ON preventivi_voci FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Policy permissiva anche su preventivi per utenti autenticati
CREATE POLICY "Autenticati accesso completo preventivi"
ON preventivi FOR ALL TO authenticated
USING (true) WITH CHECK (true);
