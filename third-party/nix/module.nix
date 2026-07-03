self:
(
  {
    config,
    lib,
    pkgs,
    ...
  }:
  let
    inherit (lib)
      mkIf
      getExe
      mkOption
      mkEnableOption
      mkPackageOption
      types
      ;

    inherit (types)
      path
      port
      ;

    cfg = config.services.degoog;
  in
  {
    options = {
      services.degoog = {
        enable = mkEnableOption "Enable Degoog, a Search engine aggregator with a comprehensive plugin/extension system";
        configurePostgres = mkEnableOption "postgres locally using services.postgresql";

        package = mkPackageOption self.packages.${pkgs.stdenv.hostPlatform.system} "default" { };

        port = mkOption {
          type = port;
          default = 8000;
          description = "The port that Degoog will listen on";
        };

        unixSocket = lib.mkOption {
          type = lib.types.nullOr lib.types.path;
          description = "Path to a Unix socket for Degoog to listen on";
          default = null;
          example = "/var/run/degoog/socket";
        };

        # https://github.com/degoog-org/degoog/blob/main/src/server/utils/settings-schema.ts

        enableWizard = mkEnableOption "Enable startup wizard";

        distrustProxy = mkEnableOption "Trust incoming reverse proxy connections";

        publicInstance = mkEnableOption "Whether this is a public Degoog instance";

        environmentFile = mkOption {
          type = path;
          description = ''
            EnvironmentFile as defined in {manpage}`systemd.exec(5)`.
          '';
        };
      };
    };

    config = mkIf cfg.enable {
      systemd.services.degoog = {
        description = "Search engine aggregator with a comprehensive plugin/extension system";
        after = [ "network-online.target" ];
        wants = [ "network-online.target" ];
        wantedBy = [ "multi-user.target" ];

        path = with pkgs; [
          git
          curl-impersonate
        ];

        environment = {
          DEGOOG_PORT = toString cfg.port;
          DEGOOG_UNIX_SOCKET = cfg.unixSocket;
          DEGOOG_DATA_DIR = toString config.systemd.services.degoog.serviceConfig.WorkingDirectory;
          DEGOOG_WIZARD = if cfg.enableWizard then "true" else "false";
          DEGOOG_DISTRUST_PROXY = toString cfg.distrustProxy;
          DEGOOG_PUBLIC_INSTANCE = toString cfg.publicInstance;
          BUN_INSTALL_CACHE_DIR = "/tmp/bun";
          BUN_RUNTIME_TRANSPILER_CACHE_PATH = "0";
        };

        serviceConfig = {
          Type = "simple";

          # UMask = "0077";

          WorkingDirectory = "/var/lib/degoog";
          RuntimeDirectory = "degoog";
          StateDirectory = "degoog";

          ExecStart = getExe cfg.package;
          Restart = "on-failure";
          TimeoutSec = 15;

          NoNewPrivileges = true;
          SystemCallArchitectures = "native";
          RestrictAddressFamilies = [
            "AF_INET"
            "AF_INET6"
          ];
          RestrictNamespaces = !config.boot.isContainer;
          RestrictRealtime = true;
          RestrictSUIDSGID = true;
          ProtectControlGroups = !config.boot.isContainer;
          ProtectSystem = "strict";
          ProtectHostname = true;
          ProtectKernelLogs = !config.boot.isContainer;
          ProtectKernelModules = !config.boot.isContainer;
          ProtectKernelTunables = !config.boot.isContainer;
          ProtectClock = true;
          ProtectProc = "noaccess";
          ProcSubset = "pid";
          ProtectHome = true;
          CapabilityBoundingSet = [
            "~CAP_NET_(BIND_SERVICE|BROADCAST|RAW)"
            "~CAP_AUDIT_*"
            "~CAP_SYS_ADMIN"
            "~CAP_NET_ADMIN"
            "~CAP_SYS_PACCT"
            "~CAP_SYS_PTRACE"
            "~CAP_KILL"
            "~CAP_(DAC_*|FOWNER|IPC_OWNER)"
            "~CAP_LINUX_IMMUTABLE"
            "~CAP_IPC_LOCK"
            "~CAP_BPF"
            "~CAP_SYS_TTY_CONFIG"
            "~CAP_SYS_BOOT"
            "~CAP_SYS_CHROOT"
            "~CAP_BLOCK_SUSPEND"
            "~CAP_LEASE"
            "~CAP_(CHOWN|FSETID|SETFCAP)"
            "~CAP_SET(UID|GID|PCAP)"
            "~CAP_MAC_*"
          ];
          LockPersonality = true;
          PrivateTmp = !config.boot.isContainer;
          PrivateDevices = true;
          PrivateUsers = true;
          RemoveIPC = true;

          SystemCallFilter = [
            "~@clock"
            "~@aio"
            "~@chown"
            "~@cpu-emulation"
            "~@debug"
            "~@keyring"
            "~@memlock"
            "~@module"
            "~@mount"
            "~@obsolete"
            "~@privileged"
            "~@raw-io"
            "~@reboot"
            "~@setuid"
            "~@swap"
            "~@resources"
          ];
          SystemCallErrorNumber = "EPERM";
        };
      };
    };
  }
)
