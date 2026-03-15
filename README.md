# Cluddle Callouts

Cluddle Callouts adds a searchable callout picker to the Obsidian editor context menu and command palette.

## What ships

The plugin artifact loaded by Obsidian is:

- `manifest.json`
- `main.js`
- `styles.css`

## Development

Source files live under `src/`. Build the runtime plugin artifact with:

```bash
npm install
npm run build
```

That bundles the source tree into the shipped `main.js` at the repository root.

## Notes

- Desktop only
- No network access
- Reads local Obsidian appearance settings and enabled CSS snippets from the vault config directory
