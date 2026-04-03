{ writeShellScriptBin, inputs, stdenvNoCC, ... }:
let
  self = inputs.self;
in

writeShellScriptBin "server" ''
  export STATIC_ASSETS=${self.packages.${stdenvNoCC.hostPlatform.system}.frontend}
  exec ${self.packages.${stdenvNoCC.hostPlatform.system}.server}/bin/server "$@"
''
