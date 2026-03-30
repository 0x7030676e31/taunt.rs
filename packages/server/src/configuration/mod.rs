use std::{fmt::Display, path::PathBuf, rc::Rc};

use literator::Literator;
use sha2::{Digest, Sha256};

mod cli_arguments;
mod config_file;
mod env_variables;

/// The source of a configuration option: a specific CLI argument, some
/// configuration file, an environment variable etc.
#[derive(Clone, Debug)]
pub enum Source {
    CLIArgument(&'static str, bool),
    EnvVariable(&'static str),
    TomlFileOption(Rc<PathBuf>, &'static str),
    Default,
}

impl Source {
    fn definition_site_string(&self) -> String {
        use Source::*;
        match self {
            CLIArgument(name, _) => format!("the {name} command line argument",),
            EnvVariable(name) => format!("the {name} environment variable"),
            TomlFileOption(_, name) => format!("the {name} option in the configuration file"),
            Default => "its default value".to_string(),
        }
    }

    fn source_string(&self) -> String {
        use Source::*;
        match self {
            CLIArgument(name, default) => format!(
                "the {}{name} command line argument",
                if *default { "default value of the " } else { "" }
            ),
            EnvVariable(name) => format!("the {name} environment variable"),
            TomlFileOption(file_path, name) => format!(
                "the {name} option (defined in the configuration file at {path})",
                path = file_path.display()
            ),
            Default => "its default value".to_string(),
        }
    }
}

#[derive(Clone, Debug)]
pub struct OverridingHistory(Vec<Source>);

impl OverridingHistory {
    fn with_just(source: Source) -> OverridingHistory {
        OverridingHistory(vec![source])
    }

    fn plain_english(&self) -> String {
        self.0
            .iter()
            .map(Source::source_string)
            .conjunctive_join_custom(", then overridden by ", " and then overridden by ")
            .to_string()
    }
}

pub struct ProvidedOption<T> {
    pub value: T,
    pub overriding_history: OverridingHistory,
}

impl<T> ProvidedOption<T> {
    fn show_through(&self, f: impl FnOnce(&T) -> String) -> String {
        use textwrap::{fill, indent};
        format!(
            "{}\n{}",
            f(&self.value),
            (indent(
                fill(
                    format!(
                        "provided through {}",
                        self.overriding_history.plain_english(),
                    )
                    .as_str(),
                    80,
                )
                .as_str(),
                "  ",
            )
            .as_str())
        )
    }
}

impl<T: Display> Display for ProvidedOption<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.show_through(|v| format!("{}", v)),)
    }
}

/// An optionally present configuration option with the source that defined it.
enum ConfigurationOption<T> {
    Provided(ProvidedOption<T>),
    Missing { queried_sources: Vec<Source> },
}

impl<T> ConfigurationOption<T> {
    fn missing() -> Self {
        ConfigurationOption::Missing {
            queried_sources: vec![],
        }
    }

    fn default(value: T) -> Self {
        ConfigurationOption::Provided(ProvidedOption { value, overriding_history: OverridingHistory::with_just(Source::Default) })
    }

    fn via(source: Source, value: Option<T>) -> Self {
        use ConfigurationOption::*;
        match value {
            None => Missing {
                queried_sources: vec![source],
            },
            Some(v) => Provided(ProvidedOption {
                value: v,
                overriding_history: OverridingHistory::with_just(source),
            }),
        }
    }

    fn required_as(
        self,
        option_name: &'static str,
    ) -> Result<ProvidedOption<T>, ConfigurationError> {
        use ConfigurationOption::*;
        match self {
            Provided(opt) => Ok(opt),
            Missing {
                queried_sources: sources,
            } => Err(ConfigurationError::MissingRequiredOption(
                option_name,
                sources,
            )),
        }
    }

    fn optional(self) -> Option<ProvidedOption<T>> {
        use ConfigurationOption::*;
        match self {
            Provided(opt) => Some(opt),
            _ => None,
        }
    }

    /// Merges the two options, prioritising the `other` one
    fn override_with(self, other: Self) -> Self {
        use ConfigurationOption::*;
        match other {
            // the first one is present
            Provided(ProvidedOption {
                value,
                overriding_history: mut new_history,
            }) => match self {
                // the second one is present too, merging them
                Provided(ProvidedOption {
                    overriding_history: mut old_history,
                    ..
                }) => {
                    old_history.0.append(&mut new_history.0);
                    Provided(ProvidedOption {
                        value,
                        overriding_history: old_history,
                    })
                }
                // there was no second one, passing the first one through
                _ => Provided(ProvidedOption {
                    value,
                    overriding_history: new_history,
                }),
            },

            // the first one is missing
            Missing {
                queried_sources: mut new_sources,
            } => match self {
                // merging the two "missing"s
                Missing {
                    queried_sources: mut old_sources,
                } => {
                    old_sources.append(&mut new_sources);
                    Missing {
                        queried_sources: old_sources,
                    }
                }
                // the second one wasn't missing, passing it through
                Provided(v) => Provided(v),
            },
        }
    }

    fn try_as_provided(self) -> Option<ProvidedOption<T>> {
        match self {
            ConfigurationOption::Provided(opt) => Some(opt),
            _ => None,
        }
    }
}

