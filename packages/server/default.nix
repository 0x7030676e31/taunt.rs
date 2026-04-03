{
  pkg-config, openssl,
  sqlite, sqlx-cli,
  pkgs, inputs,
  ...
}:

let
  crane = (inputs.crane.mkLib pkgs)
    .overrideToolchain (p: 
      p.rust-bin.nightly.latest.default.override {
        targets = [ "x86_64-pc-windows-gnu" ];
      }
    )
  ;

  commonArgs = {
    src = crane.cleanCargoSource ./.;
    strictDeps = true;
    nativeBuildInputs = [ pkg-config openssl ];
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
  };

  artifacts = crane.buildDepsOnly commonArgs;
in
  crane.buildPackage (commonArgs // {
    cargoArtifacts = artifacts;
    nativeBuildInputs = [ sqlite sqlx-cli ];
    preBuild = ''
      mkdir $out
      export DATABASE_URL=sqlite:$out/db.sqlite3
      sqlx database create
      sqlite3 $out/db.sqlite3 < ${./schema.sql}
    '';
  })
