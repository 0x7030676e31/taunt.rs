PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS animals (
  animal_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age_months INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
  species TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  application_id INTEGER PRIMARY KEY AUTOINCREMENT,
  animal_id INTEGER NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT,
  applicant_phone TEXT,
  message TEXT,
  status TEXT NOT NULL CHECK(status IN ('new', 'reviewed', 'approved', 'rejected')),
  created_at_ms INTEGER NOT NULL,
  FOREIGN KEY (animal_id) REFERENCES animals(animal_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'volunteer')),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applications_animal_id ON applications(animal_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
