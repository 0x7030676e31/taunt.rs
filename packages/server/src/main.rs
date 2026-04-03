#![feature(unwrap_infallible)]

use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use log::{error, info, warn};
mod configuration;

//#[post("/")]
//async fn index_page() -> HttpResponse {
//    HttpResponse::Ok().
//}

fn main() {
    let config = configuration::build_or_exit_with_error();
    let logger = colog::default_builder()
        .filter_level(config.log_level.value.to_level_filter())
        .build();
    log::set_max_level(log::LevelFilter::max());
    log::set_boxed_logger(Box::new(logger))
        .expect("This should be the only logger set up in the main function");
    info!("Configuration:\n{}", config);
    warn!("text warn");
    error!("text error");
    println!("Hello, world!");
}
