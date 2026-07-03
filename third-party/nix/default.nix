{ inputs, self, ... }: {
  flake.nixosModules.default = import ./module.nix inputs.self;

  perSystem =
    {
      lib,
      pkgs,
      system,
      ...
    }:
    let
      commonModule = { lib, ... }: {
        imports = [ self.nixosModules.default ];

        systemd.services.matrix-venator.serviceConfig = {
          PrivatePIDs = false;
          PrivateBPF = false;
        };

        services.degoog = {
          enable = true;
          configurePostgres = true;

          # settings = {
          #   server_name = "venator.localhost";
          #   registration.admin_pre_shared_secret = "preSharedSecret";
          # };
        };
      };
    in
    {
      checks.module = pkgs.testers.runNixOSTest {
        name = "degoog";

        nodes.machine = commonModule;

        testScript = ''
          start_all()
          with subtest("start venator"):
            machine.wait_for_unit("degoog.service")
            machine.wait_for_open_port(8000)
        '';
      };

      apps = {
        run-in-vm = {
          type = "app";
          program =
            let
              nixosConfiguration = inputs.nixpkgs.lib.nixosSystem {
                inherit system;
                modules = [
                  commonModule
                  "${inputs.nixpkgs}/nixos/modules/virtualisation/qemu-vm.nix"
                  {
                    networking.firewall.enable = false;
                    services.getty.autologinUser = "root";

                    virtualisation = {
                      diskImage = null;
                      forwardPorts = [
                        {
                          from = "host";
                          host.port = 8000;
                          guest.port = 8000;
                        }
                      ];
                    };
                  }
                ];
              };
            in
            lib.getExe nixosConfiguration.config.system.build.vm;
        };
      };

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
