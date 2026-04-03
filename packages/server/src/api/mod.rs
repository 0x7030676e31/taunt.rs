use actix_web::Scope;

pub mod error_response;
pub mod file_stream;
pub mod public;
pub mod routes;
pub mod sessions;

pub fn routes() -> Scope {
    Scope::new("")
        .service(routes::routes())
        .service(public::serve_asset)
        .service(public::serve_index)
}
