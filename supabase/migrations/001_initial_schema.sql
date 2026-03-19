-- =============================================
-- Gestionale Trasporti — Schema iniziale
-- Eseguire nel SQL Editor di Supabase
-- =============================================

-- Tabella clienti
CREATE TABLE IF NOT EXISTS clienti (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255),
  email VARCHAR(255),
  telefono VARCHAR(50),
  indirizzo TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella autisti
CREATE TABLE IF NOT EXISTS autisti (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255),
  cognome VARCHAR(255),
  patente VARCHAR(100),
  telefono VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella veicoli
CREATE TABLE IF NOT EXISTS veicoli (
  id SERIAL PRIMARY KEY,
  targa VARCHAR(20) UNIQUE NOT NULL,
  marca VARCHAR(100),
  modello VARCHAR(100),
  anno INT,
  km_acquisto NUMERIC,
  km_attuali NUMERIC,
  autista_id INT REFERENCES autisti(id) ON DELETE SET NULL,
  stato VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella spedizioni
CREATE TABLE IF NOT EXISTS spedizioni (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clienti(id),
  autista_id INT REFERENCES autisti(id),
  origine TEXT,
  destinazione TEXT,
  peso_kg NUMERIC,
  mtl NUMERIC,
  ref_cliente VARCHAR(255),
  note TEXT,
  data_partenza DATE,
  data_arrivo DATE,
  stato VARCHAR(50) DEFAULT 'Non Assegnato',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella preventivi
CREATE TABLE IF NOT EXISTS preventivi (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clienti(id),
  descrizione TEXT,
  importo NUMERIC,
  data DATE,
  stato VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella conversazioni
CREATE TABLE IF NOT EXISTS conversazioni (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clienti(id),
  messaggio TEXT,
  risposta TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella contratti autisti
CREATE TABLE IF NOT EXISTS contratti_autisti (
  id SERIAL PRIMARY KEY,
  autista_id INT REFERENCES autisti(id),
  tipo_contratto VARCHAR(100),
  data_inizio DATE,
  data_fine DATE,
  documento TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella manutenzioni
CREATE TABLE IF NOT EXISTS manutenzioni (
  id SERIAL PRIMARY KEY,
  data_intervento DATE NOT NULL,
  km NUMERIC,
  descrizione TEXT,
  tipologia_intervento VARCHAR(100),
  targa VARCHAR(20) NOT NULL REFERENCES veicoli(targa) ON DELETE CASCADE,
  costo NUMERIC,
  fornitore VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella documenti
CREATE TABLE IF NOT EXISTS documenti (
  id SERIAL PRIMARY KEY,
  nome_file VARCHAR(255) NOT NULL,
  tipo_documento VARCHAR(100),
  formato VARCHAR(20),
  entita_tipo VARCHAR(50),
  entita_id INT,
  percorso_file TEXT,
  dimensione_kb NUMERIC,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- Trigger: percorso file automatico
-- =============================================
CREATE OR REPLACE FUNCTION genera_percorso()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entita_tipo = 'autista' THEN
    NEW.percorso_file = '/documenti/autisti/' || NEW.nome_file;
  ELSIF NEW.entita_tipo = 'cliente' THEN
    NEW.percorso_file = '/documenti/clienti/' || NEW.nome_file;
  ELSIF NEW.entita_tipo = 'veicolo' THEN
    NEW.percorso_file = '/documenti/veicoli/' || NEW.nome_file;
  ELSIF NEW.entita_tipo = 'dipendente' THEN
    NEW.percorso_file = '/documenti/dipendenti/' || NEW.nome_file;
  ELSIF NEW.entita_tipo = 'contratto' THEN
    NEW.percorso_file = '/documenti/contratti/' || NEW.nome_file;
  ELSE
    NEW.percorso_file = '/documenti/altro/' || NEW.nome_file;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_percorso_file
BEFORE INSERT ON documenti
FOR EACH ROW
WHEN (NEW.percorso_file IS NULL)
EXECUTE FUNCTION genera_percorso();

-- =============================================
-- RLS: Row Level Security
-- =============================================
ALTER TABLE clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE autisti ENABLE ROW LEVEL SECURITY;
ALTER TABLE veicoli ENABLE ROW LEVEL SECURITY;
ALTER TABLE spedizioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratti_autisti ENABLE ROW LEVEL SECURITY;
ALTER TABLE manutenzioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenti ENABLE ROW LEVEL SECURITY;

-- Policy staff: accesso completo
CREATE POLICY "Staff accesso completo" ON clienti
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'staff');

CREATE POLICY "Staff accesso completo" ON autisti
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'staff');

CREATE POLICY "Staff accesso completo" ON veicoli
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'staff');

CREATE POLICY "Staff accesso completo" ON spedizioni
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'staff');

CREATE POLICY "Staff accesso completo" ON preventivi
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'staff');

CREATE POLICY "Staff accesso completo" ON manutenzioni
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'staff');

CREATE POLICY "Staff accesso completo" ON documenti
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'staff');

CREATE POLICY "Staff accesso completo" ON conversazioni
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'staff');

CREATE POLICY "Staff accesso completo" ON contratti_autisti
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'staff');

-- Policy clienti: vedono solo i propri dati
CREATE POLICY "Cliente vede proprie spedizioni" ON spedizioni
  FOR SELECT USING (
    cliente_id = (SELECT id FROM clienti WHERE email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Cliente vede propri preventivi" ON preventivi
  FOR SELECT USING (
    cliente_id = (SELECT id FROM clienti WHERE email = auth.jwt() ->> 'email')
  );
