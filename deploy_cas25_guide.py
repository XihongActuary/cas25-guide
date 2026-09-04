# -*- coding: utf-8 -*-
# cas25-guide 公开版部署脚本 v2（token 经环境变量 GITHUB_TOKEN 传入，绝不写盘）
# 加固：JSON 容错 / 重试退避 / PUT后校验 / 内容一致则跳过
import os, sys, json, base64, time, urllib.request, urllib.error

API = "https://api.github.com"
TOKEN = os.environ["GITHUB_TOKEN"]
OWNER = "XihongActuary"
REPO = "cas25-guide"
BRANCH = "main"
LOCAL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
RETRY = 5

def api(method, path, body=None):
    req = urllib.request.Request(
        API + path,
        data=(json.dumps(body).encode() if body is not None else None),
        method=method)
    req.add_header("Authorization", "Bearer " + TOKEN)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("Content-Type", "application/json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read().decode()
            try:
                return r.status, json.loads(raw or "{}")
            except json.JSONDecodeError:
                return r.status, {"_nonjson": raw[:200]}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(raw or "{}")
        except json.JSONDecodeError:
            return e.code, {"_nonjson": raw[:200]}
    except Exception as e:  # 网络瞬时错误
        return -1, {"_neterr": str(e)[:200]}

def api_retry(method, path, body=None):
    for i in range(RETRY):
        st, res = api(method, path, body)
        if st in (-1,) or st >= 500 or (st == 403 and "_nonjson" in res):
            time.sleep(2 ** i + 1)
            continue
        return st, res
    return st, res

def files(root):
    out = []
    for dp, _, fns in os.walk(root):
        for fn in fns:
            f = os.path.join(dp, fn)
            out.append((os.path.relpath(f, root).replace(os.sep, "/"), f))
    return sorted(out)

def put_file(rel, b64):
    """PUT 单文件，冲突(409)时取新 sha 重试"""
    for i in range(RETRY):
        st, g = api_retry("GET", f"/repos/{OWNER}/{REPO}/contents/{rel}?ref={BRANCH}")
        if st == 200 and g.get("content"):
            import base64 as _b
            try:
                remote = _b.b64decode(g["content"]).decode("utf-8", "replace")
                local = base64.b64decode(b64).decode("utf-8", "replace") if rel.endswith((".html", ".js", ".css")) else None
                if local is not None and remote == local:
                    return "skip", "内容一致"
            except Exception:
                pass
        body = {"message": "deploy: " + rel, "content": b64, "branch": BRANCH}
        if st == 200 and "sha" in g:
            body["sha"] = g["sha"]
        st2, res = api_retry("PUT", f"/repos/{OWNER}/{REPO}/contents/{rel}", body)
        if st2 in (200, 201):
            return st2, ""
        if st2 == 409:  # 冲突，重取 sha 再试
            time.sleep(1 + i)
            continue
        return st2, str(res.get("message", res))[:120]
    return "FAIL", "多次冲突"

# 0. 校验 token
st, me = api_retry("GET", "/user")
print("token user:", me.get("login"), st)
if st != 200:
    sys.exit("token 校验失败")

# 1. 仓库已存在（首轮已建），逐文件补齐
allf = files(LOCAL)
print("待处理文件数:", len(allf))
fail = []
for idx, (rel, full) in enumerate(allf, 1):
    b64 = base64.b64encode(open(full, "rb").read()).decode()
    st, msg = put_file(rel, b64)
    print(f"[{idx}/{len(allf)}] {st} {rel} {msg}")
    if st == "FAIL":
        fail.append(rel)
    time.sleep(0.8)  # 避免快速连续写入竞态
if fail:
    print("失败文件:", fail)
    sys.exit(1)

# 2. 终验：远端文件与本地逐字节比对
bad = []
for rel, full in files(LOCAL):
    st, g = api_retry("GET", f"/repos/{OWNER}/{REPO}/contents/{rel}?ref={BRANCH}")
    if st != 200:
        bad.append((rel, "缺失", st))
        continue
    import base64 as _b
    if _b.b64decode(g["content"]) != open(full, "rb").read():
        bad.append((rel, "内容不一致", st))
print("终验:", "全部一致" if not bad else bad)
if bad:
    sys.exit(1)

# 3. 开启 Pages
st, res = api_retry("POST", f"/repos/{OWNER}/{REPO}/pages",
                    {"source": {"branch": BRANCH, "path": "/"}})
print("Pages:", st, res.get("html_url", res.get("message", "")))
