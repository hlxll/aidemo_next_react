// 文档清洗，保证结果更准确
function cleanText(text: string) {
  return text
    .replace(/<[^>]+>/g, "")           // 去 HTML 标签
    .replace(/\r\n/g, "\n")            // 统一换行
    .replace(/\n{3,}/g, "\n\n")        // 合并多余空行
    .replace(/[ \t]+/g, " ")           // 合并连续空格
    .replace(/[^\S\n]+$/gm, "")        // 去行尾空格
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0) // 过滤空行
    .join("\n");
}

export {
    cleanText,
}