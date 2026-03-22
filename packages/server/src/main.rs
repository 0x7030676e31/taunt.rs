use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use indoc::indoc;
use reqwest::Client;
use serde_json::json;

#[post("/create-checkout-session")]
async fn create_checkout() -> HttpResponse {
    let client = Client::new();

    let res = client.post("https://api.stripe.com/v1/checkout/sessions")
        .bearer_auth("sk_test_51TDTyt2Ik9QxlLwY7MEAoNpQLNxW0FG6MurwDHmxY6hdCVJ3qwCQ6rRujem1thaKlp7iF9eahRN7ZyA2SuCBNO7900sZHLgZFv")
        .form(&[
            ("mode", "payment"),
            ("success_url", "http://127.0.0.1:8080/yay"),
            ("cancel_url", "https://your.site/cancel"),

            // donation item
            ("line_items[0][price_data][currency]", "usd"),
            ("line_items[0][price_data][product_data][name]", "Donation"),
            ("line_items[0][price_data][unit_amount]", "53904090"),
            ("line_items[0][quantity]", "1"),
        ])
        .send()
        .await
        .unwrap();

    let json: serde_json::Value = res.json().await.unwrap();

    let url = json["url"].as_str().unwrap();

    HttpResponse::Ok().json(json!({ "url": url }))
}

#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Ok().body(indoc!{r#"
        <p> Hello world! </p>
        <button onclick="donate()">Donate</button>
        <script>
            async function donate() {
              const res = await fetch("/create-checkout-session", {
                method: "POST"
              });
              const data = await res.json();
              window.location = data.url;
            }
        </script>
    "#})
}

#[get("/yay")]
async fn yay() -> impl Responder {
    HttpResponse::Ok().body(indoc!{r#"
        <p> yay! </p>
    "#})
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(index)
            .service(yay)
            .service(create_checkout)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
