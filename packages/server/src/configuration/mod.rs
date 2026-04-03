use std::{error::Error, fmt::Display, fs, path::PathBuf, rc::Rc};

use itertools::Itertools;
use literator::Literator;
use serde::de::IntoDeserializer;
use sha2::{Digest, Sha256};
use xshell::cmd;

mod cli_arguments;
mod config_file;
mod env_variables;

/// The source of a configuration option: a specific CLI argument, some
/// configuration file, an environment variable etc.
#[derive(Clone, Debug)]
pub enum Source {
    /// A CLI argument source, described by its name and whether it provided the default value or
    /// not
    CLIArgument(&'static str, bool),
    /// An environment variable source, identified by the variable's name
    EnvVariable(&'static str),
    /// An option inside a TOML configuration file. The filename is stored inside an `Rc` because
    /// many options may share it as part of their source, in which case the path itself will be
    /// living in the same structure as the other options, creating a cyclic dependency of the
    /// structure that Rust's references can't yet deal with.
    ///
    /// The second parameter is the name of the option as it's defined in the file.
    TomlFileOption(Rc<PathBuf>, &'static str),
    /// The source of all default values.
    Default,
}

impl Source {
    /// Constructs a `String` representation of where this specific `Source` may be set the value
    /// of. This is used to improve the error message of the
    /// `ConfigurationError::MissingRequiredOption` error.
    fn definition_site_string(&self) -> String {
        use Source::*;
        match self {
            CLIArgument(name, _) => format!("the {name} command line argument",),
            EnvVariable(name) => format!("the {name} environment variable"),
            TomlFileOption(_, name) => format!("the {name} option in the configuration file"),
            Default => "its default value".to_string(),
        }
    }

    /// A human readable representation of what this source is.
    fn source_string(&self) -> String {
        use Source::*;
        match self {
            CLIArgument(name, default) => format!(
                "the {}{name} command line argument",
                if *default {
                    "default value of the "
                } else {
                    ""
                }
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

/// A trace of `Source`s that were used to provide the value of the option, each following one
/// overriding the one before. Used for diagnostics.
#[derive(Clone, Debug)]
pub struct OverridingHistory(Vec<Source>);

impl OverridingHistory {
    /// The initial point of construction of an `OverridingHistory`: just a single source
    fn with_just(source: Source) -> OverridingHistory {
        OverridingHistory(vec![source])
    }

    /// The plain english representation of what happened to the option to make it have its current
    /// value. You're expected to put something like "the option <a> was provided by " in front of
    /// the resulting string to make a complete sentence.
    fn plain_english(&self) -> String {
        self.0
            .iter()
            .map(Source::source_string)
            .conjunctive_join_custom(", then overridden by ", " and then overridden by ")
            .to_string()
    }
}

/// An option that has been provided a value.
pub struct ProvidedOption<T> {
    /// The value of the option.
    pub value: T,
    /// The how it came to be.
    pub overriding_history: OverridingHistory,
}

impl<T> ProvidedOption<T> {
    /// Builds a human readable representation of the value and its history.
    /// The explicit `f` argument is used for visualizing the value since the `Display` trait
    /// doesn't work for every kind of value and in practice it turned out that most options have
    /// to have a separate representation scheme anyways.
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

    fn map<U>(self, f: impl FnOnce(T) -> U) -> ProvidedOption<U> {
        ProvidedOption {
            value: f(self.value),
            overriding_history: self.overriding_history,
        }
    }

    fn ensure(
        self,
        f: impl FnOnce(&T) -> Result<(), ConfigurationError>,
    ) -> Result<Self, ConfigurationError> {
        f(&self.value).map(|()| self)
    }

    fn validate<U>(
        self,
        f: impl FnOnce(&T, &OverridingHistory) -> Result<U, ConfigurationError>,
    ) -> Result<ProvidedOption<U>, ConfigurationError> {
        Ok(ProvidedOption {
            value: f(&self.value, &self.overriding_history)?,
            overriding_history: self.overriding_history,
        })
    }
}

/// Uses `ProvidedOption::show_through` under the hood, supplying it with a trivial `format!`
/// invocation.
impl<T: Display> Display for ProvidedOption<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.show_through(|v| format!("{}", v)),)
    }
}

/// An optionally present configuration option with the source that defined it.
enum ConfigurationOption<T> {
    /// A successfully provided option
    Provided(ProvidedOption<T>),
    /// A missing option that zero or more `Source`s have failed to provide.
    /// This vector only consists of sources that actually, in principle, can provide the value for
    /// this option, but weren't supplied with any. It is used in diagnostics to show the available
    /// methods of supplied a value for the missing option.
    Missing { queried_sources: Vec<Source> },
}

impl<T> ConfigurationOption<T> {
    /// An option that nothing provided and which has no value.
    fn missing() -> Self {
        ConfigurationOption::Missing {
            queried_sources: vec![],
        }
    }

    /// An option the value of which came from the `Default` source.
    fn default(value: T) -> Self {
        ConfigurationOption::Provided(ProvidedOption {
            value,
            overriding_history: OverridingHistory::with_just(Source::Default),
        })
    }

    /// Uses the optional `value` argument as the initial source of the option.
    /// The `source` parameter specifies its kind.
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

    /// Attempts to treat the option as if it was provided.
    /// Reports a `ConfigurationError` otherwise, with the `option_name` parameter used as in the
    /// error message as the iternal name of this configuration option not tied to any specific
    /// source.
    fn required_as(
        self,
        option_name: &'static str,
    ) -> Result<ProvidedOption<T>, ConfigurationError> {
        use ConfigurationOption::*;
        match self {
            Provided(opt) => Ok(opt),
            Missing { queried_sources } => Err(if queried_sources.is_empty() {
                ConfigurationError::CantBeProvided(option_name)
            } else {
                ConfigurationError::MissingRequiredOption(option_name, queried_sources)
            }),
        }
    }

    /// Attempts to treat the option as if it was provided.
    /// Returns `None` if it wasn't.
    fn optional(self) -> Option<ProvidedOption<T>> {
        use ConfigurationOption::*;
        match self {
            Provided(opt) => Some(opt),
            _ => None,
        }
    }

    /// Merges the two options, prioritising the value of the `other` one.
    /// The histories of the two are concatenated.
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
/// The purpose of this structure is strictly to store half baked configuration data. The fields
/// provide no guarantees in regards to the actual configuration options' invariants. Those will be
/// checked when the configuration is assembled since it's easier to do it all in one place than
/// per provider.
pub struct ConfigurationOptions {
    configuration_file_path: ConfigurationOption<Rc<PathBuf>>,
    log_level: ConfigurationOption<log::Level>,
    database_key: ConfigurationOption<String>,
    stripe_api_key: ConfigurationOption<String>,
    captcha_private_key: ConfigurationOption<String>,
    path_to_static_assets: ConfigurationOption<PathBuf>,
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
    /// The CAPTCHA private key
    pub captcha_private_key: ProvidedOption<String>,
    /// The path to the static assets directory
    pub path_to_static_assets: ProvidedOption<PathBuf>,
}

/// A representation of the configuration that should be safe to share in the logs.
/// Sensitive data is obscured as much as possible while still containing some information useful
/// for understanding what's going on with the configuration.
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
        writeln!(
            f,
            "path_to_static_assets: {}",
            self.path_to_static_assets
                .show_through(|v| v.to_string_lossy().to_string())
        )?;
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
        // Only the first 16 digits of the Sha256 prefix of the sensitive keys is shown
        writeln!(
            f,
            "database_key (sha256 hash prefix): {}",
            self.database_key.show_through(hash_prefix),
        )?;
        write!(
            f,
            "stripe_api_key (sha256 hash prefix): {}",
            self.stripe_api_key.show_through(hash_prefix),
        )?;
        write!(
            f,
            "captcha_private_key (sha256 hash prefix): {}",
            self.captcha_private_key.show_through(hash_prefix),
        )?;
        Ok(())
    }
}

/// An error in the process of building the app configuration
#[derive(Debug, thiserror::Error)]
pub enum ConfigurationError {
    #[error("the option {} is required but none of the available configuration methods can supply it. This is a software bug.", .0)]
    CantBeProvided(&'static str),
    /// None of the providers that can handle a required option were used to provide it
    #[error(
        "the required configuration option {} is missing. Use {} to provide it.",
        .0,
        .1.iter().map(Source::definition_site_string).conjunctive_join_custom(", ", " or "))
    ]
    MissingRequiredOption(&'static str, Vec<Source>),
    /// The option was provided a value that breaks its invariant.
    #[error(
        "the option {option_name} was provided the value\n\n\
        {provided_value_representation}\n\n\
        which isn't valid for this option because {reason}.\n\n\
        This option was set up via {}.",
        .overriding_history.plain_english()

    )]
    ProvidedInvalidValue {
        /// The internal name of the configuration option, not tied to its definition source
        option_name: &'static str,
        /// How the provided value looks like
        provided_value_representation: String,
        /// What's wrong with the provided value, phrased to be used in error messages of the form
        /// "the value is invalid *because* [reason]". As such it's best to avoid starting it with
        /// its own sentence since that will break the grammar. Using more sentences after that,
        /// however, is allowed and will look natural.
        reason: &'static str,
        /// The trace of the value
        overriding_history: OverridingHistory,
    },
    /// An I/O error that occured while working with some specified file, most likely the
    /// configuration one.
    #[error("I/O error while working with file {}: {}", .0.to_string_lossy(), .1)]
    IOErrorWith(PathBuf, std::io::Error),
    #[error(transparent)]
    EnvyError(envy::Error),
    /// An error in configuration file's deserialization process.
    #[error("ran into issues while parsing {}:\n{}", .0.to_string_lossy(), .1)]
    ErrorWhileParsingConfig(PathBuf, toml::de::Error),
    #[error(transparent)]
    XShellError(xshell::Error),
    #[error(
        "{}, an attempt to execute the command below has been made:\n\n{}\n\n...which went in an unexpected way: {}{}",
        .context,
        textwrap::indent(command_in_question, "  "),
        .explanation,
        .raw_error
            .as_ref()
            .map(|e| format!(". Below is the original error:\n\n{}", e))
            .unwrap_or(String::new())
    )]
    UnexpectedOutputFromExternalCommand {
        context: &'static str,
        command_in_question: String,
        explanation: &'static str,
        raw_error: Option<Box<dyn Error>>,
    },
}

