{ inputs, ... }: {
  perSystem =
    {
      pkgs,
      system,
      ...
    }:
    {
      packages =
        let
          bun2nix = inputs.bun2nix.packages.${system}.default;
        in
        {
          default = pkgs.callPackage ./package.nix {
            inherit bun2nix;
            src = inputs.self;
          };
        };
    };
}
