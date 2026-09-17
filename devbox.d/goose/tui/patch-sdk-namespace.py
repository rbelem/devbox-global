#!/usr/bin/env python3
"""Patch @aaif/goose-sdk so its ACP method names match the goose binary.

Context (goose 1.46.0 paired with @aaif/goose@0.20.1 TUI): the TUI's SDK
calls extension methods under the non-prefixed namespace ``_goose/...``
(e.g. ``_goose/defaults/read``), but the goose binary serves them under
``_goose/unstable/...`` (e.g. ``_goose/unstable/defaults/read``). A few
methods are also renamed (``dictation/model/select`` -> ``models``,
``session/update_project`` -> ``session/project/update``, and
``config/extensions/toggle`` -> ``config/extensions/set-enabled``). Without
this patch the TUI loops on "Setup error / Method not found".

This script rewrites the ``extMethod("_goose/...")`` strings in the built
``dist/generated/client.gen.js`` to the names the binary actually serves.
"""

import sys

# SDK method -> binary method. Only methods the binary genuinely serves are
# listed; the handful it does NOT serve at all (`_goose/tools`,
# `_goose/tool/call`, `_goose/resource/read`, `_goose/working_dir/update`,
# `_goose/config/extensions`, `_goose/extensions/{add,remove}`,
# `_goose/session/extensions`) are intentionally left untouched.
MAPPING = {
    "_goose/defaults/read": "_goose/unstable/defaults/read",
    "_goose/defaults/save": "_goose/unstable/defaults/save",
    "_goose/preferences/read": "_goose/unstable/preferences/read",
    "_goose/preferences/remove": "_goose/unstable/preferences/remove",
    "_goose/preferences/save": "_goose/unstable/preferences/save",
    "_goose/providers/list": "_goose/unstable/providers/list",
    "_goose/providers/catalog/list": "_goose/unstable/providers/catalog/list",
    "_goose/providers/catalog/template": "_goose/unstable/providers/catalog/template",
    "_goose/providers/config/authenticate": "_goose/unstable/providers/config/authenticate",
    "_goose/providers/config/delete": "_goose/unstable/providers/config/delete",
    "_goose/providers/config/read": "_goose/unstable/providers/config/read",
    "_goose/providers/config/save": "_goose/unstable/providers/config/save",
    "_goose/providers/config/status": "_goose/unstable/providers/config/status",
    "_goose/providers/custom/create": "_goose/unstable/providers/custom/create",
    "_goose/providers/custom/delete": "_goose/unstable/providers/custom/delete",
    "_goose/providers/custom/read": "_goose/unstable/providers/custom/read",
    "_goose/providers/custom/update": "_goose/unstable/providers/custom/update",
    "_goose/providers/inventory/refresh": "_goose/unstable/providers/inventory/refresh",
    "_goose/providers/setup/catalog/list": "_goose/unstable/providers/setup/catalog/list",
    "_goose/sources/create": "_goose/unstable/sources/create",
    "_goose/sources/delete": "_goose/unstable/sources/delete",
    "_goose/sources/export": "_goose/unstable/sources/export",
    "_goose/sources/import": "_goose/unstable/sources/import",
    "_goose/sources/list": "_goose/unstable/sources/list",
    "_goose/sources/update": "_goose/unstable/sources/update",
    "_goose/dictation/config": "_goose/unstable/dictation/config",
    "_goose/dictation/models/cancel": "_goose/unstable/dictation/models/cancel",
    "_goose/dictation/models/delete": "_goose/unstable/dictation/models/delete",
    "_goose/dictation/models/download": "_goose/unstable/dictation/models/download",
    "_goose/dictation/models/download/progress": "_goose/unstable/dictation/models/download/progress",
    "_goose/dictation/models/list": "_goose/unstable/dictation/models/list",
    "_goose/dictation/model/select": "_goose/unstable/dictation/models/select",
    "_goose/dictation/secret/delete": "_goose/unstable/dictation/secret/delete",
    "_goose/dictation/secret/save": "_goose/unstable/dictation/secret/save",
    "_goose/dictation/transcribe": "_goose/unstable/dictation/transcribe",
    "_goose/onboarding/import/apply": "_goose/unstable/onboarding/import/apply",
    "_goose/onboarding/import/scan": "_goose/unstable/onboarding/import/scan",
    "_goose/session/archive": "_goose/unstable/session/archive",
    "_goose/session/export": "_goose/unstable/session/export",
    "_goose/session/import": "_goose/unstable/session/import",
    "_goose/session/rename": "_goose/unstable/session/rename",
    "_goose/session/unarchive": "_goose/unstable/session/unarchive",
    "_goose/session/update_project": "_goose/unstable/session/project/update",
    "_goose/config/extensions/add": "_goose/unstable/config/extensions/add",
    "_goose/config/extensions/remove": "_goose/unstable/config/extensions/remove",
    "_goose/config/extensions/toggle": "_goose/unstable/config/extensions/set-enabled",
}


def patch(path: str) -> int:
    with open(path) as f:
        text = f.read()

    count = 0
    # longest-first so no rewrite is shadowed by a shorter prefix
    for src, dst in sorted(MAPPING.items(), key=lambda kv: -len(kv[0])):
        needle = f'extMethod("{src}"'
        if needle in text:
            text = text.replace(needle, f'extMethod("{dst}"')
            count += 1

    with open(path, "w") as f:
        f.write(text)

    return count


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else (
        "node_modules/@aaif/goose-sdk/dist/generated/client.gen.js"
    )
    n = patch(target)
    print(f"patched {n} method names in {target}")
