[ ! -t 0 ] || [ -z "$PS1" ] && return
source <(devbox completion bash)
source <(devbox global shellenv --init-hook)
