use chrono::{DateTime, Duration, TimeZone, Utc};
use rand::distr::{Alphanumeric, SampleString};
use sqlx::{ColumnIndex, FromRow, Row, SqlitePool, decode, types};

use crate::api::error_response::{ErrorResponse, ErrorResponseBuilder};

const TOKEN_EXPIRATION_HOURS: i64 = 24;

pub struct Token {
    pub value: String,
    pub user_id: u32,
    pub expires_at: DateTime<Utc>,
}

impl<'a, R: Row> FromRow<'a, R> for Token
where
    &'a str: ColumnIndex<R>,
    String: decode::Decode<'a, R::Database>,
    String: types::Type<R::Database>,
    i64: decode::Decode<'a, R::Database>,
    i64: types::Type<R::Database>,
{
    fn from_row(row: &'a R) -> Result<Self, sqlx::Error> {
        let value = row.try_get::<String, _>("value")?;
        let user_id = row.try_get::<i64, _>("user_id")? as u32;
        let expires_at_ms = row.try_get::<i64, _>("expires_at_ms")?;
        let expires_at = Utc
            .timestamp_millis_opt(expires_at_ms)
            .single()
            .ok_or_else(|| sqlx::Error::ColumnDecode {
                index: "expires_at_ms".to_string(),
                source: "Invalid timestamp".into(),
            })?;

        Ok(Token {
            value,
            user_id,
            expires_at,
        })
    }
}

#[derive(Debug)]
pub enum CreateTokenError {
    UserNotFound,
    DatabaseError(sqlx::Error),
}

impl From<sqlx::Error> for CreateTokenError {
    fn from(err: sqlx::Error) -> Self {
        CreateTokenError::DatabaseError(err)
    }
}

impl From<CreateTokenError> for ErrorResponse {
    fn from(err: CreateTokenError) -> Self {
        match err {
            CreateTokenError::UserNotFound => ErrorResponseBuilder::not_found()
                .set_status("CREATE_TOKEN_USER_NOT_FOUND")
                .set_message("The specified user does not exist.")
                .build(),
            CreateTokenError::DatabaseError(e) => ErrorResponseBuilder::database_error()
                .set_message(format!("An error occurred while creating the token: {}", e))
                .build(),
        }
    }
}

pub struct TokensTable {
    pool: SqlitePool,
}

impl TokensTable {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn generate_token(&self, user_id: u32) -> Result<Token, CreateTokenError> {
        let token = Alphanumeric.sample_string(&mut rand::rng(), 32);
        let expires_at = Utc::now() + Duration::hours(TOKEN_EXPIRATION_HOURS);
        let expires_at_ms = expires_at.timestamp_millis();

        let mut tx = self.pool.begin().await.map_err(|e| {
            log::error!("Failed to begin database transaction: {}", e);
            CreateTokenError::DatabaseError(e)
        })?;

        let user_id_i64 = user_id as i64;
        let user = sqlx::query!("SELECT user_id FROM users WHERE user_id = ?", user_id_i64)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| {
                log::error!("Database query failed: {}", e);
                CreateTokenError::DatabaseError(e)
            })?;

        if user.is_none() {
            return Err(CreateTokenError::UserNotFound);
        }

        sqlx::query!(
            "INSERT INTO tokens (value, user_id, expires_at_ms) VALUES (?, ?, ?)",
            token,
            user_id_i64,
            expires_at_ms
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            log::error!("Failed to insert token into database: {}", e);
            CreateTokenError::DatabaseError(e)
        })?;

        tx.commit().await.map_err(|e| {
            log::error!("Failed to commit database transaction: {}", e);
            CreateTokenError::DatabaseError(e)
        })?;

        Ok(Token {
            value: token,
            user_id,
            expires_at,
        })
    }

    pub async fn get_token(&self, token_value: &str) -> sqlx::Result<Option<Token>> {
        sqlx::query_as::<_, Token>("SELECT * FROM tokens WHERE value = ?")
            .bind(token_value)
            .fetch_optional(&self.pool)
            .await
    }
}
