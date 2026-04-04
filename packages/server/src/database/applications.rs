use chrono::{DateTime, TimeZone, Utc};
use serde::Serialize;
use sqlx::{ColumnIndex, FromRow, Row, SqlitePool, decode, types};

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ApplicationStatus {
    New,
    Reviewed,
    Approved,
    Rejected,
}

impl TryFrom<String> for ApplicationStatus {
    type Error = String;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        match value.to_lowercase().as_str() {
            "new" => Ok(ApplicationStatus::New),
            "reviewed" => Ok(ApplicationStatus::Reviewed),
            "approved" => Ok(ApplicationStatus::Approved),
            "rejected" => Ok(ApplicationStatus::Rejected),
            _ => Err(format!("Invalid status value: {}", value)),
        }
    }
}

impl From<ApplicationStatus> for &str {
    fn from(status: ApplicationStatus) -> Self {
        match status {
            ApplicationStatus::New => "new",
            ApplicationStatus::Reviewed => "reviewed",
            ApplicationStatus::Approved => "approved",
            ApplicationStatus::Rejected => "rejected",
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Application {
    pub application_id: u32,
    pub pet_id: u32,
    pub applicant_name: String,
    pub applicant_email: Option<String>,
    pub applicant_phone: Option<String>,
    pub message: Option<String>,
    pub status: ApplicationStatus,
    #[serde(serialize_with = "serialize_datetime_as_millis")]
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

fn serialize_datetime_as_millis<S>(date: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    let millis = date.timestamp_millis();
    serializer.serialize_i64(millis)
}

impl<'a, R: Row> FromRow<'a, R> for Application
where
    &'a str: ColumnIndex<R>,
    String: decode::Decode<'a, R::Database>,
    String: types::Type<R::Database>,
    Option<String>: decode::Decode<'a, R::Database>,
    Option<String>: types::Type<R::Database>,
    i64: decode::Decode<'a, R::Database>,
    i64: types::Type<R::Database>,
{
    fn from_row(row: &'a R) -> Result<Self, sqlx::Error> {
        let application_id = row.try_get::<i64, _>("application_id")? as u32;
        let pet_id = row.try_get::<i64, _>("pet_id")? as u32;
        let applicant_name = row.try_get::<String, _>("applicant_name")?;
        let applicant_email = row.try_get::<Option<String>, _>("applicant_email")?;
        let applicant_phone = row.try_get::<Option<String>, _>("applicant_phone")?;
        let message = row.try_get::<Option<String>, _>("message")?;

        let status_str = row.try_get::<String, _>("status")?;
        let status =
            ApplicationStatus::try_from(status_str).map_err(|e| sqlx::Error::ColumnDecode {
                index: "status".to_string(),
                source: e.into(),
            })?;

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

        Ok(Application {
            application_id,
            pet_id,
            applicant_name,
            applicant_email,
            applicant_phone,
            message,
            status,
            created_at,
            updated_at,
        })
    }
}

pub struct ApplicationsTable {
    pool: SqlitePool,
}

impl ApplicationsTable {
    pub fn new(pool: SqlitePool) -> Self {
        ApplicationsTable { pool }
    }
}
