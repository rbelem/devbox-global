# Chezmoi Password Manager Integration

Chezmoi integrates with password managers via template functions. Secrets are fetched at apply time and inserted into generated files.

## 1Password

```toml
# ~/.config/chezmoi/chezmoi.toml
[onepassword]
  command = "op"
  prompt = true  # Prompt for sign-in if needed
```

Template functions:
```
{{ onepassword "item-name" }}                    # Get full item
{{ onepasswordRead "op://vault/item/field" }}    # Read specific field
{{ onepasswordDocument "document-name" }}        # Get document
```

Example `.zshrc.tmpl`:
```
export GITHUB_TOKEN='{{ onepasswordRead "op://Personal/github-token/password" }}'
```

## Bitwarden

```toml
[bitwarden]
  command = "bw"
```

```
{{ bitwarden "item" "id-or-name" }}
{{ bitwardenFields "item" "id-or-name" }}
{{ bitwardenAttachment "filename" "item-id" }}
```

## Bitwarden Secrets Manager

```toml
[bitwardenSecrets]
  command = "bws"
```

```
{{ bitwardenSecrets "secret-id" }}
```

## LastPass

```
{{ lastpass "item-name" }}
{{ lastpassRaw "item-name" }}
```

## pass (Password Store)

```
{{ pass "path/to/secret" }}
{{ passRaw "path/to/secret" }}
```

## Vault (HashiCorp)

```
{{ vault "secret/data/path" }}
```

## gopass

```
{{ gopass "path/to/secret" }}
{{ gopassRaw "path/to/secret" }}
```

## KeePassXC

```toml
[keepassxc]
  database = "/path/to/database.kdbx"
```

```
{{ keepassxc "entry-name" }}
{{ keepassxcAttribute "entry-name" "attribute" }}
```

## AWS Secrets Manager

```
{{ awsSecretsManager "secret-name" }}
```

## Azure Key Vault

```
{{ azureKeyVault "vault-name" "secret-name" }}
```

## Doppler

```
{{ doppler "project" "config" "secret-name" }}
{{ dopplerProjectJson "project" "config" }}
```

## Keychain (macOS)

```
{{ keyring "service" "user" }}
```

## Secret Command (Generic)

Run any command to get secrets:
```toml
[secret]
  command = "my-secret-tool"
```

```
{{ secret "arg1" "arg2" }}
{{ secretJSON "arg1" "arg2" }}
```

## Best Practices

1. **Never commit plaintext secrets** - Always use template functions
2. **Use `--debug` flag** to troubleshoot secret retrieval
3. **Test templates** with `chezmoi execute-template`
4. **Cache secrets** - Most integrations cache during a single apply
5. **Prompt mode** - Enable prompts for interactive sessions
