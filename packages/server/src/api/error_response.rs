use std::fmt::{self, Debug, Display, Formatter};

use actix_web::{HttpResponse, ResponseError, body::BoxBody, http::StatusCode};
use serde::Serialize;

pub struct ErrorResponseBuilder<T: Serialize = ()> {
    response_code: StatusCode,
    status: String,
    message: String,
    body: Option<T>,
}

impl Default for ErrorResponseBuilder<()> {
    fn default() -> Self {
        Self::internal_server_error()
    }
}

impl ErrorResponseBuilder<()> {
    pub fn bad_request() -> Self {
        Self {
            response_code: StatusCode::BAD_REQUEST,
            status: "BAD_REQUEST".to_string(),
            message: "The request was invalid or could not be understood.".to_string(),
            body: None,
        }
    }

    pub fn unauthorized() -> Self {
        Self {
            response_code: StatusCode::UNAUTHORIZED,
            status: "UNAUTHORIZED".to_string(),
            message: "Authentication is required and has failed or has not yet been provided."
                .to_string(),
            body: None,
        }
    }

    pub fn forbidden() -> Self {
        Self {
            response_code: StatusCode::FORBIDDEN,
            status: "FORBIDDEN".to_string(),
            message: "You do not have permission to access this resource.".to_string(),
            body: None,
        }
    }

    pub fn not_found() -> Self {
        Self {
            response_code: StatusCode::NOT_FOUND,
            status: "NOT_FOUND".to_string(),
            message: "The requested resource could not be found.".to_string(),
            body: None,
        }
    }

    pub fn too_many_requests() -> Self {
        Self {
            response_code: StatusCode::TOO_MANY_REQUESTS,
            status: "TOO_MANY_REQUESTS".to_string(),
            message: "You have sent too many requests in a given amount of time.".to_string(),
            body: None,
        }
    }

    pub fn internal_server_error() -> Self {
        Self {
            response_code: StatusCode::INTERNAL_SERVER_ERROR,
            status: "INTERNAL_SERVER_ERROR".to_string(),
            message: "An unexpected error occurred.".to_string(),
            body: None,
        }
    }

    pub fn database_error() -> Self {
        Self {
            response_code: StatusCode::INTERNAL_SERVER_ERROR,
            status: "DATABASE_ERROR".to_string(),
            message: "An error occurred while accessing the database.".to_string(),
            body: None,
        }
    }

    pub fn conflict() -> Self {
        Self {
            response_code: StatusCode::CONFLICT,
            status: "CONFLICT".to_string(),
            message: "The request could not be completed due to a conflict with the current state of the resource."
                .to_string(),
            body: None,
        }
    }
}

impl<T: Serialize> ErrorResponseBuilder<T> {
    pub fn set_response_code(mut self, response_code: impl Into<StatusCode>) -> Self {
        self.response_code = response_code.into();
        self
    }

    pub fn set_status(mut self, status: impl Into<String>) -> Self {
        self.status = status.into();
        self
    }

    pub fn set_message(mut self, message: impl Into<String>) -> Self {
        self.message = message.into();
        self
    }

    pub fn set_body<B: Serialize>(self, body: B) -> ErrorResponseBuilder<B> {
        ErrorResponseBuilder {
            response_code: self.response_code,
            status: self.status,
            message: self.message,
            body: Some(body),
        }
    }

    pub fn build(self) -> ErrorResponse<T> {
        ErrorResponse {
            response_code: self.response_code,
            status: self.status,
            message: self.message,
            body: self.body,
        }
    }
}

#[derive(Serialize)]
pub struct ErrorResponse<T: Serialize = ()> {
    #[serde(skip)]
    response_code: StatusCode,
    status: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    body: Option<T>,
}

impl<T: Serialize + Debug> Display for ErrorResponse<T> {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "ErrorResponse {{ response_code: {}, status: {}, message: {}, body: {:?} }}",
            self.response_code, self.status, self.message, self.body
        )
    }
}

impl<T: Serialize + Debug> Debug for ErrorResponse<T> {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "ErrorResponse {{ response_code: {}, status: {}, message: {}, body: {:?} }}",
            self.response_code, self.status, self.message, self.body
        )
    }
}

impl<T: Serialize + Debug> actix_web::ResponseError for ErrorResponse<T> {
    fn status_code(&self) -> StatusCode {
        self.response_code
    }

    fn error_response(&self) -> HttpResponse<BoxBody> {
        HttpResponse::build(self.status_code())
            .append_header(("X-Error", "true"))
            .json(self)
    }
}

impl From<sqlx::Error> for ErrorResponse<()> {
    fn from(err: sqlx::Error) -> Self {
        ErrorResponseBuilder::database_error()
            .set_message(format!("Database error: {}", err))
            .build()
    }
}

impl<T: Serialize + Debug> From<ErrorResponse<T>> for HttpResponse {
    fn from(err: ErrorResponse<T>) -> HttpResponse {
        err.error_response()
    }
}
