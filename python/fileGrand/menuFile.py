import os
def CreateMenu():
    # 创建单级目录,如果路径中有一个目录不存在，也会报错。如果最终创建目录已经存在，会报错
    # os.mkdir("../public/menu")
    # 创建多级目录，如果路径中所有目录都存在，就会报错
    # os.makedirs("../public/menu/1")
    # 删除目录，如果目录不存在，或者内容非空，会报错
    # os.rmdir("../public/menu/1")
    # 删除路径的目录，直到父级目录不是空目录
    # os.removedirs("../public/menu/1")
    # 判断文件或目录是否存在
    # hasFile = os.path.exists("../public/idcard.png")
    # print(hasFile)

    # 判断是否是目录,不存在，或者是文件，也会返回False
    isDir = os.path.isdir("../public/menu")
    print(isDir)

    # 判断是否是文件
    isFile = os.path.isfile("../public/idcard.png")
    print(isFile)

    # 扫描指定目录
    allFile = os.scandir("../public")
    for item in allFile:
        print(f"{item},{item.is_dir()}")
    
    # 按层级，递归遍历所有目录和文件
    list = os.walk("../public")
    print(list)
    for item in list:
        print(item)
    # 删除有内容的目录
    shutil.rmtree("../public/menu/1")

CreateMenu()