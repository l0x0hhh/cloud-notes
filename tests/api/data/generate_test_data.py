"""Generate all 3 JSON test data files with programmatically computed long strings."""
import json
import os

data_dir = os.path.dirname(os.path.abspath(__file__))

# File 1: auth_cases.json
auth_cases = [
  {"test_id": "register_missing_username", "description": "注册-缺少username字段", "method": "POST", "path": "/register", "body": {"password": "test123"}, "expected_status": 400, "expected_error": "参数错误"},
  {"test_id": "register_missing_password", "description": "注册-缺少password字段", "method": "POST", "path": "/register", "body": {"username": "testuser"}, "expected_status": 400, "expected_error": "参数错误"},
  {"test_id": "register_empty_username", "description": "注册-用户名为空字符串", "method": "POST", "path": "/register", "body": {"username": "", "password": "test123"}, "expected_status": 200, "expected_error": None},
  {"test_id": "register_empty_password", "description": "注册-密码为空字符串", "method": "POST", "path": "/register", "body": {"username": "user1", "password": ""}, "expected_status": 200, "expected_error": None},
  {"test_id": "register_long_username", "description": "注册-超长用户名（255字符）", "method": "POST", "path": "/register", "body": {"username": "a" * 255, "password": "test123"}, "expected_status": 200, "expected_error": None},
  {"test_id": "register_special_chars", "description": "注册-用户名含特殊字符", "method": "POST", "path": "/register", "body": {"username": "user@#$%^&*()", "password": "test123"}, "expected_status": 200, "expected_error": None},
  {"test_id": "register_unicode_username", "description": "注册-用户名含Unicode字符", "method": "POST", "path": "/register", "body": {"username": "用户🔥测试", "password": "test123"}, "expected_status": 200, "expected_error": None},
  {"test_id": "register_duplicate", "description": "注册-重复用户名", "method": "POST", "path": "/register", "body": {"username": "__dup_test__", "password": "test123"}, "expected_status": 500, "expected_error": "注册失败", "setup": "先注册一次同名用户"},
  {"test_id": "register_no_body", "description": "注册-请求体为空", "method": "POST", "path": "/register", "body": None, "expected_status": 400, "expected_error": "参数错误"},
  {"test_id": "register_wrong_content_type", "description": "注册-非JSON请求体", "method": "POST", "path": "/register", "body": "not-json-string", "expected_status": 400, "expected_error": "参数错误", "raw_body": True},
  {"test_id": "login_missing_username", "description": "登录-缺少username", "method": "POST", "path": "/login", "body": {"password": "test123"}, "expected_status": 400, "expected_error": "参数错误"},
  {"test_id": "login_missing_password", "description": "登录-缺少password", "method": "POST", "path": "/login", "body": {"username": "testuser"}, "expected_status": 400, "expected_error": "参数错误"},
  {"test_id": "login_user_not_exist", "description": "登录-用户不存在", "method": "POST", "path": "/login", "body": {"username": "nonexistent_user_xyz", "password": "test123"}, "expected_status": 401, "expected_error": "用户不存在"},
  {"test_id": "login_wrong_password", "description": "登录-密码错误", "method": "POST", "path": "/login", "body": {"username": "__login_test__", "password": "wrong_password_xyz"}, "expected_status": 401, "expected_error": "密码错误", "setup": "先注册用户 __login_test__"},
  {"test_id": "auth_no_token", "description": "鉴权-请求无Authorization头", "method": "GET", "path": "/api/notes", "body": None, "expected_status": 401, "expected_error": "未提供token", "no_auth": True},
  {"test_id": "auth_empty_token", "description": "鉴权-Authorization头为空", "method": "GET", "path": "/api/notes", "body": None, "headers": {"Authorization": ""}, "expected_status": 401, "expected_error": "未提供token"},
  {"test_id": "auth_wrong_token", "description": "鉴权-错误Token（随机字符串）", "method": "GET", "path": "/api/notes", "body": None, "headers": {"Authorization": "Bearer this_is_a_wrong_token_xyz"}, "expected_status": 401, "expected_error": "token无效"},
  {"test_id": "auth_expired_token", "description": "鉴权-过期Token", "method": "GET", "path": "/api/notes", "body": None, "use_expired_token": True, "expected_status": 401, "expected_error": "token无效"},
  {"test_id": "auth_tampered_token", "description": "鉴权-篡改Token", "method": "GET", "path": "/api/notes", "body": None, "use_invalid_token": True, "expected_status": 401, "expected_error": "token无效"},
  {"test_id": "auth_malformed_token", "description": "鉴权-格式错误Token（非JWT格式）", "method": "GET", "path": "/api/notes", "body": None, "use_malformed_token": True, "expected_status": 401, "expected_error": "token无效"},
  {"test_id": "auth_bearer_only", "description": "鉴权-只有Bearer前缀无Token值", "method": "GET", "path": "/api/notes", "body": None, "headers": {"Authorization": "Bearer"}, "expected_status": 401, "expected_error": "token格式错误"},
  {"test_id": "auth_no_bearer_prefix", "description": "鉴权-无Bearer前缀（直接传Token）", "method": "GET", "path": "/api/notes", "body": None, "headers": {"Authorization": "some.jwt.token.here"}, "expected_status": 401, "expected_error": "token格式错误"},
]

