#![feature(unwrap_infallible)]

use std::io;

use actix_web::{App, HttpServer, web};
use log::info;
use sqlx::{SqlitePool, sqlite::SqliteConnectOptions};

use crate::{
    core::cors::Cors,
    database::{
        applications::ApplicationsTable, pets::PetsTable, token::TokensTable, users::UsersTable,
    },
};

mod api;
mod configuration;
mod core;
mod database;

#[actix_web::main]
async fn main() -> io::Result<()> {
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

    let users_table = web::Data::new(UsersTable::new(pool.clone()));
    let tokens_table = web::Data::new(TokensTable::new(pool.clone()));
    let pets_table = web::Data::new(PetsTable::new(pool.clone()));
    let applications_table = web::Data::new(ApplicationsTable::new(pool.clone()));

    let host_and_port = (config.host.value.clone(), config.port.value);
    let stripe_client = web::Data::new(stripe::Client::new(config.stripe_api_key.value.clone()));

    HttpServer::new(move || {
        App::new()
            .app_data(config.clone())
            .app_data(users_table.clone())
            .app_data(tokens_table.clone())
            .app_data(pets_table.clone())
            .app_data(applications_table.clone())
            .app_data(stripe_client.clone())
            .service(api::routes(config.clone()))
            .wrap(Cors)
    })
    .bind(host_and_port)?
    .run()
    .await
}
