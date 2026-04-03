{ stdenvNoCC, inputs, ... }:

let
  bun2nix = inputs.bun2nix.packages.${stdenvNoCC.hostPlatform.system}.bun2nix;

in stdenvNoCC.mkDerivation {
  pname = "taunt.rs-frontend";
  version = "1.0.0";

  src = ./.;

  nativeBuildInputs = [
    bun2nix.hook
  ];

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ./bun.nix;
  };

  buildPhase = ''
    bun run build \
      --minify
  '';

  installPhase = ''
    mkdir -p $out/dist
    cp -R ./dist/* $out
  '';
}
