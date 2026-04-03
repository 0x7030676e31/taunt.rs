use std::future::{Ready, ready};

use actix_web::{
    HttpResponse,
    body::{EitherBody, MessageBody},
    dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready},
    error::Error,
    http::{Method, header},
};
use futures_util::future::LocalBoxFuture;

const METHODS: &str = "PUT, GET, OPTIONS, DELETE, POST, CONNECT, PATCH";
const HEADERS: &str = "content-type, authorization, x-session-id";
const MAX_AGE: &str = "3600";

pub struct Cors;

pub struct CorsMiddleware<S> {
    service: S,
}

impl<S, B> Transform<S, ServiceRequest> for Cors
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type InitError = ();
    type Transform = CorsMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(CorsMiddleware { service }))
    }
}

impl<S, B> Service<ServiceRequest> for CorsMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<ServiceResponse<EitherBody<B>>, Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let origin = req
            .headers()
            .get("Origin")
            .map(|h| h.to_str().unwrap_or(""))
            .unwrap_or("")
            .trim_end_matches('/')
            .to_owned();

        if req.method() == Method::OPTIONS {
            let mut res = HttpResponse::Ok();

            res.insert_header((
                header::ACCESS_CONTROL_ALLOW_ORIGIN,
                header::HeaderValue::from_str(&origin).unwrap(),
            ));

            res.insert_header((
                header::ACCESS_CONTROL_ALLOW_METHODS,
                header::HeaderValue::from_static(METHODS),
            ));

            res.insert_header((
                header::ACCESS_CONTROL_ALLOW_HEADERS,
                header::HeaderValue::from_static(HEADERS),
            ));

            res.insert_header((
                header::ACCESS_CONTROL_MAX_AGE,
                header::HeaderValue::from_static(MAX_AGE),
            ));

            let res = res.finish();
            return Box::pin(async move { Ok(req.into_response(res).map_into_right_body()) });
        }

        let fut = self.service.call(req);
        Box::pin(async move {
            let mut res = fut.await?;
            let headers = res.headers_mut();

            headers.insert(
                header::ACCESS_CONTROL_ALLOW_ORIGIN,
                header::HeaderValue::from_str(&origin).unwrap(),
            );
            headers.insert(
                header::ACCESS_CONTROL_ALLOW_METHODS,
                header::HeaderValue::from_static(METHODS),
            );
            headers.insert(
                header::ACCESS_CONTROL_ALLOW_HEADERS,
                header::HeaderValue::from_static(HEADERS),
            );
            headers.insert(
                header::ACCESS_CONTROL_MAX_AGE,
                header::HeaderValue::from_static(MAX_AGE),
            );

            Ok(res.map_into_left_body())
        })
    }
}
