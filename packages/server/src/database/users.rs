use std::{
    future::{Future, ready},
    pin::Pin,
};

use actix_web::{FromRequest, web};
use chrono::{DateTime, TimeZone, Utc};
use serde::Serialize;
use sha2::{Digest, Sha256};
use sqlx::{ColumnIndex, FromRow, Row, SqlitePool, decode, types};

use crate::{
    api::error_response::{ErrorResponse, ErrorResponseBuilder},
    database::token::TokensTable,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub user_id: u32,
    pub email: String,
    pub password_hash: String,
    #[serde(serialize_with = "serialize_datetime_as_millis")]
    pub created_at: DateTime<Utc>,
    #[serde(serialize_with = "serialize_datetime_as_millis")]
    pub updated_at: DateTime<Utc>,
}

fn serialize_datetime_as_millis<S>(date: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    let millis = date.timestamp_millis();
    serializer.serialize_i64(millis)
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
            created_at,
            updated_at,
        })
    }
}

enum FromRequestError {
    MissingAuthenticationHeader,
    InvalidAuthenticationHeader,
    TokenTableNotInitialized,
    UserTableNotInitialized,
    TokenNotFound,
    TokenInvalid,
    UserNotFound,
    DatabaseError(sqlx::Error),
}

impl From<sqlx::Error> for FromRequestError {
    fn from(err: sqlx::Error) -> Self {
        FromRequestError::DatabaseError(err)
    }
}

impl From<FromRequestError> for ErrorResponse {
    fn from(error: FromRequestError) -> Self {
        match error {
            FromRequestError::MissingAuthenticationHeader => ErrorResponseBuilder::unauthorized()
                .set_status("AUTHENTICATION_HEADER_MISSING") // [API ERROR]
                .set_message("User is not authenticated.")
                .build(),
            FromRequestError::InvalidAuthenticationHeader => ErrorResponseBuilder::bad_request()
                .set_status("AUTHENTICATION_HEADER_INVALID") // [API ERROR]
                .set_message("Authorization header is not valid.")
                .build(),
            FromRequestError::TokenTableNotInitialized => {
                ErrorResponseBuilder::internal_server_error()
                    .set_status("AUTHENTICATION_TOKEN_TABLE_NOT_INITIALIZED") // [API ERROR]
                    .set_message("Token table is not initialized.")
                    .build()
            }
            FromRequestError::UserTableNotInitialized => {
                ErrorResponseBuilder::internal_server_error()
                    .set_status("AUTHENTICATION_USER_TABLE_NOT_INITIALIZED") // [API ERROR]
                    .set_message("User table is not initialized.")
                    .build()
            }
            FromRequestError::TokenNotFound => ErrorResponseBuilder::unauthorized()
                .set_status("AUTHENTICATION_TOKEN_NOT_FOUND") // [API ERROR]
                .set_message("The provided token does not exist.")
                .build(),
            FromRequestError::TokenInvalid => ErrorResponseBuilder::unauthorized()
                .set_status("AUTHENTICATION_TOKEN_INVALID") // [API ERROR]
                .set_message("The provided token is not valid.")
                .build(),
            FromRequestError::UserNotFound => ErrorResponseBuilder::unauthorized()
                .set_status("AUTHENTICATION_USER_NOT_FOUND") // [API ERROR]
                .set_message("The user associated with the token does not exist.")
                .build(),
            FromRequestError::DatabaseError(e) => ErrorResponseBuilder::database_error()
                .set_message(format!("An error occurred while fetching user data: {e}"))
                .build(),
        }
    }
}

impl FromRequest for User {
    type Error = ErrorResponse;
    type Future = Pin<Box<dyn Future<Output = Result<Self, Self::Error>>>>;

