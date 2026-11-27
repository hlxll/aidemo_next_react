def OpenFile():
    # 打开文件，打开模式，编码方式，返回文件对象
    file = open("../public/text.txt", "rt", encoding="utf-8")
    content = file.read()
    print(content)
    file.close()
def openPng():
    file = open("../public/idcard.png", "rb")
    content = file.read()
    print(hasattr(file.read, "__iter__"))
    file.close()
    return content
def WritePng(content):
    file = open("../public/idcardCopy.png", "wb")
    file.write(content)
    file.close()

def WriteSizeTxt(size):
    file = open("../public/text.txt", "rt", encoding="utf-8")
    # read读取时，设置长度，可以多次调用，迭代文件内容。
    # 长度，读取文件就是字符长度，读取二进制文件就是字节数
    content = file.read(size)
    print(content)
    content1 = file.read(size)
    print(content1)
    file.close()
    return content
def WriteLine():
    file = open("../public/text.txt", "rt", encoding="utf-8")
    content = file.readline()
    print(content, end="")
    content1 = file.readline()
    print(content1, end="")
    file.close()
def ReadLines():
    file = open("../public/text.txt", "rt", encoding="utf-8")
    content = file.readlines(1)
    print(content)
    file.close()
def withreadFile():
    with open("../public/text.txt", "rt", encoding="utf-8") as file:
        # content = file.read()
        # print(content)
        for line in file:
            print(line, end="")
withreadFile()
print("with处理的表达式,自定义")
class CustomWithFun:
    def __init__(self):
        pass
    def __enter__(self):
        print("enter CustomWithFun")
        # 返回值赋给表达式后面as的别名
        return self
    def __exit__(self, exc_type, exc_val, exc_tb):
        print("exit CustomWithFun")
        print(exc_type, exc_val, exc_tb)
        # False 表示不未处理异常，True 表示已经处理异常
        return True

# with CustomWithFun() as file:
#     file.study()
#     print(file)