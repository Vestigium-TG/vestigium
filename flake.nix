{
  inputs.nixpkgs.url = "https://channels.nixos.org/nixos-unstable/nixexprs.tar.zst";

  outputs = {nixpkgs, ...}: let
    pkgs = import nixpkgs {
      system = "x86_64-linux";
    };
  in {
    devShells.x86_64-linux.default = pkgs.mkShell {
      packages = with pkgs; [
        # Python
        basedpyright
        python3
        ruff
        uv

        # JS
        nodejs
        prettier
        typescript-language-server

        # Misc
        alejandra
        dockerfile-language-server
        git
        nixd
        podman-compose
      ];
    };
  };
}
