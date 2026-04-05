use std::{
    fs::File,
    io::{self, Read},
    path::{Path, PathBuf},
    pin::Pin,
    task::{Context, Poll},
};

use actix_web::{
    body::SizedStream,
    web::{Bytes, BytesMut},
    Responder,
};
use futures_util::Stream;

const CHUNK_SIZE: usize = 32 * 1024; // 32 KB

struct FileStream {
    file: File,
    buffer: BytesMut,
    pos: u64,
}

impl FileStream {
    fn new(file: File) -> Self {
        Self {
            file,
            buffer: BytesMut::zeroed(CHUNK_SIZE),
            pos: 0,
        }
    }

    #[inline]
    fn file_size(&self) -> io::Result<u64> {
        self.file.metadata().map(|meta| meta.len())
    }
}

impl Stream for FileStream {
    type Item = io::Result<Bytes>;

    fn poll_next(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();

        unsafe { this.buffer.set_len(CHUNK_SIZE) };

        match this.file.read(&mut this.buffer) {
            Ok(0) => Poll::Ready(None),
            Ok(n) => {
                unsafe { this.buffer.set_len(n) };
                this.pos += n as u64;

                let chunk = this.buffer.clone().freeze();
                Poll::Ready(Some(Ok(chunk)))
            }
            Err(e) => Poll::Ready(Some(Err(e))),
        }
    }
}

pub struct FileStreamResponse {
    path: PathBuf,
    content_type: Option<String>,
    no_disposition: bool,
    no_cache: bool,
}

impl FileStreamResponse {
    pub fn new(path: impl AsRef<Path>) -> Self {
        Self {
            path: path.as_ref().into(),
            content_type: None,
            no_disposition: false,
            no_cache: false,
        }
    }

    pub fn content_type(mut self, content_type: impl Into<String>) -> Self {
        self.content_type = Some(content_type.into());
        self
    }

    pub fn no_disposition(mut self) -> Self {
        self.no_disposition = true;
        self
    }

    pub fn no_cache(mut self) -> Self {
        self.no_cache = true;
        self
    }
}

impl Responder for FileStreamResponse {
    type Body = actix_web::body::BoxBody;

    fn respond_to(self, _: &actix_web::HttpRequest) -> actix_web::HttpResponse<Self::Body> {
        let file = match File::open(&self.path) {
            Ok(f) => f,
            Err(_) => {
                return actix_web::HttpResponse::NotFound()
                    .finish()
                    .map_into_boxed_body();
            }
        };

        let file_name = match self.path.file_name().and_then(|s| s.to_str()) {
            Some(name) => name,
            None => {
                return actix_web::HttpResponse::InternalServerError()
                    .finish()
                    .map_into_boxed_body();
            }
        };

        let content_type = match &self.content_type {
            Some(ct) => ct.as_str(),
            None => {
                let ext = self.path.extension().and_then(|s| s.to_str()).unwrap_or("");
                match ext {
                    "txt" => "text/plain",
                    "html" => "text/html",
                    "json" => "application/json",
                    "css" => "text/css",
                    "js" => "application/javascript",
                    "png" => "image/png",
                    "jpg" | "jpeg" => "image/jpeg",
                    "gif" => "image/gif",
                    "pdf" => "application/pdf",
                    "svg" => "image/svg+xml",
                    "mp4" => "video/mp4",
                    "mp3" => "audio/mpeg",
                    _ => "application/octet-stream",
                }
            }
        };

        let stream = FileStream::new(file);
        let size = match stream.file_size() {
            Ok(s) => s,
            Err(_) => {
                return actix_web::HttpResponse::InternalServerError()
                    .finish()
                    .map_into_boxed_body();
            }
        };

        let mut response = actix_web::HttpResponse::Ok();
        response
            .insert_header(("Content-Type", content_type))
            .insert_header(("Content-Length", size.to_string()))
            .insert_header(("X-Content-Type-Options", "nosniff"));

        if !self.no_disposition {
            response.insert_header((
                "Content-Disposition",
                format!("attachment; filename=\"{}\"", file_name),
            ));
        }

        if self.no_cache {
            response
                .insert_header(("Cache-Control", "no-store, no-cache, must-revalidate"))
                .insert_header(("Pragma", "no-cache"))
                .insert_header(("Expires", "0"));
        } else {
            response.insert_header(("Cache-Control", "public, max-age=31536000"));
        }

        let sized = SizedStream::new(size, stream);
        response.body(sized).map_into_boxed_body()
    }
}
