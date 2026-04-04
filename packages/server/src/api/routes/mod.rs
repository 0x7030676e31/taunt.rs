use actix_web::Scope;

mod auth;

pub fn routes() -> Scope {
    Scope::new("/api").service(auth::routes())
}
