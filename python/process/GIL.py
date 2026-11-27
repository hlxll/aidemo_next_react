def CopyFile():
    with open("../public/text.txt", "rb") as f, open("../public/text_copy.txt", "wb") as f2:
        for line in f:
            f2.write(line)
CopyFile()