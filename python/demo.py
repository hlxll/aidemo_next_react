
# 字符串格式化输出
from queue import Queue
from traceback import print_tb


a = 12.1
b = "huanglin"

# 精度控制，%m.n   m是宽度，n是小数位数，如果是字符串，n也是截取长度
priStr = "名称%9.6s, 年龄%i" % (b, a)
fSt5 = f"名称{b}, 年龄{a}"
# print(priStr)

# 转义字符,加r就不会转义
String = r"hello\n world"

# 数据类型转换
strType = type(String)
instanceType = isinstance(String, str);

# 用户输入
# inputStr = input("请输入：")
# print(f"用户年龄{inputStr}")

# for循环
# for i in range(10):
#     print(i)
# for charI in "huanglin":
#     print(charI)

# 加密解密循环字段
serect = ""
for charI in "huanglin":
    serect += chr(ord(charI) + 1)
# print(serect)
def encrypt(str, age):
    serect = ""
    print(age)
    for charI in str:
        serect += chr(ord(charI) + 1)
    return serect
# // 位置参数
# print(encrypt("huanglin", 12))
# // 关键字参数，两种参数方式可以一起用，但是关键字参数必须在位置参数后面
# print(encrypt(age=22, str="xulin"))
# /前面必须是位置参数，*后面必须是关键字参数
def funcValidate(str, /,  age, *, name):
    if age < 0:
        return False
    else:
        return True
# 可变关键字参数，获取到字典
def keywordParam(str, **kwargs):
    print(kwargs)
# // 可变位置参数,获取到 元祖
def argumentParam(*args):
    print(args)

globalAge = 100
globalName = "huanglin"
def changeAge(age):
    # 函数文档，用于描述函数的功能和参数 
    """
    修改全局变量globalAge的值
    :param age: 新的年龄
    :return: 修改后的globalAge的值
    """
    globalAge = age
    # 局部作用域想修改全局变量，需要加global，不然局部作用域内会重新创建，不会修改全局变量
    global globalName
    globalName = "xulin"

    def changeParent(age):
        # 非局部变量，用于修改局部作用域内的变量,z只有当函数定义在局部作用域内时，才能使用nonlocal
        nonlocal globalAge
        globalAge = age
    changeParent(300)
    print(globalAge)
    return globalAge

listAges = list[int](range(10))
listAges.append(100)
listAges.insert(4, 200)
listAges.extend([300, 400])
listAges.pop(4) # 删除指定下标值
listAges.remove(1) # 删除第一个找到的指定值
del listAges[2]
print(listAges)
# listAges.clear() # 清空列表
print(listAges)
ageIndex = listAges.index(5) # 返回数据下标
print(ageIndex)
valCount = listAges.count(5) # 返回数据出现的次数
print(f"5出现了{valCount}次")
listAges.sort() # 排序
print(listAges)
listAges.reverse() # 反转列表
print(listAges)
print(max(listAges))
print(min(listAges))
print(sum(listAges)) # 返回列表中所有元素的和
# index = 0
# while index < len(listAges):
#     print(listAges[index])
#     index += 1

print(enumerate[int](listAges).__next__())
for (index, ageI) in enumerate[int](listAges):
    print(f"下标{index}, 年龄{ageI}")
# 元组
print("元组")
tu = (10, 2, 3, 4, 5)
print("2的下标" + str(tu.index(10)))

def dataToBack(*data):
    print(type(data))

dataToBack(*tu)
dataToBack(*listAges)
for key, *values in [("a", 1, 2), ("b", 3)]:
    print(key, values)

print("字符串")
strOne = "hello world"
print(strOne.split("o"))
strOne = strOne.replace("l", "L")
print(strOne)   
res = strOne.strip("h")
print(res)
sortedStr = sorted(res)
print(sortedStr)


print("截取")
print(listAges[4::])

print("集合")
setOne = {1,2,3,tu}
# print(setOne)
# setOne.add(4)
# print(setOne)
# setOne.pop()
# print(setOne)
# setOne.update(listAges)
# print(setOne)
setTwo = {2,3,6}
print(setOne.difference(setTwo))
print(setOne.union(setTwo))
print(setOne - setTwo)
print(setOne & setTwo)
print(setOne | setTwo)
print(setOne ^ setTwo)

