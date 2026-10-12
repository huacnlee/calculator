// @ts-check

import { View, div } from "gpui-kit";
import { h_flex, set_theme, v_flex } from "gpui-base";
import { platform } from "process";
import {
  AppShell,
  Button,
  KeyHints,
  Label,
  MutedText,
  StatusBar,
  applyOmarchyRoles,
  applyOmarchyStyle,
  omarchyTheme,
  style,
} from "omarchy-ui";
import { Calculator } from "./calc.js";

// Complete built-in themes, used whole when the desktop has none to offer.
// A palette half from the desktop and half from here would be worse than
// either, so the fallback is chosen atomically by the window's appearance.
const TOKYO_NIGHT = `
mode = "dark"
background = "#1a1b26"
foreground = "#c0caf5"
accent = "#7aa2f7"
lighter_background = "#24283b"
dark_background = "#13141c"
muted = "#414868"
selection = "#292e42"
red = "#f7768e"
green = "#9ece6a"
yellow = "#e0af68"
blue = "#7aa2f7"
magenta = "#bb9af7"
cyan = "#7dcfff"
`;

const FLEXOKI_LIGHT = `
mode = "light"
background = "#fffcf0"
foreground = "#100f0f"
accent = "#205ea6"
lighter_background = "#f2f0e5"
dark_background = "#e6e4d9"
muted = "#b7b5ac"
selection = "#dad8ce"
red = "#af3029"
green = "#526600"
yellow = "#855b00"
blue = "#205ea6"
magenta = "#a02f6f"
cyan = "#24837b"
`;

/** The calculator is a fixed instrument; a wide window does not widen it. */
const COLUMN_WIDTH = 320;
const KEY_HEIGHT = 44;

// gpui-shell opens its window with an application-drawn title bar: the
// traffic lights sit for a 34px row, and dragging is the application's job.
const TITLE_BAR_HEIGHT = 34;

/** @typedef {"digit" | "operator" | "function" | "equals"} KeyRole */
/** @typedef {{ label: string, role: KeyRole, action: string, wide?: boolean }} Key */

/** @type {Key[][]} */
const ROWS = [
  [
    { label: "AC", role: "function", action: "clear" },
    { label: "±", role: "function", action: "sign" },
    { label: "%", role: "function", action: "percent" },
    { label: "÷", role: "operator", action: "÷" },
  ],
  [
    { label: "7", role: "digit", action: "7" },
    { label: "8", role: "digit", action: "8" },
    { label: "9", role: "digit", action: "9" },
    { label: "×", role: "operator", action: "×" },
  ],
  [
    { label: "4", role: "digit", action: "4" },
    { label: "5", role: "digit", action: "5" },
    { label: "6", role: "digit", action: "6" },
    { label: "−", role: "operator", action: "−" },
  ],
  [
    { label: "1", role: "digit", action: "1" },
    { label: "2", role: "digit", action: "2" },
    { label: "3", role: "digit", action: "3" },
    { label: "+", role: "operator", action: "+" },
  ],
  [
    { label: "0", role: "digit", action: "0", wide: true },
    { label: ".", role: "digit", action: "." },
    { label: "=", role: "equals", action: "=" },
  ],
];

/** @type {Record<string, string>} */
const KEY_MAP = {
  "+": "+",
  "-": "−",
  "*": "×",
  x: "×",
  "/": "÷",
  "%": "percent",
  ".": ".",
  "=": "=",
  enter: "=",
  backspace: "backspace",
  escape: "clear",
  c: "clear",
};

/**
 * The desktop's palette and shell scale, on Linux with an Omarchy theme.
 * Anywhere else there is nothing to read, which is the normal case rather
 * than an error.
 */
async function currentOmarchyTheme() {
  if (platform !== "linux") return { colors: "", shell: "" };
  try {
    // @ts-ignore -- provided by Omarchy hosts only
    const { current_colors, current_shell } = await import("omarchy-theme");
    return { colors: await current_colors(), shell: await current_shell() };
  } catch (_) {
    return { colors: "", shell: "" };
  }
}

/**
 * @param {string} colors a `colors.toml` source
 * @param {string} shell a `shell.toml` source
 * @param {import("gpui-kit").Context | import("gpui-kit").AsyncContext} cx
 */
function installTheme(colors, shell, cx) {
  const tokens = applyOmarchyStyle(shell, { platform });
  applyOmarchyRoles(colors);
  const theme = omarchyTheme(colors, cx.theme(), tokens);
  if (theme) set_theme(theme);
  return theme !== null;
}

export default class CalculatorApp extends View {
  /** @param {unknown} _props @param {import("gpui-kit").AsyncContext} cx */
  init(_props, cx) {
    this.calc = new Calculator();
    this.focus = cx.focus_handle();
    this.focus.focus();

    // The window is not there to ask until init has returned.
    cx.spawn(async (cx) => {
      const desktop = await currentOmarchyTheme();
      const installed = desktop.colors && installTheme(desktop.colors, desktop.shell, cx);
      if (!installed) {
        installTheme(window.appearance() === "light" ? FLEXOKI_LIGHT : TOKYO_NIGHT, "", cx);
      }
      cx.notify();
    });
  }

