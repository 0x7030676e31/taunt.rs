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

#[actix_web::post("/create-stripe-checkout-session")]
async fn create_stripe_checkout_session(
    request: actix_web::HttpRequest,
    stripe_client: web::Data<stripe::Client>,
    data: web::Query<CreateStripeCheckoutSessionData>,
    body: web::Json<CreateStripeCheckoutSessionBody>,
) -> HttpResponse {
    use stripe::*;

    if data.amount == 0 {
        return ErrorResponseBuilder::bad_request()
            .set_status("DONATION_INVALID_AMOUNT")
            .set_message("Donation amount must be greater than zero.")
            .build()
            .into();
    }

    let origin = request
        .headers()
        .get("Origin")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("http://localhost:8080");

    // Make the urlencoded query out of the body
    let CreateStripeCheckoutSessionBody {
        message,
        donor_name,
    } = body.into_inner();
    let mut query = url::form_urlencoded::Serializer::new(String::new());
    if let Some(message) = message {
        query.append_pair("message", &message);
    }
    if let Some(donor_name) = donor_name {
        query.append_pair("donor_name", &donor_name);
    }
    query.append_pair("amount", &data.amount.to_string());
    let query = query.finish();

    let session = match CheckoutSession::create(
        &stripe_client,
        CreateCheckoutSession {
            payment_method_types: Some(vec![CreateCheckoutSessionPaymentMethodTypes::Card]),
            line_items: Some(vec![CreateCheckoutSessionLineItems {
                price_data: Some(CreateCheckoutSessionLineItemsPriceData {
                    currency: Currency::USD,
                    product_data: Some(CreateCheckoutSessionLineItemsPriceDataProductData {
                        name: "Donation".to_string(),
                        ..Default::default()
                    }),
                    unit_amount: Some(data.amount.into()),
                    ..Default::default()
                }),
                quantity: Some(1),
                ..Default::default()
            }]),
            mode: Some(CheckoutSessionMode::Payment),
            success_url: Some(&format!("{}/donation-success?{}", origin, query)),
            cancel_url: Some(&origin),
            ..Default::default()
        },
    )
    .await
    {
        Ok(session) => session,
        Err(e) => {
            return ErrorResponseBuilder::internal_server_error()
                .set_message(e.to_string())
                .set_status("STRIPE_FAILED_TO_CREATE_CHECKOUT_SESSION")
                .build()
                .into();
        }
    };

    match session.url {
        Some(url) => HttpResponse::Ok().json(CreateStripeCheckoutSessionResponse { url }),
        None => ErrorResponseBuilder::internal_server_error()
            .set_status("STRIPE_CHECKOUT_SESSION_URL_MISSING")
            .set_message("Stripe checkout session did not include a redirect URL.")
            .build()
            .into(),
    }
}

pub fn routes(config: web::Data<AppConfiguration>) -> Scope {
    Scope::new("")
        .service(routes::routes())
        .service(
            actix_files::Files::new("/public", config.static_assets_dir.value.clone())
                .show_files_listing(),
        )
        .service(public::serve_index)
        .service(create_stripe_checkout_session)
}
