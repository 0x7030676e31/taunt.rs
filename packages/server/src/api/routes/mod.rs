use actix_web::Scope;

mod applications;
mod auth;
mod donations;
mod pets;
mod stripe;

pub fn routes() -> Scope {
    Scope::new("/api")
        .service(auth::routes())
        .service(pets::routes())
        .service(applications::routes())
        .service(donations::routes())
        .service(stripe::create_stripe_checkout_session)
}
