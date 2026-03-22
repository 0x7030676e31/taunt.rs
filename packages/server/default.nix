{
  pkg-config, openssl,
  pkgs, inputs,
  ...
}:

let
  crane = (inputs.crane.mkLib pkgs)
    .overrideToolchain (p: 
      p.rust-bin.stable.latest.default.override {
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
  })
