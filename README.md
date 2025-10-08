# dlau0202.github.io

个人黑白棋（Othello）博客源码，其中包含对不同对局的复盘和推演。

## 本地启动

```powershell
# 安装依赖（首次需要）
bundle install

# 设置需要的密码（示例：Rose-1 文章）
$Env:ROSE_1_PASSWORD = 'Rose-Emerge'

# 运行本地预览
bundle exec jekyll serve
```

访问 <http://localhost:4000>，输入对应密码后即可查看被加密的文章。

## 标记加密文章

在文章的 front matter 中新增以下字段即可开启加密：

```yaml
encrypt_password_env: ROSE_1_PASSWORD  # 使用 GitHub/本地环境变量保存密码
encrypt_message: "这篇文章已加密。"
```

构建阶段会把正文替换为加密密文，页面加载时读者需输入正确密码才能解锁。

## 自动部署

- 仓库包含 `.github/workflows/deploy.yml`，每次推送到 `main` 会自动构建 `_site` 并发布到 `gh-pages` 分支。
- 请在 GitHub 仓库的 **Settings → Pages** 中，将来源设置为 `gh-pages` 分支。
- 在 **Settings → Secrets and variables → Actions** 下添加文章所需的密码，例如设置 `ROSE_1_PASSWORD = Rose-Emerge`。

部署成功后，访问 <https://dlau0202.github.io> 会使用构建好的静态页面，其中需要密码的文章已完全加密。 
