use std::{fs::File, io::Read, os::unix::fs::MetadataExt, path::PathBuf, rc::Rc};

use const_format::formatcp;

use crate::configuration::{
    ConfigurationError, ConfigurationOption, ConfigurationOptions, ProvidedOption,
};

#[derive(serde::Deserialize)]
pub struct ConfigFileOptions {
    log_level: Option<log::Level>,
    static_assets: Option<PathBuf>,
}

impl Into<ConfigurationOptions> for (ProvidedOption<Rc<PathBuf>>, ConfigFileOptions) {
    fn into(self) -> ConfigurationOptions {
        use super::ConfigurationOption;
        let file_path = self.0.value.clone();
        let opt = |option_name| super::Source::TomlFileOption(file_path.clone(), option_name);
        ConfigurationOptions {
            configuration_file_path: ConfigurationOption::Provided(self.0),
            log_level: ConfigurationOption::via(opt("log_level"), self.1.log_level),
            database_key: ConfigurationOption::missing(),
            stripe_api_key: ConfigurationOption::missing(),
            path_to_static_assets: ConfigurationOption::via(
                opt("static_assets"),
                self.1.static_assets,
            ),
        }
    }
}

const SAFE_CONFIG_FILE_SIZE: u64 = 0x10000;

pub fn parse(
    configuration_file_path: ConfigurationOption<Rc<PathBuf>>,
) -> Result<Option<(ProvidedOption<Rc<PathBuf>>, ConfigFileOptions)>, ConfigurationError> {
    configuration_file_path.try_as_provided().map_or_else(
        || Ok(None),
        |opt| {
            let file = File::open(opt.value.as_path())
                .map_err(|err| ConfigurationError::IOErrorWith(opt.value.to_path_buf(), err))?;
            static REASON: &'static str = formatcp!(
                "\
                    the size of the provided configuration file is either too big (more than {}) \
                    or isn't available trough its metadata at all. If you are sure that this is \
                    the file you wanted to provide, use the --strange-config-size CLI option or \
                    the STRANGE_CONFIG_SIZE environment variable to overwrite this behavior.\
                ",
                SAFE_CONFIG_FILE_SIZE
            );
            file.metadata()
                .map(|m| m.size() <= SAFE_CONFIG_FILE_SIZE)
                .unwrap_or(false)
                .then(|| Ok(file))
                .unwrap_or(Err(ConfigurationError::ProvidedInvalidValue {
                    option_name: "configuration_file_path",
                    provided_value_representation: opt.value.to_string_lossy().to_string(),
                    reason: REASON,
                    overriding_history: opt.overriding_history.clone(),
                }))
                .and_then(|mut f| {
                    let mut contents = String::new();
                    f.read_to_string(&mut contents)
                        .map_err(|err| {
                            ConfigurationError::IOErrorWith(opt.value.to_path_buf(), err)
                        })
                        .and_then(|_| {
                            toml::from_str(contents.as_str()).map_err(|err| {
                                ConfigurationError::ErrorWhileParsingConfig(
                                    opt.value.to_path_buf(),
                                    err,
                                )
                            })
                        })
                        .map(|v| Some((opt, v)))
                })
        },
    )
}
