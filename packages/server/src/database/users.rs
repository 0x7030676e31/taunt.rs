use std::{error::Error, fmt, str::FromStr};

use chrono::{DateTime, TimeZone, Utc};
use serde::Serialize;
use sqlx::{ColumnIndex, FromRow, Row, SqlitePool, decode, types};

#[derive(Debug)]
struct RoleParseError(String);

impl fmt::Display for RoleParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Error for RoleParseError {}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Volunteer,
}

impl FromStr for UserRole {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "admin" => Ok(UserRole::Admin),
            "volunteer" => Ok(UserRole::Volunteer),
            _ => Err(format!("Invalid user role: {}", s)),
        }
    }
}

impl UserRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            UserRole::Admin => "admin",
            UserRole::Volunteer => "volunteer",
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    user_id: u32,
    email: String,
    password_hash: String,
    role: UserRole,
    #[serde(serialize_with = "serialize_timestamp")]
    created_at_ms: DateTime<Utc>,
    #[serde(serialize_with = "serialize_timestamp")]
    updated_at_ms: DateTime<Utc>,
}

fn serialize_timestamp<S>(date: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    let timestamp_ms = date.timestamp_millis();
    serializer.serialize_i64(timestamp_ms)
}

impl<'a, R: Row> FromRow<'a, R> for User
where
    &'a str: ColumnIndex<R>,
    String: decode::Decode<'a, R::Database>,
    String: types::Type<R::Database>,
    i64: decode::Decode<'a, R::Database>,
    i64: types::Type<R::Database>,
{
    fn from_row(row: &'a R) -> Result<Self, sqlx::Error> {
        let user_id = row.try_get::<i64, _>("user_id")? as u32;
        let email = row.try_get::<String, _>("email")?;
        let password_hash = row.try_get::<String, _>("password_hash")?;
        let role_str = row.try_get::<String, _>("role")?;
        let role = UserRole::from_str(&role_str).map_err(|e| sqlx::Error::ColumnDecode {
            index: "role".to_string(),
            source: Box::new(RoleParseError(e)),
        })?;

        let created_at_ms = row.try_get::<i64, _>("created_at_ms")?;
        let created_at = Utc
            .timestamp_millis_opt(created_at_ms)
            .single()
            .ok_or_else(|| sqlx::Error::ColumnDecode {
                index: "created_at_ms".to_string(),
                source: "Invalid timestamp".into(),
            })?;

        let updated_at_ms = row.try_get::<i64, _>("updated_at_ms")?;
        let updated_at = Utc
            .timestamp_millis_opt(updated_at_ms)
            .single()
            .ok_or_else(|| sqlx::Error::ColumnDecode {
                index: "updated_at_ms".to_string(),
                source: "Invalid timestamp".into(),
            })?;

        Ok(User {
            user_id,
            email,
            password_hash,
            role,
            created_at_ms: created_at,
            updated_at_ms: updated_at,
        })
    }
}

pub struct UsersTable {
    pool: SqlitePool,
}

impl UsersTable {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}
