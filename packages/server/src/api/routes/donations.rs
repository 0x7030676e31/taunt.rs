use actix_web::{HttpResponse, Scope, web};
use serde::Deserialize;

use crate::{api::error_response::ErrorResponseBuilder, database::donations::DonationsTable};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateDonationRequest {
    donor_name: Option<String>,
    amount: f64,
    message: Option<String>,
}

#[actix_web::post("")]
async fn create_donation(
    payload: web::Json<CreateDonationRequest>,
    donations_table: web::Data<DonationsTable>,
) -> HttpResponse {
    let CreateDonationRequest {
        donor_name,
        amount,
        message,
    } = payload.into_inner();

    if !amount.is_finite() || amount <= 0.0 {
        return ErrorResponseBuilder::bad_request()
            .set_status("DONATION_INVALID_AMOUNT")
            .set_message("Donation amount must be a positive number.")
            .build()
            .into();
    }

    let donor_name = donor_name
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "Anonymous donor".to_string());

    if donor_name.len() > 255 {
        return ErrorResponseBuilder::bad_request()
            .set_status("DONATION_INVALID_DONOR_NAME")
            .set_message("Donor name must be at most 255 characters long.")
            .build()
            .into();
    }

    let message = message
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    if message.as_deref().is_some_and(|value| value.len() > 512) {
        return ErrorResponseBuilder::bad_request()
            .set_status("DONATION_INVALID_MESSAGE")
            .set_message("Donation message must be at most 512 characters long.")
            .build()
            .into();
    }

    match donations_table
        .create_donation(donor_name, amount, message.as_deref())
        .await
    {
        Ok(donation) => HttpResponse::Ok().json(donation),
        Err(e) => {
            log::error!("Failed to create donation: {}", e);
            ErrorResponseBuilder::database_error()
                .set_message(format!("Failed to create donation: {}", e))
                .build()
                .into()
        }
    }
}

#[actix_web::get("")]
async fn get_donations(donations_table: web::Data<DonationsTable>) -> HttpResponse {
    match donations_table.get_all_donations().await {
        Ok(donations) => HttpResponse::Ok().json(donations),
        Err(e) => {
            log::error!("Failed to fetch donations: {}", e);
            ErrorResponseBuilder::database_error()
                .set_message(format!("Failed to fetch donations: {}", e))
                .build()
                .into()
        }
    }
}

pub fn routes() -> Scope {
    Scope::new("/donations")
        .service(create_donation)
        .service(get_donations)
}
