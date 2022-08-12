# wx-fast-base64
微信小程序最快的 base64 编码/转码方案，基于 Wasm + SIMD。

wx-fast-base64 参考了借鉴了以下两个库，在此致谢！

js-base64：https://github.com/dankogai/js-base64

fast-base64：https://github.com/mitschabaude/fast-base64

虽然小程序有提供原生的 wx.arrayBufferToBase64 和 wx.base64ToArrayBuffer

但是以上两个 api 在真机上的性能表现非常差，对于 50KB 的 base64，解码速度在 40ms 左右。

这个性能无法满足某些低延时场景的需求，例如图片流解码，视频流解码等。

因此 wx-fast-base64 采用了 WebAssembly 和 SIMD 技术。

将转码算法编译成汇编指令执行，并对支持 SIMD 指令的 CPU 做了额外优化

# 性能对比如下：

测试用的 base64 长度为 50KB

wx.arrayBufferToBase64：平均40ms

js-base64：平均10ms

wx-fast-base64： 平均2ms

结论：

wx-fast-base64 解码速度比 js-base64 快5倍， 比原生 api 快 20 倍


# 快速上手
将该项目的 libs 文件夹放入小程序的app.js同级目录

```
const Base64 = require("/libs/base64.js");

// Uint8Array转base64
Base64.fromUint8Array(u8a).then(base64 => {
    console.log(base64);
})

// base64y转Uint8Arra
Base64.toUint8Array(base64).then(u8a => {
    console.log(u8a);
})
```
