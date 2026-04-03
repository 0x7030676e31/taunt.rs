use actix_web::{HttpRequest, HttpResponse, Scope, web};
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::{
    api::error_response::{ErrorResponse, ErrorResponseBuilder},
    configuration::AppConfiguration,
    core::recaptcha,
    database::{
        token::TokensTable,
        users::{User, UsersTable},
    },
};

const RECAPTCHA_THRESHOLD: f32 = 0.6;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AuthRequest {
    email: String,
    password: String,
    recaptcha_token: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthResponse {
    token: String,
    user: User,
}

#[actix_web::post("/login")]
async fn login(
    req: HttpRequest,
    payload: web::Json<AuthRequest>,
    config: web::Data<AppConfiguration>,
    users_table: web::Data<UsersTable>,
    tokens_table: web::Data<TokensTable>,
) -> HttpResponse {
    let AuthRequest {
        email,
        password,
        recaptcha_token,
    } = payload.into_inner();

    if email.is_empty() || password.is_empty() || recaptcha_token.is_empty() {
        return ErrorResponseBuilder::bad_request()
            .set_message("Email, password, and recaptcha token are required.")
            .build()
            .into();
    }

    let recaptcha_key = &config.captcha_private_key.value;
    match recaptcha::recaptcha_score(&req, &recaptcha_token, recaptcha_key).await {
        Ok(score) => {
            if score < RECAPTCHA_THRESHOLD {
                return ErrorResponseBuilder::bad_request()
                    .set_status("RECAPTCHA_VERIFICATION_FAILED")
                    .set_message("Recaptcha verification failed. Please try again.")
                    .build()
                    .into();
            }
        }
        Err(e) => {
            return ErrorResponse::from(e).into();
        }
    }

    let user = match users_table.get_user_by_creds(&email, &password).await {
        Ok(Some(user)) => user,
        Ok(None) => {
            return ErrorResponseBuilder::bad_request()
                .set_status("LOGIN_INVALID_CREDENTIALS")
                .set_message("Invalid email or password.")
                .build()
                .into();
        }
        Err(e) => {
            return ErrorResponseBuilder::database_error()
                .set_message(format!("An error occurred while fetching user data: {e}"))
                .build()
                .into();
        }
    };

    match tokens_table.generate_token(user.user_id).await {
        Ok(token) => HttpResponse::Ok().json(AuthResponse {
            token: token.value,
            user,
        }),
        Err(e) => ErrorResponse::from(e).into(),
    }
}

fn validate_email(email: &str) -> bool {
    let email_regex =
        Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").expect("Failed to compile email regex");
    email_regex.is_match(email)
}

fn validate_password(password: &str) -> Result<(), &'static str> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters long.");
    }
    if !password.chars().any(|c| c.is_uppercase()) {
        return Err("Password must contain at least one uppercase letter.");
    }
    if !password.chars().any(|c| c.is_lowercase()) {
        return Err("Password must contain at least one lowercase letter.");
    }
    if !password.chars().any(|c| c.is_digit(10)) {
        return Err("Password must contain at least one digit.");
    }
    if !password.chars().any(|c| !c.is_alphanumeric()) {
        return Err("Password must contain at least one special character.");
    }

    Ok(())
}

#[actix_web::post("/register")]
async fn register(
    req: HttpRequest,
    payload: web::Json<AuthRequest>,
    config: web::Data<AppConfiguration>,
    users_table: web::Data<UsersTable>,
    tokens_table: web::Data<TokensTable>,
) -> HttpResponse {
    let AuthRequest {
        email,
        password,
        recaptcha_token,
    } = payload.into_inner();

    if email.is_empty() || password.is_empty() || recaptcha_token.is_empty() {
        return ErrorResponseBuilder::bad_request()
            .set_message("Email, password, and recaptcha token are required.")
            .build()
            .into();
    }

    if !validate_email(&email) {
        return ErrorResponseBuilder::bad_request()
            .set_status("REGISTER_INVALID_EMAIL_FORMAT")
            .set_message("Invalid email format.")
            .build()
            .into();
    }

    if let Err(e) = validate_password(&password) {
        return ErrorResponseBuilder::bad_request()
            .set_status("REGISTER_WEAK_PASSWORD")
            .set_message(e)
            .build()
            .into();
    }

    let recaptcha_key = &config.captcha_private_key.value;
    match recaptcha::recaptcha_score(&req, &recaptcha_token, recaptcha_key).await {
        Ok(score) => {
            if score < RECAPTCHA_THRESHOLD {
                return ErrorResponseBuilder::bad_request()
                    .set_status("RECAPTCHA_VERIFICATION_FAILED")
                    .set_message("Recaptcha verification failed. Please try again.")
                    .build()
                    .into();
            }
        }
        Err(e) => {
            return ErrorResponse::from(e).into();
        }
    }

    let user = match users_table.create_user(&email, &password).await {
        Ok(user) => user,
        Err(e) => return ErrorResponse::from(e).into(),
    };

    match tokens_table.generate_token(user.user_id).await {
        Ok(token) => HttpResponse::Ok().json(AuthResponse {
            token: token.value,
            user,
        }),
        Err(e) => ErrorResponse::from(e).into(),
    }
}

pub fn routes() -> Scope {
    Scope::new("/auth").service(login).service(register)
}