# File 2: notes_cases.json
notes_cases = [
  {"test_id": "create_note_normal", "description": "创建笔记-正常标题和内容", "scenario": "create", "body": {"title": "测试笔记", "content": "这是笔记内容"}, "expected_status": 200, "expected_key": "note"},
  {"test_id": "create_note_empty_title", "description": "创建笔记-空标题", "scenario": "create", "body": {"title": "", "content": "内容"}, "expected_status": 200, "expected_key": "note"},
  {"test_id": "create_note_empty_content", "description": "创建笔记-空内容", "scenario": "create", "body": {"title": "标题", "content": ""}, "expected_status": 200, "expected_key": "note"},
  {"test_id": "create_note_missing_title", "description": "创建笔记-缺少title字段", "scenario": "create", "body": {"content": "内容"}, "expected_status": 400, "expected_key": "error"},
  {"test_id": "create_note_missing_content", "description": "创建笔记-缺少content字段", "scenario": "create", "body": {"title": "标题"}, "expected_status": 400, "expected_key": "error"},
  {"test_id": "create_note_no_body", "description": "创建笔记-请求体为空", "scenario": "create", "use_empty_body": True, "expected_status": 400, "expected_key": "error"},
  {"test_id": "create_note_long_title", "description": "创建笔记-超长标题（1000字符）", "scenario": "create", "body": {"title": "测" * 1000, "content": "内容"}, "expected_status": 200, "expected_key": "note"},
  {"test_id": "create_note_special_chars", "description": "创建笔记-标题含HTML标签", "scenario": "create", "body": {"title": "<script>alert('xss')</script>", "content": "内容"}, "expected_status": 200, "expected_key": "note"},
  {"test_id": "create_note_unicode", "description": "创建笔记-Unicode全字符集标题", "scenario": "create", "body": {"title": "中文日本語한국어🔥🎉", "content": "多语言内容测试"}, "expected_status": 200, "expected_key": "note"},
  {"test_id": "get_list_normal", "description": "获取笔记列表-正常返回", "scenario": "get_list", "expected_status": 200, "expected_type": "list"},
  {"test_id": "get_list_empty", "description": "获取笔记列表-新用户空列表", "scenario": "get_list_empty", "expected_status": 200, "expected_type": "empty_list"},
  {"test_id": "get_note_by_id_normal", "description": "获取单条笔记-正常获取", "scenario": "get_by_id", "expected_status": 200, "expected_key": "title"},
  {"test_id": "get_note_by_id_not_exist", "description": "获取单条笔记-不存在的ID", "scenario": "get_by_id_not_exist", "not_exist_id": 99999, "expected_status": 404, "expected_error": "笔记不存在"},
  {"test_id": "get_note_by_id_invalid_format", "description": "获取单条笔记-ID格式错误（非数字）", "scenario": "get_by_id_invalid", "invalid_id": "abc", "expected_status": 400, "expected_error": "笔记ID格式错误"},
  {"test_id": "update_note_normal", "description": "更新笔记-正常更新标题和内容", "scenario": "update", "body": {"title": "更新后的标题", "content": "更新后的内容"}, "expected_status": 200, "expected_message": "更新成功"},
  {"test_id": "update_note_title_only", "description": "更新笔记-只更新标题", "scenario": "update", "body": {"title": "新标题", "content": ""}, "expected_status": 200, "expected_message": "更新成功"},
  {"test_id": "update_note_not_exist", "description": "更新笔记-不存在的笔记ID", "scenario": "update_not_exist", "not_exist_id": 99999, "body": {"title": "标题", "content": "内容"}, "expected_status": 500, "expected_error": "更新失败"},
  {"test_id": "update_note_missing_body", "description": "更新笔记-请求体为空", "scenario": "update_empty_body", "expected_status": 400, "expected_error": "参数错误"},
  {"test_id": "delete_note_normal", "description": "删除笔记-正常删除", "scenario": "delete", "expected_status": 200, "expected_message": "删除成功"},
  {"test_id": "delete_note_not_exist", "description": "删除笔记-不存在的笔记ID", "scenario": "delete_not_exist", "not_exist_id": 99999, "expected_status": 500, "expected_error": "删除失败"},
  {"test_id": "delete_then_get", "description": "删除后访问-删除笔记后再次获取应返回404", "scenario": "delete_then_get", "expected_status": 404, "expected_error": "笔记不存在"},
  {"test_id": "delete_then_update", "description": "删除后更新-删除笔记后尝试更新", "scenario": "delete_then_update", "body": {"title": "尝试更新", "content": "已删除的笔记"}, "expected_status": 500, "expected_error": "更新失败"},
  {"test_id": "delete_then_delete", "description": "重复删除-两次删除同一笔记", "scenario": "delete_then_delete", "expected_status": 500, "expected_error": "删除失败"},
  {"test_id": "cross_user_get_note", "description": "跨用户隔离-用户A无法获取用户B的笔记", "scenario": "cross_user_get", "expected_status": 404, "expected_error": "笔记不存在"},
  {"test_id": "cross_user_update_note", "description": "跨用户隔离-用户A无法更新用户B的笔记", "scenario": "cross_user_update", "body": {"title": "恶意修改", "content": "不应该成功"}, "expected_status": 500, "expected_error": "更新失败"},
  {"test_id": "cross_user_delete_note", "description": "跨用户隔离-用户A无法删除用户B的笔记", "scenario": "cross_user_delete", "expected_status": 500, "expected_error": "删除失败"},
  {"test_id": "create_note_with_newlines", "description": "创建笔记-内容含大量换行符", "scenario": "create", "body": {"title": "多行笔记", "content": ("第1行\n第2行\n第3行\n") * 100}, "expected_status": 200, "expected_key": "note"},
  {"test_id": "create_note_with_json_in_content", "description": "创建笔记-内容包含JSON字符串", "scenario": "create", "body": {"title": "JSON内容", "content": "{\"key\": \"value\", \"nested\": {\"a\": 1}}"}, "expected_status": 200, "expected_key": "note"},
]

