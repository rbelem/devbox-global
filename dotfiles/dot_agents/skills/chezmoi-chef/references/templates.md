# Chezmoi Templating Guide

Chezmoi uses Go's `text/template` syntax with Sprig extensions.

## Creating Templates

```bash
chezmoi add --template ~/.bashrc       # Add as template
chezmoi chattr +template ~/.bashrc     # Convert existing to template
```

Template files have `.tmpl` extension in source directory.

## Basic Syntax

```
{{ .chezmoi.hostname }}              # Variable
{{ if eq .chezmoi.os "linux" }}      # Conditional
{{ range .items }}                   # Loop
{{- .variable -}}                    # Trim whitespace
{{ /* comment */ }}                  # Comment
```

## Built-in Variables

Access with `chezmoi data` command.

### .chezmoi namespace

| Variable | Description |
|----------|-------------|
| `.chezmoi.arch` | Architecture (amd64, arm64) |
| `.chezmoi.fqdnHostname` | Fully qualified hostname |
| `.chezmoi.gid` | Group ID |
| `.chezmoi.group` | Group name |
| `.chezmoi.homeDir` | Home directory path |
| `.chezmoi.hostname` | Short hostname |
| `.chezmoi.kernel` | Kernel name |
| `.chezmoi.os` | OS (linux, darwin, windows) |
| `.chezmoi.osRelease` | OS release info (Linux) |
| `.chezmoi.sourceDir` | Chezmoi source directory |
| `.chezmoi.uid` | User ID |
| `.chezmoi.username` | Username |

### OS Release (Linux)

```
{{ .chezmoi.osRelease.id }}          # fedora, ubuntu, arch
{{ .chezmoi.osRelease.idLike }}      # rhel, debian
{{ .chezmoi.osRelease.versionID }}   # 39, 22.04
{{ .chezmoi.osRelease.name }}        # Fedora Linux
```

## Custom Variables

### In config file

```toml
# ~/.config/chezmoi/chezmoi.toml
[data]
  email = "user@example.com"
  name = "User Name"

[data.work]
  email = "user@company.com"
```

Access: `{{ .email }}`, `{{ .work.email }}`

### In data files

```yaml
# ~/.local/share/chezmoi/.chezmoidata.yaml
editor: nvim
git:
  email: user@example.com
```

## Conditionals

```
{{ if eq .chezmoi.os "darwin" }}
# macOS config
{{ else if eq .chezmoi.os "linux" }}
# Linux config
{{ end }}

{{ if and (eq .chezmoi.os "linux") (eq .chezmoi.osRelease.id "fedora") }}
# Fedora-specific
{{ end }}

{{ if or (eq .chezmoi.hostname "work") (eq .chezmoi.hostname "office") }}
# Work machines
{{ end }}

{{ if not .personal }}
# Not personal machine
{{ end }}
```

## Comparison Operators

| Function | Description |
|----------|-------------|
| `eq` | Equal |
| `ne` | Not equal |
| `lt` | Less than |
| `le` | Less than or equal |
| `gt` | Greater than |
| `ge` | Greater than or equal |

## Useful Functions

### String functions (Sprig)

```
{{ .name | lower }}                  # Lowercase
{{ .name | upper }}                  # Uppercase
{{ .name | title }}                  # Title Case
{{ .name | trim }}                   # Trim whitespace
{{ .name | replace "old" "new" }}    # Replace
{{ .name | quote }}                  # Add quotes
```

### Chezmoi functions

```
{{ include "file.txt" }}             # Include file contents
{{ stat "/path/to/file" }}           # File stat info
{{ glob "*.txt" }}                   # Glob files
{{ lookPath "nvim" }}                # Find executable
{{ output "cmd" "arg" }}             # Run command, get output
{{ joinPath .chezmoi.homeDir ".config" }}  # Join paths
```

### Prompts (interactive)

```
{{ promptString "Enter email" }}
{{ promptBool "Enable feature" }}
{{ promptInt "Enter port" }}
{{ promptChoice "Editor" (list "vim" "nvim" "emacs") }}
```

First run prompts user, then caches in config.

## Reusable Templates

Create in `.chezmoitemplates/`:

```
# .chezmoitemplates/git-config.tmpl
[user]
  name = {{ .name }}
  email = {{ .email }}
```

Include:
```
{{ template "git-config.tmpl" . }}
```

## Testing Templates

```bash
chezmoi execute-template '{{ .chezmoi.hostname }}'
chezmoi execute-template < ~/.local/share/chezmoi/dot_bashrc.tmpl
chezmoi diff  # See what would change
chezmoi cat ~/.bashrc  # See rendered output
```

## Common Patterns

### OS-specific blocks

```
{{ if eq .chezmoi.os "darwin" -}}
export HOMEBREW_PREFIX="/opt/homebrew"
{{- else if eq .chezmoi.os "linux" -}}
export HOMEBREW_PREFIX="/home/linuxbrew/.linuxbrew"
{{- end }}
```

### Machine-specific config

```
{{ if eq .chezmoi.hostname "laptop" -}}
export DISPLAY_SCALE=2
{{- end }}
```

### Optional includes

```
{{ if stat (joinPath .chezmoi.homeDir ".config/local.sh") -}}
source ~/.config/local.sh
{{- end }}
```
