# RoboPi

> **English** · [中文](./README.cn.md)

A desktop application built on Pi Agent that integrates conversational AI, task automation, and knowledge base construction into a unified interface.

<table>
  <tr>
    <td><img src="./docs/imgs/light-home-mac.jpg" alt="Light theme home" width="400"/></td>
    <td><img src="./docs/imgs/home-dark-mac.jpg" alt="Dark theme home" width="400"/></td>
  </tr>
  <tr>
    <td><img src="./docs/imgs/theme-abyss-mac.jpg" alt="Abyss theme" width="400"/></td>
    <td><img src="./docs/imgs/model-aqua-mac.jpg" alt="Aqua theme model" width="400"/></td>
  </tr>
</table>

## Documentation

- [DESIGN.md](docs/DESIGN.md) — Architecture & design decisions
- [CODE_STYLE.md](docs/CODE_STYLE.md) — Code conventions & style guide

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [Biome](https://biomejs.dev/)

  Install the [Biome VSCode extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) and enable **format on save** to automatically format your code with Biome.

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# Windows
$ npm run build:win

# macOS
$ npm run build:mac

# Linux
$ npm run build:linux
```

### Lint & Format

```bash
$ npm run check    # Check & auto-fix
$ npm run lint     # Lint only
$ npm run format   # Format only
```
