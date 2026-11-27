import os
from multiprocessing import Process, Lock, RLock, Queue, Pipe
from time import sleep
print(os.cpu_count())
#获取进程pid
print(os.getpid())
# 获取父进程pid
print(os.getppid())

class MyProcess(Process):
    def run(self):
        print("子进程在运行")
print("进程执行，子进程定义时也执行")
def Speak(lock):
    try:
        print(lock)
        for i in range(10):
            lock.acquire()
            print(f"说话{i}")
            lock.release()
            sleep(1)
    except Exception as e:
        print(e)
    finally:
        print("说话完成")
def write(lock):
    for i in range(10):
        with lock:
            print(f"写{i}")
        sleep(1)
def QueueSpeak(lock, queue):
    try:
        for i in range(10):
            queue.put(f"说话{i}")
            sleep(1)
    except Exception as e:
        print(e)
    finally:
        print("说话完成")
def Queuewrite(lock, queue):
    for i in range(10):
        mes = queue.get()
        print(f"读取{mes}")
        sleep(1)
def PipeSpeak(con):
    for i in range(10):
        con.send(f"说话{i}")
        sleep(1)
def Pipewrite(con):
    for i in range(10):
        mes = con.recv() # 接收数据
        print(f"读取={mes}")
        sleep(1)

# 创建进程，主入口或者主进程中创建进程，在使用Process定义子进程时，会重新去寻找这个方法定义的py文件，这时候，会再次解析这个py文件，所以需要加这个if判断
# 保证是在主入口才进入子进程定义。
if __name__ == "__main__":
    try:
        # lock = Lock()
        # print(lock)
        # p1 = Process(target=Speak, args=(lock,))
        # p2 = Process(target=write, args=(lock,))
        # # 调用进程start方法，会立马向系统申请进程，并且将该进程交给操作系统调度
        # # 如果是mac环境，引入start是异步的，主进程马上就执行完，会清空lock，
        # # 导致子进程无法获取到lock
        # p1.start()
        # p2.start()
        # # 必须 join：主进程要等子进程结束再退出，
        # # 否则主进程退出时会先 unlink 掉 Lock 的底层信号量，
        # # 子进程（macOS 默认 spawn）重建信号量时就报 FileNotFoundError
        # sleep(5)
        #  # 强制终止
        # # p1.terminate()
        # print("进程活跃=", p1.is_alive())
        # p1.join()
        # print("进程活跃=", p1.is_alive())
        # p2.join()

        # queue通信
        # queue = Queue(2)
        # p1 = Process(target=QueueSpeak, args=(lock, queue))
        # p2 = Process(target=Queuewrite, args=(lock, queue))
        # p1.start()
        # p2.start()
        # p1.join()
        # p2.join()

        # pipe通信
        # con1, con2 = Pipe()
        # p1 = Process(target=PipeSpeak, args=(con1,))
        # p2 = Process(target=Pipewrite, args=(con2,))
        # p1.start()
        # p2.start()
        # p1.join()
        # p2.join()

        
        # process继承
        p1 = MyProcess()
        p1.start()
        print("主进程结束")
    except Exception as e:
        print(e)