print("字典")
dictOne = {"name": '123', "age": 22}
dictOne.pop("name")
print(dictOne)
keysDict = dictOne.keys()
print(keysDict)
dictOne["value"] = 66
print(keysDict)
listToDict = dict([("name", "123"), ("age", 22), ("value", 66)])
print(listToDict)

class Person:
    # 类的属性
    address = "江西"
    max_age = 100

    # __init__,初始化类调用，用来初始化实例属性
    def __init__(self, name, age):
        self.name = name
        if age <= Person.max_age:
            self.age = age
        else:
            print(f"年龄不能大于{Person.max_age}")
    #类的方法是属于类的，实例调用方法，先去实例对象找，找不到再去类找
    def speak(self, content):
        print("父类说", content)
    def run(self, longitude):
        print(f"{self.name}在{longitude}公里")
    
    # 装饰器，将方法装饰成类方法
    # 类方法通常操作类信息，一些工厂方法
    @classmethod
    def changeAddress(cls, address):
        cls.address = address
        cls.max_age = 100
    @classmethod
    def createDict(cls, cnotent):
        name, year = cnotent.split('-')
        return Person(name, int(year))
    # 纯工具
    @staticmethod
    def isAdult(age):
        return age >= 18


# p1 = Person("huanglin", 12)
# p2 = Person("xulinlin", 11)
# def ownSpeak(content):
#     print(fr"实例自定义方法\n{content}")

# p1.speak = ownSpeak

# p1.speak("你好")
# p2.speak("你好")

# print(p1.__dict__)

# p1.address = "江西"
# print(p1.__dict__)
# # 查询实例来自哪个类
# print(type(p1))
# p3 = Person("xulinlin", 110)

# p3 = Person.createDict("黄磷-23")
# print(Person.__dict__)
# print(p3.__dict__)


print("学习继承")
class Student(Person):
    def __init__(self, name, age, id):
        super().__init__(name, age)
        self.id = id
    # 方法名与父类相同，重写
    def speak(self, content):
        super().speak(content)
        print(f"子类说{content}")



print(Student.__dict__)
stu1 = Student("huanglin", 12, "123456")
print(stu1.__dict__)
stu1.speak("你好")

print(isinstance(stu1, Student))
print(issubclass(Student, Person))

print("多重继承")
class Worker:
    def __init__(self, address):
        self.address = address

class people(Person, Worker):
    def __init__(self, name, age, address, host):
        super().__init__(name, age)
        Worker.__init__(self, address)
        self.host = host  # 共有属性，当前类，子类，类外部可以访问
        self._local = "local" # 保护属性，当前类，子类可以访问
        self.__idcard = "123456" # 私有属性，只能在当前类中访问
    # 注册local的getter属性
    @property
    def local(self):
        return self._local
    # 注册local的setter属性
    @local.setter
    def local(self, value):
        self._local = value
    # 这个是外部想获取当前类的字符串类型数据时调用的方法比如print或str，原本类的上一个基类object中有__str__方法，
    # 重写__str__方法，返回自定义的字符串
    def __str__(self) -> str:
        return f"名称：{self.name}, 年龄：{self.age}, 本地：{self.local}"
    def __lt__(self, other):
        return self.age < other.age
    def __getattr__(self, name: str, /) -> Any:
        return f"自定义属性{name}"
people1 = people("huanglin", 12, "江西", "host")
people2 = people("xulinlin", 11, "江西", "host")
print(people1.__dict__)
print(people1.host)
print(people1.local)
people1.local = "newLocal"
print("setter修改之后", people1.local)
print(people1)
print(people1 < people2)
print(people1.house)
# print(people1.__idcard) # 报错，私有属性不能在类外部访问


print("Person是object子类吗", issubclass(Person, object))
print(type(object.__dict__))
dictThree = {"name": "123", "age": 22}



print(f"队列{'*' * 20}")
queue = Queue(1)
queue.put(1)
# queue.put(2)
queue.put_nowait(2)
# print("数据是否为空", queue.empty())
# print("数据是否已满", queue.full())
# print("队列长度", queue.qsize())
# print(queue.get()) # 取出数据，删除，返回数据
# print("数据是否为空", queue.empty())



