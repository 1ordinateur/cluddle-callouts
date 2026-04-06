# Cluddle Callouts

Cluddle Callouts is an Obsidian plugin that makes callouts easier to insert, switch, and discover while editing notes.

It adds a searchable callout picker to the editor right-click menu and provides a command to open the same picker from anywhere in Obsidian. The picker includes Obsidian's built-in callouts and also detects custom callouts defined by your enabled CSS snippets.

If you use a lot of custom callouts, this plugin saves you from remembering callout ids or manually rewriting block syntax. You can search, preview, insert, replace, and remove callouts from one place while staying in the editor.

## Example

![Cluddle Callouts picker example](docs/readme-example.png)

## Install From GitHub

Until the plugin is available in Obsidian Community Plugins, install it from the latest GitHub release:

1. Download `manifest.json`, `main.js`, and `styles.css` from the latest release on GitHub.
2. Create a folder named `cluddle-callouts` inside your vault at `.obsidian/plugins/`.
3. Copy those three files into `.obsidian/plugins/cluddle-callouts/`.
4. Open Obsidian and go to `Settings` → `Community plugins`.
5. Make sure community plugins are enabled, then enable `Cluddle Callouts`.

Development installs from a local clone still work as usual, but GitHub releases are the intended install path until the store listing is live.

## What This Plugin Does

- Inserts a new callout at the cursor
- Wraps the current selection in a callout
- Changes the type of an existing callout in place
- Removes a callout from the current block
- Lets you search across built-in and custom callouts from one picker
- Prefers custom callouts in search results when that setting is enabled

## How To Use It

1. Open a note in Obsidian.
2. Right-click in the editor and choose the callout action, or run the `Open callout picker` command.
3. Search for the callout you want.
4. Use `ArrowUp`, `ArrowDown`, `ArrowLeft`, and `ArrowRight` to move around the picker if needed.
5. Press `Enter` to apply the selected result, or click an item directly.

If your cursor is already inside a callout, `Open callout picker` inserts a nested callout instead of changing the current header. Use `Rename current callout type` if you want to retag the current callout itself.

## Custom Callouts

The plugin reads enabled CSS snippets from your vault's Obsidian config and looks for `.callout[data-callout="..."]` definitions. That means custom callouts can show up in the picker automatically without requiring a separate plugin-specific registry.

The format it looks for is:

```css
.callout[data-callout="primary-id"],
.callout[data-callout="alias-id"] {
  --callout-color: 230, 126, 34;
  --callout-icon: lucide-stethoscope;
  --callout-concept: recognition;
  --callout-groups: medical;
  --callout-group-medical: primary-id alias-id;
}
```

The plugin currently uses these properties:

- `data-callout="..."` selectors to collect the primary id and aliases
- `--callout-color` to color the picker preview
- `--callout-groups` to decide which group or groups the callout belongs to
- `--callout-group-<group-name>` to define the label shown for that group entry and its aliases
- `--callout-concept` as optional metadata for organizing related callouts in your snippet
- `--callout-icon` for the rendered Obsidian callout itself; the picker does not currently parse icons

A complete real-world example is included in `docs/example-medical-callouts.css`.

Here is a small example of a CSS snippet entry that this plugin can process:

```css
.callout[data-callout="indicated"],
.callout[data-callout="recommended"] {
  --callout-color: 230, 126, 34;
  --callout-concept: drug-usage;
  --callout-groups: drug disease;
  --callout-group-drug: indicated;
  --callout-group-disease: symptoms;
}
```

With that snippet enabled in Obsidian:

- `indicated` is treated as the primary callout id
- `recommended` is treated as an alias for the same callout
- the callout appears in the picker under the `drug` group as `Indicated`
- the same underlying callout also appears under the `disease` group as `Symptoms`
- the picker inherits the CSS callout color automatically

You can define additional groups with more `--callout-group-<group-name>` properties. The alias list for each group is whitespace- or comma-separated, and the first alias becomes the displayed picker entry for that group.

## Settings

The plugin includes settings for:

- Whether custom callouts should rank above built-in ones in search
- Whether the default insert behavior should place the cursor on the next content line instead of the header line

Press `Alt+Enter` in the picker to use the opposite cursor-placement behavior from that default insert setting for a single insertion.

There are also commands you can bind in Obsidian Hotkeys:

- `Open callout picker`
- `Rename current callout type`

## Disclosures

- Desktop only
- No network access
- No accounts, payments, ads, or telemetry
- Reads `.obsidian/appearance.json` and enabled CSS snippet files from `.obsidian/snippets/` to discover custom callout definitions
- Those files live in Obsidian's hidden config directory, so the plugin uses `Vault.configDir` plus narrow read-only adapter access for that discovery path
- Stores only its own settings in Obsidian's plugin data store
- Does not write to notes unless you choose a callout from the picker

## What Ships

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

- Release assets for Obsidian should contain only `manifest.json`, `main.js`, and `styles.css`
- The picker layout and size are static in CSS so the plugin does not inject layout styling from JavaScript
- Hidden config-dir reads are isolated to a single helper because Obsidian does not expose enabled CSS snippets through the Vault API
- Desktop only
- No network access
- Reads local Obsidian appearance settings and enabled CSS snippets from the vault config directory