/// A bunch of potentially absent configuration options that do not form a full
/// configuration yet. Can be merged with each other using `.override_with`
/// and converted to a configuration via `.finalize`.
///
/// Individual options should preserve their own invariants but the entire
/// structure may not necessarily be conherent. The invariants are checked
/// by the option sources whereas the agreement between them is validated
/// by the `ConfigurationOptions::build` function.
pub struct ConfigurationOptions {
    configuration_file_path: ConfigurationOption<Rc<PathBuf>>,
    log_level: ConfigurationOption<log::Level>,
    database_key: ConfigurationOption<String>,
    stripe_api_key: ConfigurationOption<String>,
}

/// The configuration of the app
pub struct AppConfiguration {
    /// The path to the provided configuration file
    pub configuration_file_path: Option<ProvidedOption<Rc<PathBuf>>>,
    /// The log level for the server to use
    pub log_level: ProvidedOption<log::Level>,
    /// The key to the database
    pub database_key: ProvidedOption<String>,
    /// The Stripe API key
    pub stripe_api_key: ProvidedOption<String>,
}

impl Display for AppConfiguration {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.configuration_file_path
            .as_ref()
            .map(|opt| {
                writeln!(
                    f,
                    "configuration_file_path: {}",
                    opt.show_through(|v| v.to_string_lossy().to_string())
                )
            })
            .transpose()?;
        writeln!(f, "log_level: {}", self.log_level)?;
        fn hash_prefix(string: &String) -> String {
            format!(
                "{}...",
                Sha256::digest(string.as_bytes())
                    .iter()
                    .take(16)
                    .map(|b| format!("{:02x}", b))
                    .collect::<String>()
            )
        }
        writeln!(
            f,
            "database_key (hash prefix): {}",
            self.database_key.show_through(hash_prefix),
        )?;
        write!(
            f,
            "stripe_api_key (hash prefix): {}",
            self.stripe_api_key.show_through(hash_prefix),
        )?;
        Ok(())
    }
}

/// An error in the process of building the app configuration
#[derive(Debug, thiserror::Error)]
pub enum ConfigurationError {
    #[error(
        "the required configuration option {} is missing. Use {} to provide it.",
        .0,
        .1.iter().map(Source::definition_site_string).conjunctive_join_custom(", ", " or "))
    ]
    MissingRequiredOption(&'static str, Vec<Source>),
    #[error(
        "the option {option_name} was provided the value\n\n\
        {provided_value_representation}\n\n\
        which isn't valid for this option because {reason}.\n\n\
        This option was set up via {}.",
        .overriding_history.plain_english()

    )]
    ProvidedInvalidValue {
        option_name: &'static str,
        provided_value_representation: String,
        reason: &'static str,
        overriding_history: OverridingHistory,
    },
    #[error(transparent)]
    IOError(std::io::Error),
    #[error(transparent)]
    EnvyError(envy::Error),
    #[error(transparent)]
    DeserializationError(toml::de::Error),
}

impl ConfigurationError {
    fn report_and_exit(self) -> ! {
        println!(
            "{}",
            textwrap::fill(format!("Configuration error: {}", self).as_str(), 80)
        );
        std::process::exit(1)
    }
}

impl<'a> ConfigurationOptions {
    pub fn just_the_defaults() -> Self {
        ConfigurationOptions {
            configuration_file_path: ConfigurationOption::missing(),
            log_level: ConfigurationOption::default(log::Level::Info),
            database_key: ConfigurationOption::missing(),
            stripe_api_key: ConfigurationOption::missing(),
        }
    }

    /// Merges the two option sets, prioritising the ones from the `other` one.
    pub fn override_with(self, other: ConfigurationOptions) -> Self {
        ConfigurationOptions {
            configuration_file_path: self
                .configuration_file_path
                .override_with(other.configuration_file_path),
            log_level: self.log_level.override_with(other.log_level),
            database_key: self.database_key.override_with(other.database_key),
            stripe_api_key: self.stripe_api_key.override_with(other.stripe_api_key),
        }
    }

    /// Builds an `AppConfiguration` out of this set of options, ensuring that
    /// all required options are present and conform to the requirements.
    pub fn build(self) -> Result<AppConfiguration, ConfigurationError> {
        Ok(AppConfiguration {
            configuration_file_path: self.configuration_file_path.optional(),
            log_level: self.log_level.required_as("log_level")?,
            database_key: self.database_key.required_as("database_key")?,
            stripe_api_key: self.stripe_api_key.required_as("stripe_api_key")?,
        })
    }
}

pub fn build() -> Result<AppConfiguration, ConfigurationError> {
    let env_vars = env_variables::parse()?;
    let cli_args = cli_arguments::parse_or_exit();
    let configuration_file_path = ConfigurationOption::via(
        Source::CLIArgument("--config", false),
        cli_args.1.config.clone().map(Rc::new).clone(),
    )
    .override_with(ConfigurationOption::via(
        Source::EnvVariable("CONFIG"),
        env_vars.config.clone().map(Rc::new).clone(),
    ));

    let env_options = env_vars.into();
    let config_options = config_file::parse(configuration_file_path)?
        .map(Into::into)
        .unwrap_or(ConfigurationOptions::just_the_defaults());
    let cli_options = cli_args.into();
    ConfigurationOptions::just_the_defaults()
        .override_with(env_options)
        .override_with(config_options)
        .override_with(cli_options)
        .build()
}

pub fn build_or_exit_with_error() -> AppConfiguration {
    build()
        .map_err(ConfigurationError::report_and_exit)
        .into_ok()
}
