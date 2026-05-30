# vbwd-fe-admin-plugin-meinchat-plus

Admin backoffice surface for **E2E-encrypted chat** (`meinchat-plus`).

Deliberately thin: messages are end-to-end encrypted, so — unlike
`meinchat-admin` — there is **no conversation inspector**. Admins can only view
a user's **registered device keys** (public material) for support / abuse
triage, behind the `meinchat.conversations.inspect` permission.

## Routes

- `/admin/meinchat-plus/devices` — look up a user's active device keys
  (public Ed25519 identity keys + labels + algorithm). Content is never shown.

## Tests

```bash
# from the fe-admin app root:
npx vitest run plugins/meinchat-plus
```

## License

BSL 1.1 — matches the VBWD SDK.
