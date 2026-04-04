PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pets (
  pet_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age_months INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
  species TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('available', 'adopted', 'pending')),
  description TEXT NOT NULL,
  image_url TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  application_id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT,
  applicant_phone TEXT,
  message TEXT,
  status TEXT NOT NULL CHECK(status IN ('new', 'reviewed', 'approved', 'rejected')),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tokens (
  value TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS donations (
  donation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_name TEXT NOT NULL,
  amount REAL NOT NULL,
  message TEXT,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pets_status ON pets(status);
CREATE INDEX IF NOT EXISTS idx_applications_pet_id ON applications(pet_id);
CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
