# Calculator

A small desktop calculator written in JavaScript for [gpui-shell](https://gpui-kit.com/shell/), styled with [Omarchy UI](https://github.com/huacnlee/omarchy-ui).

- Follows the Omarchy theme of the desktop on Linux, and falls back to Tokyo Night or Flexoki Light by system appearance elsewhere.
- Keeps the whole calculation on the first line, such as `1 + 2 ÷ 3 × 10 =`.
- Fully usable from the keyboard.

## Install gpui-shell

```bash
curl -fsSL https://gpui-kit.com/shell/install.sh | sh
```

The script installs `gpui-shell` to `~/.local/bin` and creates `~/.gpui-shell/apps`. This calculator needs gpui-shell 0.7.3 or later.

## Run

```bash
git clone https://github.com/huacnlee/calculator.git
cd calculator
./run.sh            # or: gpui-shell run -d .
./run.sh --watch    # reload on save while editing
```

On first run gpui-shell fetches the `omarchy-ui` dependency declared in `gpui-shell.json`.

To install it as an application, link the directory into `~/.gpui-shell/apps` and run it by name:

```bash
ln -s "$PWD" ~/.gpui-shell/apps/calculator
gpui-shell run calculator
```

## Keyboard

| Key | Action |
| --- | --- |
| `0`–`9`, `.` | Enter a number |
| `+` `-` `*` `/` | Add, subtract, multiply, divide |
| `%` | Percent |
| `Return` or `=` | Equals; press again to repeat the last operation |
| `Backspace` | Delete the last digit |
| `Escape` or `c` | Clear |

Operations are evaluated from left to right as they are entered, like a pocket calculator: `1 + 2 × 3 =` is `9`.

## Files

| File | Purpose |
| --- | --- |
| `gpui-shell.json` | Manifest: identity, window size and the `omarchy-ui` dependency |
| `main.js` | The window: title bar, display, keypad and theme |
| `calc.js` | The calculator state machine, independent of the UI |
| `run.sh` | Runs the application from this directory |
