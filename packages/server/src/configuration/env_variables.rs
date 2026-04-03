use std::path::PathBuf;

use super::ConfigurationOptions;
use crate::configuration::ConfigurationError;

#[derive(serde::Deserialize, Debug)]
pub struct EnvVars {
    pub config: Option<PathBuf>,
    stripe_api_key: Option<String>,
    database_url: Option<String>,
    database_key: Option<String>,
    port: Option<u16>,
    host: Option<String>,
    captcha_private_key: Option<String>,
    static_assets: Option<PathBuf>,
}

impl Into<ConfigurationOptions> for EnvVars {
    fn into(self) -> ConfigurationOptions {
        use super::ConfigurationOption;
        fn via_env<T>(var_name: &'static str, value: Option<T>) -> ConfigurationOption<T> {
            ConfigurationOption::via(super::Source::EnvVariable(var_name), value)
        }
        ConfigurationOptions {
            configuration_file_path: ConfigurationOption::missing(),
            log_level: ConfigurationOption::missing(),
            port: via_env("PORT", self.port),
            host: via_env("HOST", self.host),
            database_url: via_env("DATABASE_URL", self.database_url),
            database_key: via_env("DATABASE_KEY", self.database_key),
            captcha_private_key: via_env("CAPTCHA_PRIVATE_KEY", self.captcha_private_key),
            stripe_api_key: via_env("STRIPE_API_KEY", self.stripe_api_key),
            path_to_static_assets: via_env("STATIC_ASSETS", self.static_assets),
        }
    }
}

pub fn parse() -> Result<EnvVars, ConfigurationError> {
    envy::from_env::<EnvVars>().map_err(ConfigurationError::EnvyError)
}
