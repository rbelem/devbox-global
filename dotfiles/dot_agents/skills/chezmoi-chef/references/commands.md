# Chezmoi Command Reference

## Core Commands

| Command | Description |
|---------|-------------|
| `chezmoi init` | Initialize source directory and optionally clone dotfiles repo |
| `chezmoi init <repo>` | Clone repo and initialize (e.g., `chezmoi init github-username`) |
| `chezmoi apply` | Apply changes from source to home directory |
| `chezmoi add <file>` | Add file to source directory |
| `chezmoi update` | Pull latest changes and apply |
| `chezmoi diff` | Show differences between source and destination |
| `chezmoi status` | Show status of managed files |

## Adding Files

```bash
chezmoi add ~/.bashrc              # Add file
chezmoi add --template ~/.bashrc   # Add as template
chezmoi add --encrypt ~/.ssh/id_rsa  # Add encrypted
chezmoi add -r ~/.config/nvim      # Add directory recursively
chezmoi add --follow ~/.config/link  # Follow symlinks
```

## Editing

```bash
chezmoi edit ~/.bashrc       # Edit source, apply on save
chezmoi edit --apply         # Auto-apply after edit
chezmoi edit-config          # Edit chezmoi config
chezmoi cd                   # Open shell in source directory
```

## Viewing & Comparing

```bash
chezmoi cat ~/.bashrc        # Show source contents
chezmoi diff                 # Diff all managed files
chezmoi diff ~/.bashrc       # Diff specific file
chezmoi status               # Show which files differ
chezmoi data                 # Show template data
chezmoi managed              # List managed files
chezmoi unmanaged            # List unmanaged files in home
```

## File Attributes

Change file attributes with `chezmoi chattr`:

```bash
chezmoi chattr +template ~/.bashrc   # Convert to template
chezmoi chattr +encrypted ~/.secret  # Mark as encrypted
chezmoi chattr +private ~/.ssh       # Mark as private (0600)
chezmoi chattr +executable ~/.local/bin/script  # Mark executable
```

Attribute prefixes in source directory:
- `dot_` - Dot file (e.g., `dot_bashrc` -> `.bashrc`)
- `private_` - Private file (mode 0600)
- `executable_` - Executable file
- `encrypted_` - Encrypted file
- `symlink_` - Symlink
- `create_` - Create if not exists, don't update
- `modify_` - Modify existing file with script
- `run_` - Run script
- `once_` - Run script only once
- `onchange_` - Run script when contents change

## Scripts

```bash
# run_ scripts execute during apply
# Naming: run_<order>_<name>.sh
# Example: run_once_install-packages.sh

# Script types:
run_          # Run every apply
run_once_     # Run only once
run_onchange_ # Run when script content changes
```

## Git Operations

```bash
chezmoi git status           # Run git in source directory
chezmoi git add .
chezmoi git commit -m "msg"
chezmoi git push
```

## State Management

```bash
chezmoi state dump           # Dump state database
chezmoi state delete-bucket --bucket=scriptState  # Reset run_once scripts
chezmoi state reset          # Reset all state
chezmoi forget ~/.bashrc     # Stop managing file
chezmoi destroy              # Remove all managed files
```

## Encryption

```bash
chezmoi age keygen           # Generate age key
chezmoi encrypt <file>       # Encrypt file
chezmoi decrypt <file>       # Decrypt file
```

## Machine Setup

One-liner for new machine:
```bash
sh -c "$(curl -fsLS get.chezmoi.io)" -- init --apply <github-username>
```

## Doctor & Debugging

```bash
chezmoi doctor               # Check system configuration
chezmoi verify               # Verify destinations match source
chezmoi execute-template '{{ .chezmoi.os }}'  # Test template
```
