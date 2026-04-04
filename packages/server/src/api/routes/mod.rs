use actix_web::Scope;

mod applications;
mod auth;
mod pets;

pub fn routes() -> Scope {
    Scope::new("/api")
        .service(auth::routes())
        .service(pets::routes())
}