    fn from_request(req: &actix_web::HttpRequest, _: &mut actix_web::dev::Payload) -> Self::Future {
        let token = match req.headers().get("Authorization") {
            Some(header) => header,
            None => {
                return Box::pin(ready(Err(
                    FromRequestError::MissingAuthenticationHeader.into()
                )));
            }
        };

        let token_str = match token.to_str() {
            Ok(s) => s.to_owned(),
            Err(_) => {
                return Box::pin(ready(Err(
                    FromRequestError::InvalidAuthenticationHeader.into()
                )));
            }
        };

        let token_table = match req.app_data::<web::Data<TokensTable>>() {
            Some(table) => table,
            None => {
                return Box::pin(ready(
                    Err(FromRequestError::TokenTableNotInitialized.into()),
                ));
            }
        };

        let user_table = match req.app_data::<web::Data<UsersTable>>() {
            Some(table) => table,
            None => {
                return Box::pin(ready(Err(FromRequestError::UserTableNotInitialized.into())));
            }
        };

        let token_table = token_table.clone();
        let user_table = user_table.clone();

        Box::pin(async move {
            let token = token_table
                .get_token(&token_str)
                .await
                .map_err(|e| -> ErrorResponse { FromRequestError::DatabaseError(e).into() })?;

            let token = match token {
                Some(t) => t,
                None => return Err(FromRequestError::TokenNotFound.into()),
            };

            let now = Utc::now();
            if token.expires_at < now {
                return Err(FromRequestError::TokenInvalid.into());
            }

            let user = user_table
                .get_user(token.user_id)
                .await
                .map_err(|e| -> ErrorResponse { FromRequestError::DatabaseError(e).into() })?;

            match user {
                Some(u) => Ok(u),
                None => Err(FromRequestError::UserNotFound.into()),
            }
        })
    }
}

pub enum CreateUserError {
    EmailConflict,
    DatabaseError(sqlx::Error),
}

impl From<sqlx::Error> for CreateUserError {
    fn from(err: sqlx::Error) -> Self {
        CreateUserError::DatabaseError(err)
    }
}

impl From<CreateUserError> for ErrorResponse {
    fn from(error: CreateUserError) -> Self {
        match error {
            CreateUserError::EmailConflict => ErrorResponseBuilder::conflict()
                .set_status("REGISTER_USER_EMAIL_CONFLICT") // [API ERROR]
                .set_message("A user with the provided email already exists.")
                .build(),
            CreateUserError::DatabaseError(e) => ErrorResponseBuilder::database_error()
                .set_message(format!("An error occurred while creating the user: {e}"))
                .build(),
        }
    }
}

pub struct UsersTable {
    pool: SqlitePool,
}

impl UsersTable {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create_user(&self, email: &str, password: &str) -> Result<User, CreateUserError> {
        let password_hash = Sha256::digest(password.as_bytes());
        let password_hash_hex = password_hash
            .iter()
            .map(|byte| format!("{:02x}", byte))
            .collect::<String>();

        let now = Utc::now();
        let now_ms = now.timestamp_millis();

        let mut tx = self.pool.begin().await.map_err(|e| {
            log::error!("Failed to begin transaction for creating user: {}", e);
            CreateUserError::DatabaseError(e)
        })?;

        let result = sqlx::query!("SELECT user_id FROM users WHERE email = ?", email)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| {
                log::error!(
                    "Failed to check for existing user with email {}: {}",
                    email,
                    e
                );
                CreateUserError::DatabaseError(e)
            })?;

        if result.is_some() {
            return Err(CreateUserError::EmailConflict);
        }

        let insert_result = sqlx::query!(
            "INSERT INTO users (email, password_hash, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?)",
            email,
            password_hash_hex,
            now_ms,
            now_ms
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            log::error!("Failed to insert new user into database: {}", e);
            CreateUserError::DatabaseError(e)
        })?;

        let user_id = insert_result.last_insert_rowid() as u32;
        tx.commit().await.map_err(|e| {
            log::error!("Failed to commit transaction for creating user: {}", e);
            CreateUserError::DatabaseError(e)
        })?;

        Ok(User {
            user_id,
            email: email.to_string(),
            password_hash: password_hash_hex,
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn get_user(&self, user_id: u32) -> sqlx::Result<Option<User>> {
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE user_id = ?")
            .bind(user_id as i64)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn get_user_by_creds(
        &self,
        email: &str,
        password: &str,
    ) -> sqlx::Result<Option<User>> {
        let password_hash = Sha256::digest(password.as_bytes());
        let password_hash_hex = password_hash
            .iter()
            .map(|byte| format!("{:02x}", byte))
            .collect::<String>();

        sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = ? AND password_hash = ?")
            .bind(email)
            .bind(password_hash_hex)
            .fetch_optional(&self.pool)
            .await
    }
}
