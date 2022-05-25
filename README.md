# Better Debug Hints

> Improved Magento 2 debug hints for layout and blocks

![Example Usage](docs/example.gif)

Features:

- **Does not affect structure** or existing styles 👌
- Detects **Knockout** components and templates 🤜
- Finds Magento **mage-init scripts** within templates/layouts 📌
- Uses dev-tools like **element picker** to select elements 🔫
- Prints **browseable structure** and internal informations in console 👀
- Adds a button to open edit page for CMS Blocks 🖊️
- Generates Graphviz visualization for Layout

## Installation

```sh
composer require --dev kingfisherdirect/magento2-better-debug-hints
```

## Usage

Open your Magento page with an extra GET parameter `?ath=1`. For example:
`https://localhost/?ath=1`.

**Element Picker**

1. Press `` ` `` (backtick key, above tab)
2. Move your mouse on top of any html element
3. Click on it to get debug information in browser console
4. Right click on highlighted element to nagivate to it's direct parent
5. `ESC` to disable picker

**Console Helper**

Use `layout()` function to investigate any HTML element. To inspect currently selected element in inspector use `layout($0)`

**Graphviz Layout**

Run `lh.debuggers.mageLayout.graph()` in developer tools console. Graph will be copied into clipboard. You can visualise it online here - http://magjac.com/graphviz-visual-editor/ or using this command `echo 'GRAPH_OUTPUT' | dot -Tsvg > output.svg`

## Credits

https://github.com/ho-nl/magento2-Ho_Templatehints

After starting work on this module I realised there is an existing one that seems quite good. Few ideas were taken out of that module.
