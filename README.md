
# AI Video Scripts

This project is a web-based tool for generating AI videos. It provides a step-by-step workflow to create videos, including:

- **Prompt Generation**: Create and refine prompts for the AI.
- **Storyboarding**: Visualize the video scenes and structure.
- **Composition**: Assemble and edit the video components.
- **Preview**: Review the final generated video.

The application is built with Vue.js, Vite, and uses Element Plus for the UI components.

## Quick Start

This project contains executable scripts to automate the startup process. These scripts will automatically check for dependencies, install them if missing, and then launch the development server.

### For Linux/macOS

Open your terminal and run the following command:

```bash
./start.sh
```

### For Windows

Simply double-click the `start.bat` file, or run it from your command prompt:

```bash
.\start.bat
```

⚠️ 一个重要的小提示
  虽然代码修改（改 .js 或 .py 文件）通常会通过“挂载”（Volumes）直接生效，但如果你修改了 依赖文件（例如 package.json 加了新包，或者 backend/pyproject.toml
  加了新库），docker-compose up 默认不会重新构建镜像来安装这些新包。

  如果改了依赖，你需要手动强制重新构建一次：
   1 docker-compose up --build
