class Animal:
    def speek(self):
        print("动物在说话")
class Dog(Animal):
    def speek(self):
        print("狗在说话")
class Cat(Animal):
    def speek(self):
        print("猫在说话")
def test(animal: Animal):
    animal.speek()

test(Dog())
test(Cat())
test(Animal())


print("鸭子多态", "*" * 20)
class Fish():
    def speek(self):
        print("鱼在说话")
class Pig():
    def speek(self):
        print("猪在说话")
def markSpeek(animal):
    animal.speek()

markSpeek(Fish())
markSpeek(Pig())

from abc import ABC, abstractmethod
#【抽象类，继承ABC的类，作为一个格式定义，子类继承后，必须实现抽象方法】
class MustRUN(ABC):
    @abstractmethod
    def run(self):
        pass

class ChildRUN(MustRUN):
    def run(self):
        print("子类在运行")
child1 = ChildRUN()


print("内存介绍")
a = 10
b = a
print(id(a))
print(id(b))
a = 20
 
def changeA(a):
    print(a)
    a = 30
    print(a)

b = 10
changeA(b)
print(b)

def ChangeList(list, dict):
    print(list)
    print(dict)

list = (1, 2)
ChangeList(*list)
 
print("y" in "python")

isLogin = "登陆" if False else "未登陆"

print(isLogin)
lambda x, y: x+y

list = [1,2,3,4]
def test(item):
    return item + 2
newList = map(test, list)

for item in newList:
    print(item)

def filterFun(item):
    return item>2
filterNewList = filter(filterFun, list)
for item in filterNewList:
    print(item)

# list = ["name", "age", "python"]
# newList = sorted(list, key = lambda x: len(x))
# print(newList)

print("reduce")
from functools import reduce
newList = reduce(lambda x, y: x + y, list, 0)
print(newList)
# 推导字典
names = ["huanglin", "xulin", "liu"]
age = [12, 22, 32]
dict = {names[i]:age[i] for i in range(len(names))}
print(dict)
set = {n for n in list}
print(set)
print(round(4.5))
print(round(5.5))
print(divmod(10, 3))
import copy
newAge = copy.copy(age)
print(newAge)
print(id(age[0]))
print(id(newAge[0]))

print("闭包")
def ParentFun():
    mes = "aaa"
    name = "asss"
    def ChildFun():
        print("子函数在运行", mes, name)
    return ChildFun
child = ParentFun()
print(child.__closure__)
child()

def testFun(*param1, **param2):
    print(param1)
    print(param2)

print("无参数装饰器")
def ApiFun(fun):
    def wrapper(*param, **param1):
        print("装饰器")
        return fun(*param, **param1)
    return wrapper

@ApiFun
def TestFun2(*param, **param1):
    print(param)
    print(param1)

TestFun2(1, 3, 4, 5, a=1, b=22, c=33)

print("有参数装饰器")
def HasParamApi(val):
    def Warpper(fun):
        print("装饰器包装时逻辑1")
        def wrapper(*param, **param1):
            print("装饰后执行逻辑1", val)
            return fun(*param, **param1)
        return wrapper
    return Warpper
def HasParamApi2(val):
    def Warpper(fun):
        print("装饰器包装时逻辑2")
        def wrapper(*param, **param1):
            print("装饰后执行逻辑2", val)
            return fun(*param, **param1)
        return wrapper
    return Warpper
@HasParamApi("装饰器参数")
@HasParamApi2("装饰器参数")
def TestFun3(param):
    print(param)

TestFun3("装饰器函数参数")
# hello
print("类装饰器")
class SayHello:
    def __init__(self, param):
        self.msg = param
    def __call__(self, fun):
        def Warpper(*param, **param1):
            print("类装饰器在运行", self.msg)
            return fun(*param, **param1)
        return Warpper

@SayHello("参数")
def TestFun4(param):
    print(param)
TestFun4("装饰器函数参数")

age:int = 10.1
print(age)

str = input("请输入：")


