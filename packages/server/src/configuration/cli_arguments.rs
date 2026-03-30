use super::ConfigurationOptions;
use clap::{builder::OsStr, parser::ValueSource, ArgMatches, CommandFactory, Parser};
use std::path::PathBuf;

/// Something to implement traits for
#[derive(Clone, Debug)]
struct LogLevelParser(log::Level);

impl clap::ValueEnum for LogLevelParser {
    fn value_variants<'a>() -> &'a [LogLevelParser] {
        use log::Level::*;
        &[
            LogLevelParser(Debug),
            LogLevelParser(Trace),
            LogLevelParser(Info),
            LogLevelParser(Warn),
            LogLevelParser(Error),
        ]
    }

    fn to_possible_value(&self) -> Option<clap::builder::PossibleValue> {
        Some(clap::builder::PossibleValue::new(Into::<&str>::into(self)))
    }
}

impl Into<&'static str> for &LogLevelParser {
    fn into(self) -> &'static str {
        use log::Level::*;
        match self.0 {
            Debug => "debug",
            Trace => "trace",
            Info => "info",
            Warn => "warn",
            Error => "error",
        }
    }
}

impl Into<OsStr> for &LogLevelParser {
    fn into(self) -> OsStr {
        Into::<&str>::into(self).into()
    }
}

#[derive(clap::Parser, Debug)]
#[command(version, about)]
pub struct CLIArgs {
    #[arg(short, long)]
    log_level: Option<LogLevelParser>,
    #[arg(short, long)]
    pub config: Option<PathBuf>,
}

impl Into<ConfigurationOptions> for (ArgMatches, CLIArgs) {
    fn into(self) -> ConfigurationOptions {
        use super::ConfigurationOption;
        let source = |name| self.0.value_source(name);
        fn via_cli<T>(
            source: Option<ValueSource>,
            arg_name: &'static str,
            value: Option<T>,
        ) -> ConfigurationOption<T> {
            ConfigurationOption::via(
                super::Source::CLIArgument(
                    arg_name,
                    matches!(source, Some(ValueSource::DefaultValue)),
                ),
                value,
            )
        }
        ConfigurationOptions {
            configuration_file_path: ConfigurationOption::missing(),
            stripe_api_key: ConfigurationOption::missing(),
            database_key: ConfigurationOption::missing(),
            log_level: via_cli(
                source("log_level"),
                "--log-level",
                self.1.log_level.map(|v| v.0),
            ),
        }
    }
}

pub fn parse_or_exit() -> (ArgMatches, CLIArgs) {
    (CLIArgs::command().get_matches(), CLIArgs::parse())
}
