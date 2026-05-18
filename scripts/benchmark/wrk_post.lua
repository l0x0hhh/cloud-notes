-- wrk POST 请求脚本（用于注册和登录）
-- 用法: wrk -s wrk_post.lua -d30s http://host:port/path

wrk.method = "POST"
wrk.body   = [[{"username":"bench_user","password":"bench123"}]]
wrk.headers["Content-Type"] = "application/json"

-- 每次请求后重置计数器，用于 username 随机化
counter = 0

request = function()
    counter = counter + 1
    local body = string.format(
        [[{"username":"user_%d","password":"pass%d"}]],
        counter, counter
    )
    wrk.body = body
    return wrk.format("POST")
end
