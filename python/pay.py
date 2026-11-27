max_dear_monry = 10000

def pay(count):
    print("支付", count)

# 外部可引入的方法和属性
__all__ = ["pay"]
print("pay的", __name__)