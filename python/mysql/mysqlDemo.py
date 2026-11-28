"""MySQL 入门示例：pymysql 连接 + 建库建表 + 增删改查

本机没有 MySQL 时先起一个（任选其一）：
    brew install mysql && brew services start mysql
    docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 mysql:8

连接配置支持用环境变量覆盖：
    DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
"""

import os

import pymysql

DB_NAME = os.getenv("DB_NAME", "demo")
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "112.124.15.47"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "20170808xllXLL"),
    "charset": "utf8mb4",   
}


def get_conn(database: str | None = DB_NAME) -> pymysql.connections.Connection:
    """建库时不传 database，其他操作传库名。

    autocommit 默认是 False，增删改后必须 conn.commit() 才真正落库；
    DictCursor 让查询结果直接是 dict 列表，而不是元组。
    """
    return pymysql.connect(
        **DB_CONFIG,
        database=database,
        cursorclass=pymysql.cursors.DictCursor,
    )


def init_database() -> None:
    conn = get_conn(database=None)
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` DEFAULT CHARSET utf8mb4"
            )
        conn.commit()
    finally:
        conn.close()


def init_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS user (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(32) NOT NULL,
                age INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """
        )
    conn.commit()


def insert_user(conn, name: str, age: int) -> int:
    # 用 %s 占位符交给 pymysql 转义，不要自己拼字符串（防 SQL 注入）
    with conn.cursor() as cur:
        cur.execute("INSERT INTO user(name, age) VALUES(%s, %s)", (name, age))
        new_id = cur.lastrowid
    conn.commit()
    return new_id


def list_users(conn) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute("SELECT id, name, age, created_at FROM user ORDER BY id")
        return cur.fetchall()


def update_user(conn, user_id: int, age: int) -> int:
    with conn.cursor() as cur:
        affected = cur.execute("UPDATE user SET age = %s WHERE id = %s", (age, user_id))
    conn.commit()
    return affected


def delete_user(conn, user_id: int) -> int:
    with conn.cursor() as cur:
        affected = cur.execute("DELETE FROM user WHERE id = %s", (user_id,))
    conn.commit()
    return affected


def main() -> None:
    init_database()

    conn = get_conn()
    try:
        init_table(conn)

        print("新增 id =", insert_user(conn, "张三", 18))
        print("新增 id =", insert_user(conn, "李四", 20))
        print("查询全部:", list_users(conn))

        print("更新影响行数:", update_user(conn, 1, 19))
        print("删除影响行数:", delete_user(conn, 2))
        print("最终结果:", list_users(conn))
    finally:
        conn.close()


if __name__ == "__main__":
    try:
        main()
    except pymysql.err.OperationalError as err:
        print(f"连接 MySQL 失败，请先启动服务并确认账号密码：{err}")
