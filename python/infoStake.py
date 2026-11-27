# try:
#     numOne = int(input("请输入第一个数字："))
#     numTwo = int(input("请输入第二个数字："))
#     sum = numOne / numTwo
#     print(f"{numOne}和{numTwo}的商为{sum}")
# # 不同错误，不同的类型, 使用as获取这个错误的实例对象
# except ZeroDivisionError as e:
#     print("除数不能为0", type(e))
#     print(e.__traceback__.tb_frame.f_code.co_filename)
#     print(e.__traceback__.tb_lineno)
# except ValueError:
#     print("输入的不是数字")
# except Exception:
#     print("发生错误,所有Exception子类错误也会触发，可以用于兜底")
# except :
#     print("所有错误基类，类似baseException")

# try:
#     numOne = int(input("请输入第一个数字："))
#     numTwo = int(input("请输入第二个数字："))
#     sum = numOne / numTwo
#     print(f"{numOne}和{numTwo}的商为{sum}")
#     if(numTwo < 5):
#         raise Exception("除数不能小于5")
# except (ValueError, ZeroDivisionError, Exception):
#     print("输入的不是数字或除数不能为0")
# else:
#     print("没有错误")
# finally:
#     print("无论有没有异常，都会执行的代码")


# class PeopleException(Exception):
#     def __init__(self, mes):
#         self.mes = "前缀:" + mes
#         super().__init__(self.mes)
# raise PeopleException("这是一个错误")

print(__name__)
import pay
print(pay.max_dear_monry)
from pay import max_dear_monry
print(max_dear_monry)
print(pay.__name__)
import copy
print(copy.__file__)

import time
# print(time.__file__)
