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

> 注意：pnpm 对 `link:` 方式的本地依赖不会自动安装其依赖，需要手动添加到 profile（通过 registry 或 GitHub 安装则会自动处理）：
>
> ```sh
> dsh plugin --profile web add @deepseek-ai/dsh-tools @deepseek-ai/cordis @deepseek-ai/schemastery pdfjs-dist
> ```

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
