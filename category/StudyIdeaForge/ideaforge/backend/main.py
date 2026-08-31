import json
import os
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

import db
import llm
import search as searchmod

db.init()
app = FastAPI(title="IdeaForge")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


def rows(rs):
    return [dict(r) for r in rs]


@app.get("/api/health")
def health():
    return {"ok": True, "app": "IdeaForge"}


# ---------- providers ----------
@app.get("/api/providers")
def providers_list():
    c = db.conn()
    r = rows(c.execute("SELECT * FROM providers ORDER BY id").fetchall())
    c.close()
    return r


@app.post("/api/providers")
async def providers_add(req: Request):
    b = await req.json()
    c = db.conn()
    cur = c.execute(
        "INSERT INTO providers(name,base_url,api_key,model,is_default) VALUES(?,?,?,?,0)",
        (
            b.get("name", "新規プロバイダ"),
            b.get("base_url", "http://localhost:1234/v1"),
            b.get("api_key", ""),
            b.get("model", ""),
        ),
    )
    c.commit()
    i = cur.lastrowid
    c.close()
    return {"id": i}


@app.put("/api/providers/{pid}")
async def providers_update(pid: int, req: Request):
    b = await req.json()
    c = db.conn()
    c.execute(
        "UPDATE providers SET name=?,base_url=?,api_key=?,model=? WHERE id=?",
        (b.get("name", ""), b.get("base_url", ""), b.get("api_key", ""), b.get("model", ""), pid),
    )
    if b.get("is_default"):
        c.execute("UPDATE providers SET is_default=0")
        c.execute("UPDATE providers SET is_default=1 WHERE id=?", (pid,))
    c.commit()
    c.close()
    return {"ok": True}


@app.delete("/api/providers/{pid}")
def providers_delete(pid: int):
    c = db.conn()
    c.execute("DELETE FROM providers WHERE id=?", (pid,))
    c.commit()
    c.close()
    return {"ok": True}


# ---------- workflows ----------
@app.get("/api/workflows")
def workflows_list():
    c = db.conn()
    r = rows(
        c.execute(
            "SELECT id,name,description,is_preset,created_at,updated_at FROM workflows ORDER BY id"
        ).fetchall()
    )
    c.close()
    return r


@app.get("/api/workflows/{wid}")
def workflow_get(wid: int):
    c = db.conn()
    row = c.execute("SELECT * FROM workflows WHERE id=?", (wid,)).fetchone()
    c.close()
    if not row:
        raise HTTPException(404, "workflow not found")
    d = dict(row)
    d["graph"] = json.loads(d["graph"])
    return d


@app.post("/api/workflows")
async def workflow_add(req: Request):
    b = await req.json()
    now = time.time()
    c = db.conn()
    cur = c.execute(
        "INSERT INTO workflows(name,description,graph,is_preset,created_at,updated_at) VALUES(?,?,?,?,?,?)",
        (
            b.get("name", "無題のワークフロー"),
            b.get("description", ""),
            json.dumps(b.get("graph", {}), ensure_ascii=False),
            1 if b.get("is_preset") else 0,
            now,
            now,
        ),
    )
    c.commit()
    i = cur.lastrowid
    c.close()
    return {"id": i}


@app.put("/api/workflows/{wid}")
async def workflow_update(wid: int, req: Request):
    b = await req.json()
    c = db.conn()
    c.execute(
        "UPDATE workflows SET name=?,description=?,graph=?,updated_at=? WHERE id=?",
        (
            b.get("name", "無題のワークフロー"),
            b.get("description", ""),
            json.dumps(b.get("graph", {}), ensure_ascii=False),
            time.time(),
            wid,
        ),
    )
    c.commit()
    c.close()
    return {"ok": True}


@app.delete("/api/workflows/{wid}")
def workflow_delete(wid: int):
    c = db.conn()
    c.execute("DELETE FROM workflows WHERE id=?", (wid,))
    c.commit()
    c.close()
    return {"ok": True}


# ---------- sessions ----------
@app.get("/api/sessions")
def sessions_list():
    c = db.conn()
    r = rows(
        c.execute(
            "SELECT id,workflow_id,name,status,created_at,updated_at FROM sessions ORDER BY id DESC"
        ).fetchall()
    )
    c.close()
    return r


