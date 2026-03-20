-- Tabella promemoria collegati ai veicoli
CREATE TABLE IF NOT EXISTS promemoria (
  id          SERIAL PRIMARY KEY,
  veicolo_id  INTEGER NOT NULL REFERENCES veicoli(id) ON DELETE CASCADE,
  titolo      VARCHAR(255) NOT NULL,
  descrizione TEXT,
  priorita    VARCHAR(10) NOT NULL DEFAULT 'media'
    CHECK (priorita IN ('alta', 'media', 'bassa')),
  completato  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE promemoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_promemoria" ON promemoria
  FOR ALL USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('staff', 'admin')
  );
