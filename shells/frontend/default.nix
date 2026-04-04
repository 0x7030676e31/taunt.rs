{
  typescript, tsgo,
  bun,
  mkShell,
  system,
  inputs,
  ...
}:

mkShell {
  packages = [
    inputs.bun2nix.packages.${system}.default
    bun
    typescript
    tsgo
  ];
}
