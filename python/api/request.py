# import requests

# def downloadPng(url):
#     response = requests.get(url)
#     return response.content
# png = downloadPng("https://www.runoob.com/wp-content/uploads/2016/04/py-dict-3.png")
# open("../public/py-dict-3.png", "wb").write(png)

import asyncio

import aiohttp

# 协程下载图片，可以同时下载多个图片，下载资源，进入等待，等待阶段，执行其他协程任务，也就是其他下载
async def main():
    async def downloadPng(session, url):
        # 发送请求获取资源，这个等待阶段就是等待IO
        print(f"开始下载{url}")
        response = await session.get(url)
        print(f"下载{url}完成")
        # 读取响应体，这个等待阶段就是等待IO
        content = await response.read()
        await response.release()
        return content
    list = [
        "https://www.runoob.com/wp-content/uploads/2016/04/py-dict-3.png",
        "https://www.runoob.com/wp-content/uploads/2016/04/py-dict-3.png",
        "https://www.runoob.com/wp-content/uploads/2016/04/py-dict-3.png"
    ]
    session = aiohttp.ClientSession()
    coroulist = [downloadPng(session, url) for url in list]
    await asyncio.gather(*coroulist)
    print("所有图片下载完成")
    # 关闭会话请求，需要加await，因为close返回的是协程对象
    await session.close()
if __name__ == "__main__":
    asyncio.run(main())
