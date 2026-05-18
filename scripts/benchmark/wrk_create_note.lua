-- wrk 创建笔记压测脚本
-- 先登录获取 token，然后用 token 创建笔记
-- 用法: wrk -s wrk_create_note.lua -d30s http://host:port

-- 在 setup 阶段获取 token
function setup(thread)
    -- 每个线程在启动前获取自己的 token
    thread:set("id", math.random(1, 10000))
end

function init(args)
    local cmd = string.format(
        [[curl -s -X POST %s/login -H "Content-Type: application/json" -d '{"username":"bench_user","password":"bench123"}']],
        args[1]
    )
    local handle = io.popen(cmd)
    local result = handle:read("*a")
    handle:close()
    -- 提取 token
    local token = result:match('"token":"([^"]*)"')
    if not token then
        print("ERROR: 无法获取 token: " .. result)
        os.exit(1)
    end
    wrk.headers["Authorization"] = "Bearer " .. token
    wrk.headers["Content-Type"] = "application/json"
end

counter = 0

request = function()
    counter = counter + 1
    local body = string.format(
        [[{"title":"压测笔记_%d","content":"这是并发压测生成的第%d条笔记内容"}]],
        counter, counter
    )
    wrk.body = body
    return wrk.format("POST", "/api/notes")
end
