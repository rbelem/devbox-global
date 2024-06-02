# devbox-global

## Install Dependencias
* Curl

## Install Devbox
`curl -fsSL https://get.jetify.com/devbox | bash`

## Enable the Devbox autocomplete
`echo -e '\nsource <(devbox completion bash)' >>~/.bashrc`

## Pull the global config
`devbox global pull https://github.com/rbelem/devbox-global.git`

## Enable Devbox Global
`echo -e '\nsource <(devbox global shellenv --init-hook)' >>~/.bashrc`

## If installing on a clean system
`devbox global run first-install`