impl ConfigurationError {
    fn for_command<'a>(
        cmd: &xshell::Cmd<'a>,
        context: &'static str,
        explanation: &'static str,
        raw_error: Option<Box<dyn Error>>,
    ) -> Self {
        ConfigurationError::UnexpectedOutputFromExternalCommand {
            context,
            command_in_question: cmd.to_string(),
            explanation,
            raw_error,
        }
    }

    /// Prints the error to the standard output and exists
    fn report_and_exit(self) -> ! {
        println!(
            "{}",
            textwrap::fill(format!("Configuration error: {}", self).as_str(), 80)
        );
        std::process::exit(1)
    }
}

impl ConfigurationOptions {
    /// Only the default values
    pub fn just_the_defaults() -> Self {
        ConfigurationOptions {
            configuration_file_path: ConfigurationOption::missing(),
            log_level: ConfigurationOption::default(log::Level::Info),
            database_key: ConfigurationOption::missing(),
            stripe_api_key: ConfigurationOption::missing(),
            captcha_private_key: ConfigurationOption::missing(),
            path_to_static_assets: ConfigurationOption::missing(),
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
            captcha_private_key: self.captcha_private_key.override_with(other.captcha_private_key),
            path_to_static_assets: self
                .path_to_static_assets
                .override_with(other.path_to_static_assets),
        }
    }