# File 3: boundary_cases.json
boundary_cases = [
  {"test_id": "boundary_content_1_byte", "description": "边界值-1字节内容", "content_size": 1, "expected_status": 200},
  {"test_id": "boundary_content_1kb", "description": "边界值-1KB内容", "content_size": 1024, "expected_status": 200},
  {"test_id": "boundary_content_10kb", "description": "边界值-10KB内容", "content_size": 10240, "expected_status": 200},
  {"test_id": "boundary_content_100kb", "description": "边界值-100KB内容", "content_size": 102400, "expected_status": 200},
  {"test_id": "boundary_content_500kb", "description": "边界值-500KB内容", "content_size": 512000, "expected_status": 200, "slow": True},
  {"test_id": "boundary_content_1mb", "description": "边界值-1MB内容", "content_size": 1048576, "expected_status": 200, "slow": True},
  {"test_id": "boundary_content_3mb", "description": "边界值-3MB内容", "content_size": 3145728, "expected_status": 200, "slow": True},
  {"test_id": "boundary_content_5mb_exact", "description": "边界值-精确5MB内容（上限）", "content_size": 5242880, "expected_status": 200, "slow": True},
  {"test_id": "boundary_content_5mb_plus_1", "description": "边界值-5MB+1字节内容（超过上限）", "content_size": 5242881, "expected_status": 413, "slow": True},
  {"test_id": "boundary_content_10mb", "description": "边界值-10MB内容（远超上限）", "content_size": 10485760, "expected_status": 413, "slow": True},
  {"test_id": "boundary_title_1_char", "description": "边界值-标题1个字符", "title": "A", "expected_status": 200},
  {"test_id": "boundary_title_empty", "description": "边界值-标题为空字符串", "title": "", "expected_status": 200},
  {"test_id": "boundary_title_unicode_only", "description": "边界值-标题纯Unicode特殊字符", "title": "🔥🎉❤️💻🚀✨🌟", "expected_status": 200},
  {"test_id": "boundary_title_sql_injection", "description": "边界值-标题含SQL注入payload", "title": "'; DROP TABLE notes; --", "expected_status": 200},
  {"test_id": "boundary_content_xss_payload", "description": "边界值-内容含XSS payload", "content": "<img src=x onerror=alert(1)>", "expected_status": 200},
  {"test_id": "boundary_content_binary_simulated", "description": "边界值-内容含null字节和二进制字符", "content_includes_null": True, "expected_status": 200},
]

# Write all three files
for filename, data in [("auth_cases.json", auth_cases), ("notes_cases.json", notes_cases), ("boundary_cases.json", boundary_cases)]:
    filepath = os.path.join(data_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Written {filepath} ({len(data)} cases)")

# Verification
print("\nVerification:")
auth = json.load(open(os.path.join(data_dir, "auth_cases.json"), encoding='utf-8'))
notes = json.load(open(os.path.join(data_dir, "notes_cases.json"), encoding='utf-8'))
bound = json.load(open(os.path.join(data_dir, "boundary_cases.json"), encoding='utf-8'))
print(f"Auth: {len(auth)}, Notes: {len(notes)}, Boundary: {len(bound)}, Total: {len(auth)+len(notes)+len(bound)}")
print(f"long_username len: {len(auth[4]['body']['username'])}")
print(f"long_title len: {len(notes[6]['body']['title'])}")
