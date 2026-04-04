{
  typescript, typescript-go,
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
    typescript-go
  ];
}
