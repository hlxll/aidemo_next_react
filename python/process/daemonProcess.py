from multiprocessing import Process, Queue
import os
import time

num = 100
list = [1,2,3,4,5]
def monter():
    global num
    num += 10
    list.append(6)
    print("monter进程的num=", num, list)
    while True:
        try:
            with open("../public/text.txt", "rt", encoding="utf-8") as file:
                lines = sum(1 for _ in file)
                print(f"当前进程{os.getpid()} 行数{lines}, 父进程{os.getppid()}")
                time.sleep(1)
        except:
            print("守护进程异常")

if __name__ == "__main__":
    print("主进程开始", os.getpid())
    # 开启守护进程
    Process(target=monter, daemon=True).start()
    with open("../public/text.txt", "a", encoding="utf-8") as file:
        for i in range(1):
            file.write("hello world\n")
            file.flush()
            time.sleep(1)
    print("主进程结束", num, list)
