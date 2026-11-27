import os
from time import sleep
from threading import get_native_id, Thread, RLock
from concurrent.futures import ThreadPoolExecutor, as_completed
print(f"主线程id{get_native_id()}")
def Speak(lock):
    try:
        for i in range(5):
            print(f"说话{i}, 进程{os.getpid()}, 线程id{get_native_id()}")
            sleep(1)
    except Exception as e:
        print(e)
    finally:
        print("说话完成")
    return "说话完成"
def write(lock):
    for i in range(5):
        with lock:
            print(f"写{i}, 进程{os.getpid()}, 线程id{get_native_id()}")
        sleep(1)
class ThreadSpeak(Thread):
    def run(self):
        try:
            for i in range(5):
                print(f"说话{i}, 进程{os.getpid()}, 线程id{get_native_id()}")
                sleep(1)
        except Exception as e:
            print(e)
        finally:
            print("说话完成")

if __name__ == "__main__":
    # lock = RLock()
    # p1 = Thread(target=Speak, args=(lock,))
    # p2 = Thread(target=write, args=(lock,))
    # p1.start()
    # p2.start()
    # # 子线程和主线程任务会频繁切换，使用join等子线程执行完
    # p1.join()
    # p2.join()
    # print("all done")


    # speakThread = ThreadSpeak()
    # speakThread.start()
    # speakThread.join()

    #线程池
    def threadCall(future):
        print("线程回调", future.result())
        return 
    threadExture = ThreadPoolExecutor(3)
    lock = RLock()
    # f1 = threadExture.submit(Speak, lock)
    # f1.add_done_callback(threadCall)
    # threadExture.submit(write, lock)

    # features = [threadExture.submit(Speak,lock) for i in range(5)]
    # for future in as_completed(features):
    #     print(future.result())
    

    # threadExture.shutdown(wait=True)
    # print("all done")

    # map
    result = threadExture.map(Speak, [lock]*5)
    print(list(result))



    