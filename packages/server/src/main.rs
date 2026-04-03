#![feature(unwrap_infallible)]

use std::fs;

use actix_web::{App, HttpResponse, HttpServer, Responder, get, post, web};
use log::{error, info, warn};
use sqlx::{SqlitePool, sqlite::SqliteConnectOptions};

use crate::{configuration::AppConfiguration, database::users::UsersTable};

mod api;
mod app;
mod configuration;
mod database;

#[get("/")]
async fn index_page(config: web::Data<AppConfiguration>) -> HttpResponse {
    HttpResponse::Ok().body(fs::read(&config.static_asset_paths.index).unwrap_or("oopsie".into()))
}

#[actix_web::main()]
async fn main() -> Result<(), std::io::Error> {
    let config = web::Data::new(configuration::build_or_exit_with_error());
    let logger = colog::default_builder()
        .filter_level(config.log_level.value.to_level_filter())
        .build();
    log::set_max_level(log::LevelFilter::max());
    log::set_boxed_logger(Box::new(logger))
        .expect("This should be the only logger set up in the main function");

    info!("Configuration:\n{}", config.as_ref());

    let opt = SqliteConnectOptions::new().filename(&config.database_url.value);
    let pool = SqlitePool::connect_with(opt)
        .await
        .expect("Failed to connect to the database");

    let users_table = UsersTable::new(pool.clone());
    let users_table = web::Data::new(users_table);

    let host_and_port = (config.host.value.clone(), config.port.value);

    HttpServer::new(move || {
        App::new()
            .service(index_page)
            .app_data(config.clone())
            .app_data(users_table.clone())
    })
    .bind(host_and_port)?
    .run()
    .await
}