    /// Builds an `AppConfiguration` out of this set of options, ensuring that
    /// all required options are present and conform to the requirements.
    ///
    /// May do some I/O do validate the configuration.
    pub fn build(self) -> Result<AppConfiguration, ConfigurationError> {
        Ok(AppConfiguration {
            // the invariant can't be checked since it comes from within the system itself
            configuration_file_path: self.configuration_file_path.optional(),
            // nothing here, any log level is valid
            log_level: self.log_level.required_as("log_level")?,
            // TODO: validate these against some kind of schema maybe?
            database_key: self.database_key.required_as("database_key")?,
            stripe_api_key: self.stripe_api_key.required_as("stripe_api_key")?,
            captcha_private_key: self.captcha_private_key.required_as("captcha_private_key")?,
            // the assets should live in an immutable nix store path
            path_to_static_assets: self
                .path_to_static_assets
                .required_as("path_to_resources")?
                .ensure(is_a_nix_derivation)?
                .validate(|path, overriding_history| {
                    fs::canonicalize(path)
                        .map_err(|_| ConfigurationError::ProvidedInvalidValue {
                            option_name: "path_to_static_assets",
                            provided_value_representation: path.to_string_lossy().to_string(),
                            reason: "it's not a path with a canonical representation",
                            overriding_history: overriding_history.clone(),
                        })
                })?,
        })
    }
}

