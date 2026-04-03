{ typescript, mkShell, system, inputs, ... }:

mkShell {
  packages = [
    inputs.bun2nix.packages.${system}.default
    typescript
  ];
}
