# dsh-pdf

[English](README.en.md) | 中文

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) PDF 工具箱：从 PDF 文件中提取文本、元数据与页码范围。本地解析（基于 [PDF.js](https://mozilla.github.io/pdf.js/) / pdfjs-dist）——无需 API key、无需网络。

## 功能特性

- `pdf_read` 工具：逐页提取文本，带页码标记。
- 页码选择：`"1-3,5"` 或 `"all"`——大文档可分块读取。
- 文档元数据（标题）与总页数。
- 内置边界控制：文件字节上限、单次解析页数上限、单次调用字符上限——截断行为明确，并提示模型如何继续。
- 通过 harness 文件系统接缝（`ctx.fs`）读取，部署的权限与沙箱策略自动生效。

## 安装

### 从 GitHub 安装

```sh
dsh plugin --profile web add "github:sunshine-lang/dsh-pdf"
```

然后重启 `dsh --profile web`。`lib/` 已预构建并提交，安装无需构建权限。

### 从 npm 安装

```sh
dsh plugin --profile web add dsh-pdf
```

### 从本地源码安装（开发）

```sh
dsh plugin --profile web add ./dsh-pdf
```

DSH 官方运行组件由宿主提供，插件不会另装一套旧版核心。开发时在本仓库运行 `npm install --ignore-scripts` 安装构建依赖；本地 `link:` 安装不会自动安装插件自身的 `pdfjs-dist`，请先在插件目录安装依赖。

## 兼容性

0.1.1 已在 DSH `0.1.5-rc.2` 和 `0.1.6-alpha.2` 的一次性最小 Profile 中通过打包安装、启动、PDF 读取与卸载验收。`0.1.6-alpha.1` 保留为 `unknown`。Node.js 要求 `>=22.19`；实际测试环境为 macOS arm64、Node.js 22.23.1。

完整范围、复现命令与限制见 [兼容性验证记录](COMPATIBILITY.md)。这些结果不代表其他系统、Web UI 或模型调用已验收。

## 使用方法

启动 Web UI 后，向模型提问，例如：

> 读取 `paper.pdf` 的前 3 页并总结。
>
> `contract.pdf` 第 7 页写了什么？

模型会调用 `pdf_read`：参数 `path`（必填），可选 `pages`（`"1-3,5"` 或 `"all"`）。输出达到上限时会在页边界截断并给出提示，模型会用页码范围继续读取。

## 配置

可通过 `cordis.patch.yml` 或 profile 的 patch 层覆盖任意配置项：

```yaml
- patch:
    - id: dsh-pdf
      config:
        maxFileBytes: 52428800
        maxPages: 200
        maxCharsPerCall: 20000
```

| 配置项 | 默认值 | 含义 |
| --- | --- | --- |
| `maxFileBytes` | `20971520`（20 MiB） | 整个 PDF 的字节上限（含）；超过直接报错 |
| `maxPages` | `500` | 单次调用最多解析的页数；超出则截断并提示 |
| `maxCharsPerCall` | `12000` | 单次调用返回的最大字符数；结果在页边界截断 |

配置无效时插件加载会直接失败，并给出可操作的错误信息。

## 开发

```sh
npm install        # 或 pnpm install
npm run build      # tsc → lib/
```

在 DeepSeek Harness 仓库内构建（类型解析指向工作区源码）时，改用 `tsconfig.local.json`：`tsc -p tsconfig.local.json`。

测试：`tests/fixtures/sample.pdf` 由 `make-test-pdf.mjs` 生成（无依赖）；`w3-dummy.pdf` 为 W3C 官方测试文件。集成测试：在 harness 仓库内运行 `node --import tsx/esm test-integration.ts`。

## 同作者更多插件

该作者的全部 DeepSeek Harness 插件（统一入口）：[dsh-plugins](https://github.com/sunshine-lang/dsh-plugins)

## 许可证

MIT。
