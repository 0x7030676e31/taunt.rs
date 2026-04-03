use std::path::PathBuf;

use crate::configuration::ConfigurationError;

use super::ConfigurationOptions;

#[derive(serde::Deserialize, Debug)]
pub struct EnvVars {
    pub config: Option<PathBuf>,
    stripe_api_key: Option<String>,
    database_key: Option<String>,
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
            database_key: via_env("DATABASE_KEY", self.database_key),
            stripe_api_key: via_env("STRIPE_API_KEY", self.stripe_api_key),
            path_to_static_assets: via_env("STATIC_ASSETS", self.static_assets),
        }
    }
}

pub fn parse() -> Result<EnvVars, ConfigurationError> {
    envy::from_env::<EnvVars>().map_err(ConfigurationError::EnvyError)
}
