use chrono::{DateTime, TimeZone, Utc};
use serde::Serialize;
use sqlx::{ColumnIndex, FromRow, Row, SqlitePool, decode, types};

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Gender {
    Male,
    Female,
}

impl TryFrom<String> for Gender {
    type Error = String;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        match value.to_lowercase().as_str() {
            "male" => Ok(Gender::Male),
            "female" => Ok(Gender::Female),
            _ => Err(format!("Invalid gender value: {}", value)),
        }
    }
}

impl From<Gender> for &str {
    fn from(gender: Gender) -> Self {
        match gender {
            Gender::Male => "male",
            Gender::Female => "female",
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Pet {
    pub pet_id: u32,
    pub name: String,
    pub age_months: u32,
    pub gender: Gender,
    pub species: String,
    pub description: String,
    pub image_url: String,
    #[serde(serialize_with = "serialize_datetime_as_millis")]
    pub created_at: DateTime<Utc>,
    #[serde(serialize_with = "serialize_datetime_as_millis")]
    pub updated_at: DateTime<Utc>,
}

fn serialize_datetime_as_millis<S>(date: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    let millis = date.timestamp_millis();
    serializer.serialize_i64(millis)
}

impl<'a, R: Row> FromRow<'a, R> for Pet
where
    &'a str: ColumnIndex<R>,
    String: decode::Decode<'a, R::Database>,
    String: types::Type<R::Database>,
    i64: decode::Decode<'a, R::Database>,
    i64: types::Type<R::Database>,
{
    fn from_row(row: &'a R) -> Result<Self, sqlx::Error> {
        let pet_id = row.try_get::<i64, _>("pet_id")? as u32;
        let name = row.try_get::<String, _>("name")?;
        let age_months = row.try_get::<i64, _>("age_months")? as u32;
        let gender_str = row.try_get::<String, _>("gender")?;
        let gender = Gender::try_from(gender_str).map_err(|e| sqlx::Error::ColumnDecode {
            index: "gender".to_string(),
            source: e.into(),
        })?;
        let species = row.try_get::<String, _>("species")?;
        let description = row.try_get::<String, _>("description")?;
        let image_url = row.try_get::<String, _>("image_url")?;
        let created_at_ms = row.try_get::<i64, _>("created_at_ms")?;
        let created_at = Utc
            .timestamp_millis_opt(created_at_ms)
            .single()
            .ok_or_else(|| sqlx::Error::ColumnDecode {
                index: "created_at_ms".to_string(),
                source: "Invalid timestamp".into(),
            })?;
        let updated_at_ms = row.try_get::<i64, _>("updated_at_ms")?;
        let updated_at = Utc
            .timestamp_millis_opt(updated_at_ms)
            .single()
            .ok_or_else(|| sqlx::Error::ColumnDecode {
                index: "updated_at_ms".to_string(),
                source: "Invalid timestamp".into(),
            })?;

        Ok(Pet {
            pet_id,
            name,
            age_months,
            gender,
            species,
            description,
            image_url,
            created_at,
            updated_at,
        })
    }
}

pub struct PetsTable {
    pool: SqlitePool,
}

impl PetsTable {
    pub fn new(pool: SqlitePool) -> Self {
        PetsTable { pool }
    }

    pub async fn create_pet(
        &self,
        name: impl AsRef<str>,
        age_months: u32,
        gender: Gender,
        species: impl AsRef<str>,
        description: impl AsRef<str>,
        image_url: impl AsRef<str>,
    ) -> Result<Pet, sqlx::Error> {
        let created_at_ms = Utc::now().timestamp_millis();
        let gender_str: &str = gender.into();
        sqlx::query_as::<_, Pet>(
            "INSERT INTO pets (name, age_months, gender, species, description, image_url, created_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?)
             RETURNING *",
        )        .bind(name.as_ref())
        .bind(age_months as i64)
        .bind(gender_str)
        .bind(species.as_ref())
        .bind(description.as_ref())
        .bind(image_url.as_ref())
        .bind(created_at_ms)
        .fetch_one(&self.pool)
        .await
    }
}
