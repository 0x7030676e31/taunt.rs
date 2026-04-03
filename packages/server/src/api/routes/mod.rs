use actix_web::Scope;

mod auth;
mod socket;

pub fn routes() -> Scope {
    Scope::new("/api")
        .service(auth::routes())
        .service(socket::routes())
}
