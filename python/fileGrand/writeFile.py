import time as t
def WriteFile():
    with open("../public/text.txt", "wt", encoding="utf-8") as file:
        file.write("hello world"+ t.asctime())
        file.flush()
        t.sleep(10000)
        file.write("hello world"+ t.asctime())
def ReadWrite():
    with open("../public/text.txt", "rt+", encoding="utf-8") as file:
        file.seek(3, 0)
        file.write("想干嘛呢")

ReadWrite()