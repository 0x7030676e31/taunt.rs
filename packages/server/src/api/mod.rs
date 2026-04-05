use actix_web::{HttpResponse, Scope, web};
use serde::{Deserialize, Serialize};

use crate::{api::error_response::ErrorResponseBuilder, configuration::AppConfiguration};

pub mod error_response;
pub mod file_stream;
pub mod public;
pub mod routes;

#[derive(Deserialize, Debug)]
struct CreateStripeCheckoutSessionData {
    amount: u32,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct CreateStripeCheckoutSessionBody {
    message: Option<String>,
    donor_name: Option<String>,
}

#[derive(Serialize)]
struct CreateStripeCheckoutSessionResponse {
    url: String,
}

pub fn routes(config: web::Data<AppConfiguration>) -> Scope {
    Scope::new("")
        .service(routes::routes())
        .service(
            actix_files::Files::new("/public", config.static_assets_dir.value.clone())
                .show_files_listing(),
        )
        .service(public::serve_index)
}