fn is_a_nix_derivation(path: &PathBuf) -> Result<(), ConfigurationError> {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct NixPathInfoOutput {
        ca: Option<String>,
        deriver: PathBuf,
        nar_hash: String,
        nar_size: usize,
        references: Vec<PathBuf>,
        registration_time: u64,
        signatures: Vec<String>,
        ultimate: bool,
    }
    macro_rules! expected_version {
        () => {
            "2.31.3"
        };
    }
    static CONTEXT: &'static str =
        "in order to ensure that the provided static asset path belongs to the Nix store";
    let sh = xshell::Shell::new().map_err(ConfigurationError::XShellError)?;
    let command = cmd!(sh, "nix path-info --json {path}");
    let output = command.read().map_err(|err| {
        ConfigurationError::for_command(
            &command,
            CONTEXT,
            "the command didn't produce any useful output",
            Some(Box::new(err)),
        )
    })?;
    let parsed_output = serde_json::from_str::<serde_json::Value>(&output).map_err(|err| {
        ConfigurationError::for_command(
            &command,
            CONTEXT,
            "the output couldn't be parsed as JSON text",
            Some(Box::new(err)),
        )
    })?;
    let output_json_object_1st_field = parsed_output
        .as_object()
        .ok_or(ConfigurationError::for_command(
        &command,
        CONTEXT,
        "the output was expected to be a single JSON object but something else is there instead",
        None,
    ))?.clone().into_values().exactly_one().map_err(|_| ConfigurationError::for_command(
            &command,
            CONTEXT,
            "the output is a JSON object that doesn't have only 1 expected field",
            None,
        )
    )?;
    let _: NixPathInfoOutput =
        serde_json::from_value(output_json_object_1st_field).map_err(|err| {
            ConfigurationError::for_command(
                &command,
                CONTEXT,
                concat!(
                    "the output of the command does not match the expected schema (as of Nix",
                    expected_version!(),
                    ")"
                ),
                Some(Box::new(err)),
            )
        })?;
    Ok(())
}

/// Queries the configuration providers and tries to build the configuration.
/// Many things can go wrong in the process, check the `ConfigurationError` type to learn more
/// about them.
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

/// A shortcut for invoking `build()` and exiting with error on failure.
pub fn build_or_exit_with_error() -> AppConfiguration {
    build()
        .map_err(ConfigurationError::report_and_exit)
        .into_ok()
}
