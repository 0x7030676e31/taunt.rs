use actix_web::{HttpResponse, Scope, web};

use crate::{api::error_response::ErrorResponseBuilder, configuration::AppConfiguration};

pub mod error_response;
pub mod file_stream;
pub mod public;
pub mod routes;

#[derive(serde::Deserialize, Debug)]
struct CreateStripeCheckoutSessionData {
    amount: u32,
}

#[actix_web::post("/create-stripe-checkout-session")]
async fn create_stripe_checkout_session(
    stripe_client: web::Data<stripe::Client>,
    data: web::Query<CreateStripeCheckoutSessionData>,
) -> HttpResponse {
    use stripe::*;
    CheckoutSession::create(
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
            success_url: Some("https://nixos.org"),
            cancel_url: Some("https://microsoft.com"),
            ..Default::default()
        },
    )
    .await
    .map_or_else(
        |e| {
            ErrorResponseBuilder::internal_server_error()
                .set_message(e.to_string())
                .set_status("STRIPE_FAILED_TO_CREATE_CHECKOUT_SESSION")
                .build()
                .into()
        },
        |s| HttpResponse::Ok().json(s),
    )
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
