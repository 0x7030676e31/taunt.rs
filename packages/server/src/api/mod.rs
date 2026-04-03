use actix_web::{Scope, web};

use crate::configuration::AppConfiguration;

pub mod error_response;
pub mod file_stream;
pub mod public;
pub mod routes;

pub fn routes(config: web::Data<AppConfiguration>) -> Scope {
    Scope::new("")
        .service(routes::routes())
        .service(
            actix_files::Files::new("/public", config.static_assets_dir.value.clone())
                .show_files_listing(),
        )
        .service(public::serve_index)
}
