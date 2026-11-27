import asyncio


async def worker(index):
    print(f"worker{index}")
    await asyncio.sleep(2)
    print(f"worker{index} end")
    return f"worker{index} end"
        
async def coroutineFun():
    # 同步执行两个worker
    # print("coroutineFun")
    # coru1 = worker(1)
    # print("coroutineFun end")
    # coru2 = worker(2)
    # await coru1
    # await coru2
    # return "coroutineFun end"
    # 异步执行两个worker
    # print("coroutineFun")
    # coru1 = asyncio.create_task(worker(1))
    # print("coroutineFun end")
    # coru2 = asyncio.create_task(worker(2))
    # await coru1
    # await coru2
    # return "coroutineFun end"
    # 将多个协程对象同时丢给事件循环，并在执行结束后，一次性拿到返回结果
    print("coroutineFun")
    results = await asyncio.gather(worker(1), worker(2))
    print(results)
    return "coroutineFun end"
        
obj = coroutineFun()

print("对象=", obj)
# 将协程对象包装成任务，交给事件循环，并启动事件循环
result = asyncio.run(obj)
print("结果=", result)
