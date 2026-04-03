use actix_web::HttpRequest;
use serde::Deserialize;

use crate::api::error_response::{ErrorResponse, ErrorResponseBuilder};

#[derive(Deserialize)]
#[serde(untagged)]
enum RecaptchaResponse {
    Success {
        score: f32,
    },
    Error {
        #[serde(rename = "error-codes")]
        error: Vec<String>,
    },
}

#[derive(Debug)]
pub enum RecaptchaError {
    UnknownRemoteAddress,
    ReqwestError(reqwest::Error),
    RequestStatusError(reqwest::StatusCode),
    DeserializationError(reqwest::Error),
    ResponseError(Vec<String>),
}

impl From<RecaptchaError> for ErrorResponse {
    fn from(e: RecaptchaError) -> Self {
        match e {
            RecaptchaError::UnknownRemoteAddress => ErrorResponseBuilder::bad_request()
                .set_status("RECAPTCHA_UNKNOWN_REMOTE_ADDRESS") // [API ERROR]
                .set_message("The request does not contain a valid remote address.")
                .build(),
            RecaptchaError::ReqwestError(e) => ErrorResponseBuilder::internal_server_error()
                .set_status("RECAPTCHA_REQWEST_ERROR") // [API ERROR]
                .set_message(format!(
                    "An error occurred while verifying recaptcha: {}",
                    e
                ))
                .build(),
            RecaptchaError::RequestStatusError(status) => {
                ErrorResponseBuilder::internal_server_error()
                    .set_status("RECAPTCHA_REQUEST_STATUS_ERROR") // [API ERROR]
                    .set_message(format!(
                        "Recaptcha request returned an unexpected status: {}",
                        status
                    ))
                    .build()
            }
            RecaptchaError::DeserializationError(e) => {
                ErrorResponseBuilder::internal_server_error()
                    .set_status("RECAPTCHA_DESERIALIZATION_ERROR") // [API ERROR]
                    .set_message(format!("Failed to deserialize recaptcha response: {}", e))
                    .build()
            }
            RecaptchaError::ResponseError(e) => ErrorResponseBuilder::internal_server_error()
                .set_status("RECAPTCHA_REQUEST_ERROR") // [API ERROR]
                .set_message(format!(
                    "Recaptcha request returned an error: {}",
                    e.join(", ")
                ))
                .build(),
        }
    }
}

pub async fn recaptcha_score(
    req: &HttpRequest,
    token: impl AsRef<str>,
    key: impl AsRef<str>,
) -> Result<f32, RecaptchaError> {
    let remote_addr = {
        let connection_info = req.connection_info();
        connection_info
            .realip_remote_addr()
            .ok_or(RecaptchaError::UnknownRemoteAddress)?
            .to_string()
    };

    let params = vec![
        ("secret", key.as_ref()),
        ("response", token.as_ref()),
        ("remoteip", &remote_addr),
    ];

    let client = reqwest::Client::new();
    let response = client
        .post("https://www.google.com/recaptcha/api/siteverify")
        .query(&params)
        .header("Content-length", "0")
        .send()
        .await
        .map_err(RecaptchaError::ReqwestError)?;

    if !response.status().is_success() {
        return Err(RecaptchaError::RequestStatusError(response.status()));
    }

    let body = response
        .json::<RecaptchaResponse>()
        .await
        .map_err(RecaptchaError::DeserializationError)?;

    match body {
        RecaptchaResponse::Success { score } => Ok(score),
        RecaptchaResponse::Error { error } => Err(RecaptchaError::ResponseError(error)),
    }
}
