use actix_web::{HttpResponse, Scope, web};
use serde::Deserialize;

use crate::{
    api::error_response::ErrorResponseBuilder,
    database::{pets::PetsTable, users::User},
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreatePetRequest {
    name: String,
    age_months: u32,
    gender: String,
    species: String,
    description: String,
    image_url: String,
}

#[actix_web::post("")]
async fn create_pet(
    _: User,
    payload: web::Json<CreatePetRequest>,
    pets_table: web::Data<PetsTable>,
) -> HttpResponse {
    let CreatePetRequest {
        name,
        age_months,
        gender,
        species,
        description,
        image_url,
    } = payload.into_inner();

    let gender = match gender.try_into() {
        Ok(g) => g,
        Err(_) => {
            return ErrorResponseBuilder::bad_request()
                .set_message("Invalid gender value. Must be 'male' or 'female'.")
                .build()
                .into();
        }
    };

    if name.is_empty() || species.is_empty() || description.is_empty() || image_url.is_empty() {
        return ErrorResponseBuilder::bad_request()
            .set_message("Name, species, description, and image URL are required.")
            .build()
            .into();
    }

    if name.len() > 255 || species.len() > 255 {
        return ErrorResponseBuilder::bad_request()
            .set_message("Name and species must be at most 255 characters long.")
            .build()
            .into();
    }

    if description.len() > 1024 {
        return ErrorResponseBuilder::bad_request()
            .set_message("Description must be at most 1024 characters long.")
            .build()
            .into();
    }

    if image_url.len() > 1024 {
        return ErrorResponseBuilder::bad_request()
            .set_message("Image URL must be at most 1024 characters long.")
            .build()
            .into();
    }

    match pets_table
        .create_pet(name, age_months, gender, species, description, image_url)
        .await
    {
        Ok(pet) => HttpResponse::Ok().json(pet),
        Err(e) => {
            log::error!("Failed to create pet: {}", e);
            ErrorResponseBuilder::database_error()
                .set_message(format!("Failed to create pet: {}", e))
                .build()
                .into()
        }
    }
}

#[actix_web::get("")]
async fn get_pets(pets_table: web::Data<PetsTable>) -> HttpResponse {
    match pets_table.get_all_pets().await {
        Ok(pets) => HttpResponse::Ok().json(pets),
        Err(e) => {
            log::error!("Failed to fetch pets: {}", e);
            ErrorResponseBuilder::database_error()
                .set_message(format!("Failed to fetch pets: {}", e))
                .build()
                .into()
        }
    }
}

#[actix_web::get("/{id}")]
async fn get_pet_by_id(pets_table: web::Data<PetsTable>, pet_id: web::Path<u32>) -> HttpResponse {
    match pets_table.get_pet_by_id(pet_id.into_inner()).await {
        Ok(Some(pet)) => HttpResponse::Ok().json(pet),
        Ok(None) => ErrorResponseBuilder::not_found()
            .set_status("PET_NOT_FOUND")
            .set_message("Pet not found")
            .build()
            .into(),
        Err(e) => {
            log::error!("Failed to fetch pet by ID: {}", e);
            ErrorResponseBuilder::database_error()
                .set_message(format!("Failed to fetch pet by ID: {}", e))
                .build()
                .into()
        }
    }
}

pub fn routes() -> Scope {
    Scope::new("/pets")
        .service(create_pet)
        .service(get_pets)
        .service(get_pet_by_id)
}
