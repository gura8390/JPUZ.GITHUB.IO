# JPUZ · 动态二维码接收页面

通过摄像头扫描屏幕上的动态二维码，收集并还原传输内容。Animated QR data transfer receiver for the browser.

**当前网页入口标记为 v2.1，入口文件是根目录的 `index.html`。** 当前仓库没有独立的 `send/` 和 `recv/` 目录。

## 使用入口

打开 [在线接收页面](https://gura8390.github.io/JPUZ.GITHUB.IO/)，允许摄像头访问，将镜头对准使用兼容协议的发送端。页面提供接收结果复制与重新扫描操作。

电脑到手机的端到端传输，以及不同版本发送端之间的兼容性，尚待重新核验。请保留发送端原件，并使用对应协议测试。

## 本地查看

```bash
git clone https://github.com/gura8390/JPUZ.GITHUB.IO.git
cd JPUZ.GITHUB.IO
python -m http.server 8000
```

访问 `http://localhost:8000/`。手机远程访问摄像头页面通常需要 HTTPS。

## 当前文件

| 文件 | 内容 |
|---|---|
| `index.html` | 实际接收页面，包含页面与接收逻辑 |
| `app.js` | 保留的发送侧脚本；当前仓库没有对应的独立发送 HTML 页面 |
| `style.css` | 样式 |
| `jsQR.js`、`qrcode.js` | 二维码相关脚本 |
| `pako.min.js`、`reed-solomon.js` | 压缩、纠错相关脚本 |

当前仓库不能按旧文档当作完整 `send/recv` 双端目录使用。另一个接收端快照见 [TEST.GITHUB.IO](https://github.com/gura8390/TEST.GITHUB.IO)；两者分别保留，不默认视作可互换的版本。

## 许可证

项目许可文件见 [LICENSE](LICENSE)。保留随附第三方脚本中的原有许可与署名。
