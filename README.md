# wx-fast-base64
最快的 base64 编码/解码方案，基于 Wasm + SIMD，微信小程序专用

wx-fast-base64 参考借鉴了以下两个库，在此致谢！

js-base64：https://github.com/dankogai/js-base64

fast-base64：https://github.com/mitschabaude/fast-base64

虽然小程序有提供原生的 wx.arrayBufferToBase64 和 wx.base64ToArrayBuffer

但是以上两个 api 在真机上的性能表现非常差，对于 50KB 的 ArrayBuffer，编码速度在 40ms 左右。

这个性能无法满足某些低延时场景的需求，例如图片流编码，视频流编码等。

因此 wx-fast-base64 采用了 WebAssembly 和 SIMD 技术。

将转码算法编译成汇编指令执行，并对支持 SIMD 指令的 CPU 做了额外优化。

# 性能对比如下：

测试用的 ArrayBuffer 长度为 50KB, 测试编码速度

wx.arrayBufferToBase64：平均40ms

js-base64：平均10ms

wx-fast-base64： 平均2ms

结论：

wx-fast-base64 编码速度比 js-base64 快 5 倍， 比原生 api 快 20 倍。


# 快速上手
将该项目的 libs 文件夹放入小程序的 app.js 同级目录

```
const Base64 = require("/libs/base64.js");

// Uint8Array转base64
Base64.fromUint8Array(u8a).then(base64 => {
    console.log(base64);
})

// base64转Uint8Array
Base64.toUint8Array(base64).then(u8a => {
    console.log(u8a);
})
```
