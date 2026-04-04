use chrono::{DateTime, TimeZone, Utc};
use serde::Serialize;
use sqlx::{ColumnIndex, FromRow, Row, SqlitePool, decode, types};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Donation {
    pub donation_id: u32,
    pub donor_name: String,
    pub amount: f64,
    pub message: Option<String>,
    #[serde(serialize_with = "serialize_datetime_as_millis")]
    pub created_at: DateTime<Utc>,
}

fn serialize_datetime_as_millis<S>(date: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    let millis = date.timestamp_millis();
    serializer.serialize_i64(millis)
}

impl<'a, R: Row> FromRow<'a, R> for Donation
where
    &'a str: ColumnIndex<R>,
    String: decode::Decode<'a, R::Database>,
    String: types::Type<R::Database>,
    Option<String>: decode::Decode<'a, R::Database>,
    Option<String>: types::Type<R::Database>,
    f64: decode::Decode<'a, R::Database>,
    f64: types::Type<R::Database>,
    i64: decode::Decode<'a, R::Database>,
    i64: types::Type<R::Database>,
{
    fn from_row(row: &'a R) -> Result<Self, sqlx::Error> {
        let donation_id = row.try_get::<i64, _>("donation_id")? as u32;
        let donor_name = row.try_get::<String, _>("donor_name")?;
        let amount = row.try_get::<f64, _>("amount")?;
        let message = row.try_get::<Option<String>, _>("message")?;

        let created_at_ms = row.try_get::<i64, _>("created_at_ms")?;
        let created_at = Utc
            .timestamp_millis_opt(created_at_ms)
            .single()
            .ok_or_else(|| sqlx::Error::ColumnDecode {
                index: "created_at_ms".to_string(),
                source: "Invalid timestamp".into(),
            })?;

        Ok(Donation {
            donation_id,
            donor_name,
            amount,
            message,
            created_at,
        })
    }
}

pub struct DonationsTable {
    pool: SqlitePool,
}

impl DonationsTable {
    pub fn new(pool: SqlitePool) -> Self {
        DonationsTable { pool }
    }

    pub async fn create_donation(
        &self,
        donor_name: impl AsRef<str>,
        amount: f64,
        message: Option<&str>,
    ) -> Result<Donation, sqlx::Error> {
        let created_at_ms = Utc::now().timestamp_millis();

        sqlx::query_as::<_, Donation>(
            "INSERT INTO donations (donor_name, amount, message, created_at_ms)
			VALUES (?, ?, ?, ?)
			RETURNING *",
        )
        .bind(donor_name.as_ref())
        .bind(amount)
        .bind(message)
        .bind(created_at_ms)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_all_donations(&self) -> Result<Vec<Donation>, sqlx::Error> {
        sqlx::query_as::<_, Donation>("SELECT * FROM donations ORDER BY created_at_ms DESC")
            .fetch_all(&self.pool)
            .await
    }
}