  /** @param {string} action */
  dispatch(action) {
    const calc = this.calc;
    if (/^[0-9]$/.test(action)) calc.inputDigit(action);
    else if (action === ".") calc.inputDot();
    else if (action === "clear") calc.clear();
    else if (action === "sign") calc.toggleSign();
    else if (action === "percent") calc.percent();
    else if (action === "backspace") calc.backspace();
    else if (action === "=") calc.equals();
    else calc.setOperator(action);
  }

  /** @param {import("gpui-kit").KeyEvent} event @param {import("gpui-kit").Context} cx */
  onKeyDown(event, cx) {
    if (event.modifiers.platform || event.modifiers.control) return;
    const char = event.key_char ?? event.key;
    const action = /^[0-9]$/.test(char) ? char : KEY_MAP[char] ?? KEY_MAP[event.key];
    if (!action) return;
    this.dispatch(action);
    cx.notify();
  }

  /** @param {Key} key @param {import("gpui-kit").Context} cx */
  renderKey(key, cx) {
    const calc = this.calc;
    const pending = key.role === "operator" && calc.operator === key.action && calc.waitingForOperand;
    const label = key.action === "clear" && calc.display !== "0" && !calc.error ? "C" : key.label;

    // Every key is outlined: an edge and a label colour, never a solid
    // block. AC/C discards the calculation, so it takes the danger role, and
    // "=" is the one primary action on the screen.
    const button = new Button(`key-${key.action}`)
      .label(label)
      .size("large")
      .outlined()
      .selected(pending)
      .danger(key.action === "clear")
      .accent(key.role === "equals")
      .onClick((_event, cx) => {
        this.dispatch(key.action);
        // Keep the keyboard on the calculator, so Return after a click means
        // "=" rather than pressing the clicked key again.
        this.focus.focus();
        cx.notify();
      })
      .build(cx)
      .size_full();

    // Cells share a row by weight. The wide key's basis is one gap, so it
    // spans exactly two cells plus the gap between them.
    const gap = style().spacing.md;
    return div()
      .h(KEY_HEIGHT)
      .flex_basis(key.wide ? gap : 0)
      .flex_grow(key.wide ? 2 : 1)
      .child(button);
  }

  /** @param {import("gpui-kit").Context} cx */
  renderTitleBar(cx) {
    const tokens = style();
    return h_flex()
      .id("title-bar")
      .flex_none()
      .w_full()
      .h(TITLE_BAR_HEIGHT)
      .items_center()
      // Clear the traffic lights where the platform draws them in the window.
      .pl(Math.max(tokens.spacing.rowPaddingX, tokens.spacing.windowControlsInset))
      .pr(tokens.spacing.rowPaddingX)
      .border_b_1()
      .border_color(cx.theme().colors.border)
      // Dragging moves the window and a double-click zooms it, as a native
      // title bar does.
      .window_control_area("drag")
      .child(new Label("Calculator").build(cx));
  }

  /** @param {import("gpui-kit").Context} cx */
  renderDisplay(cx) {
    const calc = this.calc;
    const tokens = style();
    const danger = calc.error ? cx.theme().colors.destructive : undefined;
    // The display takes every pixel the keypad leaves, and sits on it: the
    // chain wraps upward as it grows, and its oldest lines are the ones
    // clipped when it outgrows the room.
    return v_flex()
      .w_full()
      .flex_1()
      .min_h_0()
      .overflow_hidden()
      .justify_end()
      .items_end()
      .gap(tokens.spacing.xs)
      .px(tokens.spacing.controlPaddingX)
      .pb(tokens.spacing.xxl)
      .child(
        new MutedText(calc.error || calc.expression)
          .size("subtitle")
          .truncate(false)
          .tone(danger)
          .build(cx)
          .w_full()
          .text_right(),
      )
      .child(new Label(calc.display).size("displayLarge").tone(danger).build(cx));
  }

  /** @param {import("gpui-kit").Context} cx */
  renderKeypad(cx) {
    const gap = style().spacing.md;
    return v_flex()
      .w_full()
      .gap(gap)
      .children(
        ROWS.map((row, index) =>
          h_flex()
            .id(`row-${index}`)
            .w_full()
            .gap(gap)
            .children(row.map((key) => this.renderKey(key, cx))),
        ),
      );
  }

  /** @param {import("gpui-kit").Context} cx */
  render(cx) {
    const column = v_flex()
      .w(COLUMN_WIDTH)
      .h_full()
      .child(this.renderDisplay(cx))
      .child(this.renderKeypad(cx));

    const hints = new KeyHints("calculator-hints")
      .hint("Return", "equals")
      .hint("Backspace", "delete")
      .hint("Escape", "clear")
      .build(cx);

    return div()
      .size_full()
      .track_focus(this.focus)
      .on_key_down((event, cx) => this.onKeyDown(event, cx))
      .child(
        new AppShell()
          .top(this.renderTitleBar(cx))
          // A fixed-width instrument, centred across the window and filling
          // its height. CenteredWorkspace would scroll, which a keypad that
          // always fits does not need.
          .content(
            v_flex()
              .size_full()
              .items_center()
              .py(style().spacing.panelPadding)
              .child(column),
          )
          .bottom(new StatusBar().hints(hints).build(cx))
          .build(cx),
      );
  }
}
