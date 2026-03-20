{
  inputs = {
    # always the bleeding edge
    nixpkgs.url = "github:nixos/nixpkgs?ref=master";
    snowfall = {
      url = "github:snowfallorg/lib";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    crane.url = "github:ipetkov/crane";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs: inputs.snowfall.mkFlake {
    inherit inputs;
    overlays = [ (import inputs.rust-overlay) ];
    src = ./.;
    alias.packages.default = "server";
  };
}