@app.get("/api/sessions/{sid}")
def session_get(sid: int):
    c = db.conn()
    row = c.execute("SELECT * FROM sessions WHERE id=?", (sid,)).fetchone()
    c.close()
    if not row:
        raise HTTPException(404, "session not found")
    d = dict(row)
    d["graph"] = json.loads(d["graph"])
    d["state"] = json.loads(d["state"])
    return d


@app.post("/api/sessions")
async def session_add(req: Request):
    b = await req.json()
    now = time.time()
    c = db.conn()
    cur = c.execute(
        "INSERT INTO sessions(workflow_id,name,graph,state,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
        (
            b.get("workflow_id"),
            b.get("name", "セッション"),
            json.dumps(b.get("graph", {}), ensure_ascii=False),
            json.dumps(b.get("state", {}), ensure_ascii=False),
            b.get("status", "running"),
            now,
            now,
        ),
    )
    c.commit()
    i = cur.lastrowid
    c.close()
    return {"id": i}


@app.patch("/api/sessions/{sid}")
async def session_update(sid: int, req: Request):
    b = await req.json()
    c = db.conn()
    if "state" in b:
        c.execute(
            "UPDATE sessions SET state=?,updated_at=? WHERE id=?",
            (json.dumps(b["state"], ensure_ascii=False), time.time(), sid),
        )
    if "status" in b:
        c.execute("UPDATE sessions SET status=? WHERE id=?", (b["status"], sid))
    if "name" in b:
        c.execute("UPDATE sessions SET name=? WHERE id=?", (b["name"], sid))
    c.commit()
    c.close()
    return {"ok": True}


@app.delete("/api/sessions/{sid}")
def session_delete(sid: int):
    c = db.conn()
    c.execute("DELETE FROM sessions WHERE id=?", (sid,))
    c.commit()
    c.close()
    return {"ok": True}


# ---------- settings ----------
@app.get("/api/settings")
def settings_get():
    return db.get_settings()


@app.put("/api/settings")
async def settings_put(req: Request):
    b = await req.json()
    db.set_settings(b)
    return {"ok": True}


# ---------- LLM ----------
@app.post("/api/llm/stream")
async def llm_stream(req: Request):
    b = await req.json()
    prov = db.get_provider(b.get("provider_id"))
    if not prov:
        raise HTTPException(400, "LLMプロバイダが未設定です")
    return StreamingResponse(
        llm.stream_chat(prov, b.get("messages", []), b.get("temperature", 0.9)),
        media_type="text/plain; charset=utf-8",
    )


@app.post("/api/llm/test")
async def llm_test(req: Request):
    b = await req.json()
    prov = db.get_provider(b.get("provider_id"))
    if not prov:
        return {"ok": False, "error": "プロバイダが見つかりません"}
    try:
        out = await llm.complete(prov, [{"role": "user", "content": "「OK」とだけ返して"}], 0)
        return {"ok": True, "reply": (out or "")[:200]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------- search ----------
@app.post("/api/search")
async def do_search(req: Request):
    b = await req.json()
    try:
        res = await searchmod.web_search(
            b.get("query", ""), int(b.get("max_results", 8)), b.get("engine")
        )
        return {"ok": True, "results": res}
    except Exception as e:
        return {"ok": False, "error": str(e), "results": []}


# ---------- sounds ----------
SOUNDS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sounds")
os.makedirs(SOUNDS, exist_ok=True)


@app.get("/api/sounds")
def sounds_list():
    return sorted(
        f for f in os.listdir(SOUNDS)
        if not f.startswith(".") and os.path.isfile(os.path.join(SOUNDS, f))
    )


@app.put("/api/sounds/{name}")
async def sound_upload(name: str, req: Request):
    name = os.path.basename(name)
    data = await req.body()
    with open(os.path.join(SOUNDS, name), "wb") as f:
        f.write(data)
    return {"ok": True, "name": name}


app.mount("/sounds", StaticFiles(directory=SOUNDS), name="sounds")


# ---------- static frontend (must be mounted last) ----------
DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")
if os.path.isdir(DIST):
    app.mount("/", StaticFiles(directory=DIST, html=True), name="static")
