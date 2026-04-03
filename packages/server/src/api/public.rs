use std::path::{Component, Path};

use actix_web::{Error, error, web};

use crate::{api::file_stream::FileStreamResponse, configuration::AppConfiguration};

#[actix_web::get("/public/{filename:.*}")]
pub async fn serve_asset(
    filename: web::Path<String>,
    config: web::Data<AppConfiguration>,
) -> Result<FileStreamResponse, Error> {
    let filename = filename.into_inner();
    if filename.is_empty() {
        return Err(error::ErrorBadRequest("Filename cannot be empty"));
    }

    if filename.contains("..") {
        return Err(error::ErrorBadRequest("Filename cannot contain '..'"));
    }

    let path = Path::new(&filename);
    let is_safe = path.components().all(|c| matches!(c, Component::Normal(_)));

    if !is_safe {
        return Err(error::ErrorBadRequest("Invalid filename"));
    }

    let full_path = config.static_assets_dir.value.join(&filename);
    if !full_path.exists() {
        return Err(error::ErrorNotFound("File not found"));
    }

    if !full_path.is_file() {
        return Err(error::ErrorBadRequest("Requested path is not a file"));
    }

    let stream = FileStreamResponse::new(full_path);
    Ok(stream)
}

#[actix_web::get("/{_:.*}")]
pub async fn serve_index(config: web::Data<AppConfiguration>) -> Result<FileStreamResponse, Error> {
    let stream = FileStreamResponse::new(&config.static_asset_paths.index)
        .no_cache()
        .no_disposition();

    Ok(stream)
}
