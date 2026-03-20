{ pkgs, inputs, ... }:

let
  crane = (inputs.crane.mkLib pkgs)
    .overrideToolchain (p: 
      p.rust-bin.stable.latest.default.override {
        targets = [ "x86_64-pc-windows-gnu" ];
      }
    )
  ;

  artifacts = crane.buildDepsOnly commonArgs;

  commonArgs = {
    src = crane.cleanCargoSource ./.;
    strictDeps = true;
  };

in
  crane.buildPackage (commonArgs // {
    cargoArtifacts = artifacts;
  })
