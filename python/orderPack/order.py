from dataclasses import field

import numpy as np
from faker import Faker
def create_order():
    #region
    # print("创建订单")
    # print(np.random.rand(10))
    # faker = Faker("zh_CN")
    # print(faker.name())
    # print(faker.email())
    # print(faker.phone_number())
    # print(faker.address())
    #endregion
    pass
def IterFun():
    list = [1,2,3,4,5]
    print(list.__iter__().__next__())
IterFun()

print("迭代器")
tuple1 = (1,2,3,4,5)
it = iter(tuple1)
while True:
    try:
        print(next(it))
    except StopIteration:
        break
# print(it.__iter__() == it)
# print(id(it.__iter__()))
# print(id(it))
for item in it:
    print(item)
 
print("自定义可迭代类")
class IterClass:
    def __init__(self, **param):
        self.param = param
    def __iter__(self):
        # dict.values() 只是视图，不能下标访问，转成列表再用
        return Customiterator(list(self.param.values()))

class Customiterator:
    def __init__(self, param):
        self.param = param
        self.index = 0
    def __iter__(self):
        return self
    def __next__(self):
        if(self.index >= len(self.param)):
            raise StopIteration()   # 必须 raise，return 会被当成一个值
        else:
            value = self.param[self.index]
            self.index += 1
            return value

obj = IterClass(name="张三", age=18)  
for item in obj:
    print(item)

import tracemalloc
# 还可以实现一个类，即使可迭代对象，也是迭代器
class CustomiteratorTwo:
    def __init__(self, param):
        self.param = param
        self.index = 0
    def __iter__(self):
        self.index = 0
        return self
    def __next__(self):
        if(self.index >= len(self.param)):
            raise StopIteration()   # 必须 raise，return 会被当成一个值
        else:
            value = self.param[self.index]
            self.index += 1
            return value
tracemalloc.start()
obj = CustomiteratorTwo(list(range(10)))
for item in obj:
    print(item)
for item in obj:
    print(item)
print("内存占用", tracemalloc.get_traced_memory()[1])

print("生成器对象")
def fieldFun():
    print("生成器对象开始")
    yield "yield返回值，调用next的返回值"
    print("生成器对象结束")
    return "迭代结束的报错"
try:
    d = fieldFun()
    result1 = next(d)
    print(result1)
    result2 = d.__next__()
except StopIteration as val:
    print("生成器迭代完成", val)
print(hasattr(d, "__iter__"))

def yieldFun():
    list = [1,2,3,4,5]
    yield from list

d = yieldFun()
d.__next__()

def YieldProp():
    print("启动函数")
    a = yield "yield执行返回给函数外部"
    print("a=", a)
    b = yield "yield执行返回给函数外部2"
    print("b=", b)
d = YieldProp()
res = next(d)
print(res)
result = d.send("传递参数给生成器函数，通过yield返回")
print("result",result)

itertulp = (n*2 for n in range(10))
print(itertulp)
print(next(itertulp))




