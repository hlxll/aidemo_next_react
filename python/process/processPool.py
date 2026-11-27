from concurrent.futures import ProcessPoolExecutor, as_completed
import os
import time
# 创建进程池，用submit提交任务，使用shutdown等待任务完成

def work(mes, index):
    print(f"子进程在运行{mes}, 索引{index}, 进程id{os.getpid()}")
    if index == 1:
        time.sleep(5)
    elif index == 2:
        time.sleep(2)
    else:
        time.sleep(1)
    return f"子进程{index}的结果"
print("进程池")
if __name__ == "__main__":
    #创建一个进程池执行器,设置最大进程数为3，任务由进程池分配执行提交的任务
    executor = ProcessPoolExecutor(3)
    # submit是有返回值的,submit是异步的，需要通过future.result()获取结果
    # submit只负责提交任务，不会阻塞主进程
    future = executor.submit(work, "hello", 1)
    print(future)
    print(future.result())
    # 返回结果是提交顺序
    fetures = [executor.submit(work, "hello", i) for i in range(1, 7)]

    # 给任务添加回调，执行完，python自动调用这个函数
    def callback(feture):
        print("回调函数", feture.result())
    fetures[0].add_done_callback(callback)

    # 按执行结果的顺序返回,要在shutdown之前，使用as_complete处理成返回时间的顺序
    for item in as_completed(fetures):
        print(item.result())

    
    

    # 按提交顺序返回,要在shutdown之后
    for item in fetures:
        print(item.result())
    print("所有任务完成")

    print("批量提交")
    fetures = executor.map(work, ["hello"] * 6, range(1, 7))
    for item in fetures:
        print(f"批量提交==",item)

    print("阻塞主进程，等待所有任务完成,不再提交任务")
    executor.shutdown(wait=True)

