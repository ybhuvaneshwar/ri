"""Namma Kavacha — Backend API
FastAPI + MongoDB + JWT auth + Kavacha AI (Claude Sonnet 4.5 via Emergent LLM key)
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, WebSocket, WebSocketDisconnect, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os, uuid, jwt, bcrypt, logging, io, random, json, asyncio, hashlib
from collections import Counter, defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="Namma Kavacha API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("kavacha")

# ---------- WEBSOCKET MANAGER ----------
class WSManager:
    def __init__(self):
        self.active: set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)

    async def broadcast(self, event: dict):
        dead = []
        for ws in list(self.active):
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for d in dead:
            self.active.discard(d)

ws_manager = WSManager()

async def emit(event_type: str, payload: dict):
    await ws_manager.broadcast({"type": event_type, "payload": payload, "ts": datetime.now(timezone.utc).isoformat()})

# ---------- MODELS ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str  # admin | analyst | supervisor
    department: str = "Karnataka State Police"
    designation: str = ""
    unit: str = ""
    district: str = ""
    phone: str = ""
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None
    avatar: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: str
    password: str
    designation: Optional[str] = ""
    unit: Optional[str] = ""
    district: Optional[str] = ""
    phone: Optional[str] = ""

class Case(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fir_no: str
    title: str
    crime_head: str
    crime_sub_head: str = ""
    district: str
    unit: str
    status: str = "Open"  # Open, Under Investigation, Chargesheeted, Closed
    severity: str = "Medium"  # Low, Medium, High, Critical
    date_registered: str
    location: str
    lat: float
    lng: float
    description: str = ""
    victims: List[Dict[str, Any]] = []
    accused: List[Dict[str, Any]] = []
    complainant: Dict[str, Any] = {}
    arrests: List[Dict[str, Any]] = []
    chargesheet: Optional[Dict[str, Any]] = None
    io_officer: str = ""
    court: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_email: str
    user_role: str
    action: str
    resource: str
    resource_id: Optional[str] = None
    details: str = ""
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    context_case_id: Optional[str] = None

# ---------- AUTH HELPERS ----------
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_token(user: dict) -> str:
    payload = {"sub": user["id"], "email": user["email"], "role": user["role"],
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def current_user(cred: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not cred:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user or not user.get("active"):
        raise HTTPException(401, "User inactive")
    return user

def require_role(*roles):
    async def dep(user: dict = Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, f"Requires role in {roles}")
        return user
    return dep

async def log_audit(user: dict, action: str, resource: str, resource_id: str = None, details: str = ""):
    entry = AuditLog(user_email=user["email"], user_role=user["role"], action=action,
                     resource=resource, resource_id=resource_id, details=details)
    await db.audit_logs.insert_one(entry.model_dump())

# ---------- SEED ----------
DISTRICTS = [
    {"name": "Bengaluru City", "lat": 12.9716, "lng": 77.5946},
    {"name": "Mysuru", "lat": 12.2958, "lng": 76.6394},
    {"name": "Mangaluru", "lat": 12.9141, "lng": 74.8560},
    {"name": "Hubballi-Dharwad", "lat": 15.3647, "lng": 75.1240},
    {"name": "Belagavi", "lat": 15.8497, "lng": 74.4977},
    {"name": "Kalaburagi", "lat": 17.3297, "lng": 76.8343},
    {"name": "Tumakuru", "lat": 13.3379, "lng": 77.1173},
    {"name": "Shivamogga", "lat": 13.9299, "lng": 75.5681},
]
CRIME_HEADS = [
    ("Property Crime", "Theft"), ("Property Crime", "Burglary"), ("Property Crime", "Robbery"),
    ("Violent Crime", "Assault"), ("Violent Crime", "Murder"), ("Violent Crime", "Kidnapping"),
    ("Cyber Crime", "Online Fraud"), ("Cyber Crime", "Identity Theft"), ("Cyber Crime", "Phishing"),
    ("Economic Offence", "Cheating"), ("Economic Offence", "Forgery"),
    ("Narcotics", "Drug Peddling"), ("Public Order", "Rioting"),
]
FIRST_NAMES = ["Arjun","Vikram","Ravi","Suresh","Anitha","Priya","Kiran","Rajesh","Manoj","Deepa","Sunita","Naveen","Rahul","Sanjay","Pooja","Meera","Vinod","Ashwin","Lakshmi","Ganesh"]
LAST_NAMES = ["Kumar","Gowda","Rao","Reddy","Shetty","Patil","Iyer","Naidu","Prasad","Bhat","Hegde","Kulkarni","Menon","Nair","Sharma"]

def rand_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

async def seed_users():
    demos = [
        {"email":"admin@nammakavacha.ai","name":"Arjun Kumar","role":"admin","password":"Admin@123","designation":"System Administrator","unit":"HQ","district":"Bengaluru City","phone":"+91-9876543210"},
        {"email":"analyst@nammakavacha.ai","name":"Priya Shetty","role":"analyst","password":"Analyst@123","designation":"Crime Analyst","unit":"CID","district":"Bengaluru City","phone":"+91-9876543211"},
        {"email":"supervisor@nammakavacha.ai","name":"Vikram Rao","role":"supervisor","password":"Supervisor@123","designation":"Deputy Commissioner","unit":"HQ","district":"Bengaluru City","phone":"+91-9876543212"},
    ]
    for d in demos:
        existing = await db.users.find_one({"email": d["email"]})
        pw_hash = hash_pw(d.pop("password"))
        if not existing:
            u = User(**d).model_dump()
            u["password"] = pw_hash
            await db.users.insert_one(u)
            logger.info(f"Seeded user {d['email']}")
        else:
            # Always reset password to keep demo idempotent
            await db.users.update_one({"email": d["email"]}, {"$set": {"password": pw_hash, "active": True}})

DATASET_URL = "https://customer-assets-0z36b82j.emergentagent.net/job_kavacha-ai-police/artifacts/q3uj4w6j_Police_FIR_Dataset_5000.xlsx"

# All 31 Karnataka districts with approximate centroids — used to evenly distribute
# case markers on the Map Intelligence view instead of clustering around Bengaluru.
KARNATAKA_DISTRICTS: list[tuple[str, float, float]] = [
    ("Bengaluru Urban", 12.9716, 77.5946), ("Bengaluru Rural", 13.2846, 77.6871),
    ("Mysuru", 12.2958, 76.6394), ("Mangaluru", 12.9141, 74.8560),
    ("Hubballi-Dharwad", 15.3647, 75.1240), ("Belagavi", 15.8497, 74.4977),
    ("Kalaburagi", 17.3297, 76.8343), ("Tumakuru", 13.3379, 77.1173),
    ("Shivamogga", 13.9299, 75.5681), ("Vijayapura", 16.8302, 75.7100),
    ("Ballari", 15.1394, 76.9214), ("Raichur", 16.2076, 77.3463),
    ("Bidar", 17.9104, 77.5199), ("Chikkamagaluru", 13.3161, 75.7720),
    ("Hassan", 13.0060, 76.0993), ("Udupi", 13.3409, 74.7421),
    ("Chitradurga", 14.2251, 76.4009), ("Davanagere", 14.4644, 75.9218),
    ("Kolar", 13.1372, 78.1298), ("Mandya", 12.5218, 76.8951),
    ("Chikkaballapura", 13.4355, 77.7315), ("Ramanagara", 12.7159, 77.2775),
    ("Bagalkote", 16.1862, 75.6961), ("Gadag", 15.4315, 75.6355),
    ("Haveri", 14.7935, 75.4038), ("Yadgir", 16.7710, 77.1409),
    ("Koppal", 15.3547, 76.1546), ("Chamarajanagar", 11.9261, 76.9437),
    ("Uttara Kannada", 14.8027, 74.1279), ("Kodagu", 12.4207, 75.7397),
    ("Vijayanagara", 15.2650, 76.3803),
]

def assign_karnataka_district(seed_str: str) -> tuple[str, float, float]:
    """Deterministically assign a Karnataka district + jittered coords from a seed string."""
    if not seed_str: seed_str = str(uuid.uuid4())
    h = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    name, lat, lng = KARNATAKA_DISTRICTS[h % len(KARNATAKA_DISTRICTS)]
    jx = ((h % 10000) / 10000 - 0.5) * 0.28
    jy = (((h >> 20) % 10000) / 10000 - 0.5) * 0.28
    return name, round(lat + jx, 4), round(lng + jy, 4)

def _parse_dataset_bytes(content: bytes) -> list[dict]:
    import openpyxl
    from collections import defaultdict
    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb["FIR_Data"] if "FIR_Data" in wb.sheetnames else wb.active
    headers = None
    grouped: dict[str, dict] = {}
    status_map = {"Chargesheet Filed": "Chargesheeted", "Under Investigation": "Under Investigation",
                  "Closed": "Closed", "Open": "Open", "Filed": "Chargesheeted"}
    severity_map = {"Serious": "High", "Less Serious": "Medium", "Very Serious": "Critical",
                    "Minor": "Low", "Grave": "Critical"}
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            headers = row; continue
        rec = dict(zip(headers, row))
        fir = str(rec.get("FIRNo") or "").strip()
        if not fir: continue
        station = str(rec.get("PoliceStationName") or "").strip() or "Karnataka"
        # Evenly distribute cases across all 31 Karnataka districts (seeded by FIR + station)
        district_name, lat, lng = assign_karnataka_district(f"{fir}-{station}")
        date_raw = rec.get("CrimeRegisteredDate")
        date_str = str(date_raw)[:10] if date_raw else datetime.now(timezone.utc).date().isoformat()
        victim = None
        if rec.get("VictimName"):
            try: v_age = int(rec.get("VictimAge") or 0)
            except Exception: v_age = 0
            victim = {"name": str(rec["VictimName"]), "age": v_age, "gender": str(rec.get("VictimGender") or ""), "contact": ""}
        accused = None
        if rec.get("AccusedName"):
            try: a_age = int(rec.get("AccusedAge") or 0)
            except Exception: a_age = 0
            accused = {"name": str(rec["AccusedName"]), "age": a_age, "gender": str(rec.get("AccusedGender") or ""), "status": "Unknown"}

        if fir not in grouped:
            grouped[fir] = {
                "id": str(uuid.uuid4()),
                "fir_no": fir,
                "title": f"{rec.get('CrimeMinorHeadName') or 'Case'} at {district_name}",
                "crime_head": str(rec.get("CrimeMajorHeadName") or "General"),
                "crime_sub_head": str(rec.get("CrimeMinorHeadName") or ""),
                "district": district_name,
                "unit": f"{station} PS",
                "status": status_map.get(str(rec.get("CaseStatusName") or ""), str(rec.get("CaseStatusName") or "Open")),
                "severity": severity_map.get(str(rec.get("GravityName") or ""), "Medium"),
                "date_registered": date_str,
                "location": f"{station}, {district_name}",
                "lat": lat, "lng": lng,
                "description": str(rec.get("BriefFacts") or ""),
                "victims": [], "accused": [],
                "complainant": {"name": "", "phone": "", "address": station},
                "arrests": [],
                "chargesheet": {"filed_date": date_str, "sections": []} if str(rec.get("CaseStatusName") or "") == "Chargesheet Filed" else None,
                "io_officer": str(rec.get("PoliceName") or ""),
                "court": f"Court #{rec.get('CourtID') or ''}",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "case_category": str(rec.get("CaseCategoryName") or ""),
                "police_station": station,
            }
        if victim and not any(v["name"] == victim["name"] for v in grouped[fir]["victims"]):
            grouped[fir]["victims"].append(victim)
        if accused and not any(a["name"] == accused["name"] for a in grouped[fir]["accused"]):
            grouped[fir]["accused"].append(accused)
    return list(grouped.values())

async def seed_from_dataset() -> bool:
    try:
        import requests
        content = await asyncio.to_thread(lambda: requests.get(DATASET_URL, timeout=60).content)
        docs = await asyncio.to_thread(_parse_dataset_bytes, content)
        if not docs: return False
        await db.cases.delete_many({})
        for i in range(0, len(docs), 500):
            await db.cases.insert_many(docs[i:i+500])
        await db.metadata.update_one({"key":"data_version"}, {"$set":{"key":"data_version","value":3,"at":datetime.now(timezone.utc).isoformat()}}, upsert=True)
        logger.info(f"Imported {len(docs)} cases from provided dataset (v3 · districts + coords spread across Karnataka)")
        return True
    except Exception as e:
        logger.warning(f"Dataset import failed: {e}")
        return False

async def seed_cases():
    count = await db.cases.count_documents({})
    version_doc = await db.metadata.find_one({"key":"data_version"})
    version = (version_doc or {}).get("value", 0)
    if count >= 1000 and version >= 3:
        return
    ok = await seed_from_dataset()
    if ok:
        return
    # Fallback: synthetic 80 cases
    await db.cases.delete_many({})
    random.seed(42)
    statuses = ["Open","Under Investigation","Chargesheeted","Closed"]
    severities = ["Low","Medium","High","Critical"]
    cases = []
    now = datetime.now(timezone.utc)
    # Build a network of shared accused for graph analysis
    accused_pool = [{"name": rand_name(), "age": random.randint(19,55), "gender": random.choice(["M","F"])} for _ in range(30)]
    for i in range(80):
        d = random.choice(DISTRICTS)
        ch, csh = random.choice(CRIME_HEADS)
        date = now - timedelta(days=random.randint(1, 365))
        num_accused = random.randint(1,3)
        case_accused = random.sample(accused_pool, num_accused)
        c = Case(
            fir_no=f"FIR/{date.year}/{d['name'][:3].upper()}/{1000+i}",
            title=f"{csh} at {d['name']}",
            crime_head=ch, crime_sub_head=csh,
            district=d["name"], unit=f"{d['name']} Central PS",
            status=random.choices(statuses, weights=[30,35,20,15])[0],
            severity=random.choices(severities, weights=[20,40,30,10])[0],
            date_registered=date.date().isoformat(),
            location=f"Sector {random.randint(1,20)}, {d['name']}",
            lat=d["lat"] + random.uniform(-0.15, 0.15),
            lng=d["lng"] + random.uniform(-0.15, 0.15),
            description=f"A case of {csh.lower()} was reported in {d['name']}. Investigation ongoing with forensic and witness leads being pursued.",
            victims=[{"name": rand_name(), "age": random.randint(18,70), "gender": random.choice(["M","F"]), "contact": f"+91-98{random.randint(10000000,99999999)}"} for _ in range(random.randint(1,2))],
            accused=[{**a, "status": random.choice(["Arrested","Absconding","On Bail"])} for a in case_accused],
            complainant={"name": rand_name(), "phone": f"+91-98{random.randint(10000000,99999999)}", "address": f"House {random.randint(1,200)}, {d['name']}"},
            arrests=[{"person": a["name"], "date": (date + timedelta(days=random.randint(1,20))).date().isoformat(), "officer": rand_name()} for a in case_accused if random.random() > 0.4],
            chargesheet=({"filed_date": (date + timedelta(days=random.randint(30,90))).date().isoformat(), "sections": ["IPC 379","IPC 411"]} if random.random()>0.5 else None),
            io_officer=f"Inspector {rand_name()}",
            court=f"JMFC Court, {d['name']}",
        )
        cases.append(c.model_dump())
    await db.cases.insert_many(cases)
    logger.info(f"Seeded {len(cases)} cases")

# ---------- ROUTES: AUTH ----------
@api.post("/auth/login")
async def login(req: LoginRequest):
    u = await db.users.find_one({"email": req.email})
    if not u or not verify_pw(req.password, u.get("password","")):
        raise HTTPException(401, "Invalid credentials")
    if not u.get("active", True):
        raise HTTPException(403, "Account deactivated")
    await db.users.update_one({"id": u["id"]}, {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}})
    token = make_token(u)
    u.pop("password", None); u.pop("_id", None)
    await log_audit(u, "login", "auth")
    return {"token": token, "user": u}

@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user

# ---------- ROUTES: USERS (admin) ----------
@api.get("/users")
async def list_users(user: dict = Depends(require_role("admin"))):
    users = await db.users.find({}, {"_id":0, "password":0}).to_list(500)
    return users

@api.post("/users")
async def create_user(payload: UserCreate, user: dict = Depends(require_role("admin"))):
    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(400, "Email already exists")
    u = User(email=payload.email, name=payload.name, role=payload.role,
             designation=payload.designation or "", unit=payload.unit or "",
             district=payload.district or "", phone=payload.phone or "").model_dump()
    u["password"] = hash_pw(payload.password)
    await db.users.insert_one(u)
    await log_audit(user, "create", "user", u["id"], f"Created {payload.email}")
    u.pop("password", None); u.pop("_id", None); return u

@api.delete("/users/{uid}")
async def delete_user(uid: str, user: dict = Depends(require_role("admin"))):
    if uid == user["id"]:
        raise HTTPException(400, "Cannot delete self")
    r = await db.users.delete_one({"id": uid})
    if not r.deleted_count: raise HTTPException(404, "Not found")
    await log_audit(user, "delete", "user", uid)
    return {"ok": True}

@api.patch("/users/{uid}")
async def update_user(uid: str, patch: dict, user: dict = Depends(require_role("admin"))):
    patch.pop("password", None); patch.pop("id", None); patch.pop("_id", None)
    await db.users.update_one({"id": uid}, {"$set": patch})
    await log_audit(user, "update", "user", uid)
    updated = await db.users.find_one({"id": uid}, {"_id":0, "password":0})
    return updated

# ---------- ROUTES: CASES ----------
@api.get("/cases")
async def list_cases(q: Optional[str] = None, district: Optional[str] = None,
                     status: Optional[str] = None, crime_head: Optional[str] = None,
                     limit: int = 100, user: dict = Depends(current_user)):
    query: Dict[str, Any] = {}
    if district: query["district"] = district
    if status: query["status"] = status
    if crime_head: query["crime_head"] = crime_head
    if q:
        query["$or"] = [
            {"fir_no": {"$regex": q, "$options": "i"}},
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"location": {"$regex": q, "$options": "i"}},
            {"accused.name": {"$regex": q, "$options": "i"}},
            {"victims.name": {"$regex": q, "$options": "i"}},
        ]
    cases = await db.cases.find(query, {"_id":0}).sort("date_registered", -1).to_list(limit)
    # Semantic-lite relevance ranking when q is present
    if q:
        ql = q.lower()
        def score(c):
            s = 0
            if ql in (c.get("fir_no","") or "").lower(): s += 100
            if ql in (c.get("title","") or "").lower(): s += 60
            if ql in (c.get("location","") or "").lower(): s += 40
            if ql in (c.get("district","") or "").lower(): s += 35
            if ql in (c.get("crime_head","") or "").lower(): s += 30
            if ql in (c.get("crime_sub_head","") or "").lower(): s += 30
            for a in c.get("accused",[]):
                if ql in (a.get("name","") or "").lower(): s += 45
            for v in c.get("victims",[]):
                if ql in (v.get("name","") or "").lower(): s += 25
            if ql in (c.get("description","") or "").lower(): s += 15
            if c.get("severity") == "Critical": s += 5
            return -s
        cases.sort(key=score)
    return cases

@api.get("/cases/{cid}")
async def get_case(cid: str, user: dict = Depends(current_user)):
    c = await db.cases.find_one({"id": cid}, {"_id":0})
    if not c: raise HTTPException(404, "Not found")
    return c

@api.post("/cases")
async def create_case(payload: dict, user: dict = Depends(require_role("admin","analyst"))):
    payload.pop("id", None)
    payload.setdefault("date_registered", datetime.now(timezone.utc).date().isoformat())
    c = Case(**payload).model_dump()
    await db.cases.insert_one(c)
    await log_audit(user, "create", "case", c["id"], c["fir_no"])
    c.pop("_id", None)
    await emit("case:created", {"id": c["id"], "fir_no": c["fir_no"], "title": c["title"], "district": c["district"], "severity": c["severity"], "by": user["email"]})
    return c

@api.patch("/cases/{cid}")
async def update_case(cid: str, patch: dict, user: dict = Depends(require_role("admin","analyst"))):
    patch.pop("id", None); patch.pop("_id", None)
    r = await db.cases.update_one({"id": cid}, {"$set": patch})
    if not r.matched_count: raise HTTPException(404, "Not found")
    await log_audit(user, "update", "case", cid)
    updated = await db.cases.find_one({"id": cid}, {"_id":0})
    await emit("case:updated", {"id": cid, "fir_no": updated.get("fir_no"), "by": user["email"]})
    return updated

@api.delete("/cases/{cid}")
async def delete_case(cid: str, user: dict = Depends(require_role("admin"))):
    r = await db.cases.delete_one({"id": cid})
    if not r.deleted_count: raise HTTPException(404, "Not found")
    await log_audit(user, "delete", "case", cid)
    await emit("case:deleted", {"id": cid, "by": user["email"]})
    return {"ok": True}

# ---------- ROUTES: ANALYTICS / DASHBOARD ----------
@api.get("/dashboard/kpis")
async def kpis(user: dict = Depends(current_user)):
    total = await db.cases.count_documents({})
    open_c = await db.cases.count_documents({"status": {"$in": ["Open","Under Investigation"]}})
    closed = await db.cases.count_documents({"status": "Closed"})
    critical = await db.cases.count_documents({"severity": "Critical"})
    chargesheeted = await db.cases.count_documents({"status": "Chargesheeted"})
    # Recent 30d vs previous 30d
    now = datetime.now(timezone.utc)
    d30 = (now - timedelta(days=30)).date().isoformat()
    d60 = (now - timedelta(days=60)).date().isoformat()
    recent = await db.cases.count_documents({"date_registered": {"$gte": d30}})
    prev = await db.cases.count_documents({"date_registered": {"$gte": d60, "$lt": d30}})
    trend = ((recent - prev) / prev * 100) if prev else 0
    return {"total": total, "open": open_c, "closed": closed, "critical": critical,
            "chargesheeted": chargesheeted, "recent_30d": recent, "trend_pct": round(trend,1)}

@api.get("/analytics/by-district")
async def by_district(user: dict = Depends(current_user)):
    cases = await db.cases.find({}, {"_id":0, "district":1, "severity":1, "status":1}).to_list(5000)
    out: Dict[str, Dict[str,int]] = defaultdict(lambda: {"total":0,"open":0,"critical":0})
    for c in cases:
        out[c["district"]]["total"] += 1
        if c.get("status") in ["Open","Under Investigation"]:
            out[c["district"]]["open"] += 1
        if c.get("severity") == "Critical":
            out[c["district"]]["critical"] += 1
    return [{"district": k, **v} for k,v in out.items()]

@api.get("/analytics/by-category")
async def by_category(user: dict = Depends(current_user)):
    cases = await db.cases.find({}, {"_id":0, "crime_head":1}).to_list(5000)
    c = Counter([x["crime_head"] for x in cases])
    return [{"category": k, "count": v} for k,v in c.most_common()]

@api.get("/analytics/timeline")
async def timeline(days: int = 90, user: dict = Depends(current_user)):
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=days)).date().isoformat()
    cases = await db.cases.find({"date_registered": {"$gte": since}}, {"_id":0,"date_registered":1,"crime_head":1}).to_list(5000)
    buckets: Dict[str,int] = defaultdict(int)
    for c in cases:
        # bucket by week
        d = datetime.fromisoformat(c["date_registered"])
        wk = (d - timedelta(days=d.weekday())).date().isoformat()
        buckets[wk] += 1
    return [{"week": k, "count": v} for k,v in sorted(buckets.items())]

@api.get("/map/hotspots")
async def hotspots(user: dict = Depends(current_user)):
    cases = await db.cases.find({}, {"_id":0, "lat":1,"lng":1,"district":1,"crime_head":1,"severity":1,"fir_no":1,"id":1,"title":1}).to_list(5000)
    return cases

@api.post("/data/reimport")
async def data_reimport(user: dict = Depends(require_role("admin"))):
    ok = await seed_from_dataset()
    await emit("data:reimported", {"success": ok, "by": user["email"]})
    await log_audit(user, "reimport", "dataset", details=DATASET_URL[-40:])
    if not ok: raise HTTPException(500, "Import failed")
    total = await db.cases.count_documents({})
    return {"ok": True, "total_cases": total}

@api.get("/analytics/by-status")
async def by_status(user: dict = Depends(current_user)):
    rows = await db.cases.aggregate([{"$group":{"_id":"$status","c":{"$sum":1}}},{"$sort":{"c":-1}}]).to_list(20)
    return [{"status": r["_id"], "count": r["c"]} for r in rows]

@api.get("/analytics/by-severity")
async def by_severity(user: dict = Depends(current_user)):
    rows = await db.cases.aggregate([{"$group":{"_id":"$severity","c":{"$sum":1}}}]).to_list(20)
    return [{"severity": r["_id"], "count": r["c"]} for r in rows]

@api.get("/analytics/top-stations")
async def top_stations(user: dict = Depends(current_user)):
    rows = await db.cases.aggregate([{"$group":{"_id":"$district","c":{"$sum":1}}},{"$sort":{"c":-1}},{"$limit":10}]).to_list(10)
    return [{"station": r["_id"], "count": r["c"]} for r in rows]

@api.get("/analytics/top-accused")
async def top_accused(user: dict = Depends(current_user)):
    rows = await db.cases.aggregate([
        {"$unwind":"$accused"},
        {"$group":{"_id":"$accused.name","c":{"$sum":1}}},
        {"$sort":{"c":-1}}, {"$limit":15}
    ]).to_list(15)
    return [{"name": r["_id"], "count": r["c"]} for r in rows if r["_id"]]

@api.get("/analytics/monthly-trend")
async def monthly_trend(months: int = 12, user: dict = Depends(current_user)):
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=months*31)).date().isoformat()
    cases = await db.cases.find({"date_registered": {"$gte": since}}, {"_id":0,"date_registered":1,"severity":1}).to_list(20000)
    buckets: Dict[str, Dict[str,int]] = defaultdict(lambda: {"total":0,"critical":0,"high":0})
    for c in cases:
        try:
            d = datetime.fromisoformat(c["date_registered"])
            mk = f"{d.year}-{d.month:02d}"
            buckets[mk]["total"] += 1
            if c.get("severity") == "Critical": buckets[mk]["critical"] += 1
            elif c.get("severity") == "High": buckets[mk]["high"] += 1
        except Exception:
            pass
    return [{"month": k, **v} for k,v in sorted(buckets.items())]

@api.get("/analytics/gender-breakdown")
async def gender_breakdown(user: dict = Depends(current_user)):
    rows = await db.cases.aggregate([
        {"$unwind":"$victims"},
        {"$group":{"_id":"$victims.gender","c":{"$sum":1}}}
    ]).to_list(10)
    victims = [{"gender": r["_id"] or "Unknown", "count": r["c"]} for r in rows]
    rows2 = await db.cases.aggregate([
        {"$unwind":"$accused"},
        {"$group":{"_id":"$accused.gender","c":{"$sum":1}}}
    ]).to_list(10)
    accused = [{"gender": r["_id"] or "Unknown", "count": r["c"]} for r in rows2]
    return {"victims": victims, "accused": accused}

@api.get("/network/graph")
async def network_graph(district: Optional[str] = None, crime_head: Optional[str] = None,
                        entity: Optional[str] = None, limit: int = 400,
                        user: dict = Depends(current_user)):
    query: Dict[str, Any] = {}
    if district: query["district"] = district
    if crime_head: query["crime_head"] = crime_head
    if entity:
        query["$or"] = [
            {"accused.name": {"$regex": entity, "$options": "i"}},
            {"victims.name": {"$regex": entity, "$options": "i"}},
            {"io_officer": {"$regex": entity, "$options": "i"}},
            {"fir_no": {"$regex": entity, "$options": "i"}},
        ]
    cases = await db.cases.find(query, {"_id":0, "id":1,"fir_no":1,"title":1,"accused":1,"victims":1,
                                        "district":1,"severity":1,"crime_head":1,"io_officer":1}).limit(limit).to_list(limit)
    nodes: Dict[str, dict] = {}
    links: List[dict] = []
    for c in cases:
        cn = f"case:{c['id']}"
        nodes[cn] = {"id": cn, "name": c["fir_no"], "type":"case", "district": c["district"],
                     "severity": c.get("severity","Medium"), "label": c["title"], "crime_head": c.get("crime_head","")}
        for a in c.get("accused", []):
            an = f"person:{a.get('name','')}"
            if not a.get("name"): continue
            nodes[an] = {"id": an, "name": a["name"], "type":"accused", "label": a["name"]}
            links.append({"source": cn, "target": an, "kind": "accused"})
        for v in c.get("victims", []):
            vn = f"victim:{v.get('name','')}"
            if not v.get("name"): continue
            nodes[vn] = {"id": vn, "name": v["name"], "type":"victim", "label": v["name"]}
            links.append({"source": cn, "target": vn, "kind": "victim"})
    return {"nodes": list(nodes.values()), "links": links}

@api.get("/network/facets")
async def network_facets(user: dict = Depends(current_user)):
    districts = await db.cases.distinct("district")
    crime_heads = await db.cases.distinct("crime_head")
    return {"districts": sorted([d for d in districts if d]),
            "crime_heads": sorted([c for c in crime_heads if c])}

@api.get("/network/_deprecated_graph")

@api.get("/predictions/hotspots")
async def predictions(user: dict = Depends(current_user)):
    # Simple heuristic: districts with rising recent counts + high severity share
    now = datetime.now(timezone.utc)
    d30 = (now - timedelta(days=30)).date().isoformat()
    d90 = (now - timedelta(days=90)).date().isoformat()
    recent = await db.cases.find({"date_registered": {"$gte": d30}}, {"_id":0}).to_list(5000)
    baseline = await db.cases.find({"date_registered": {"$gte": d90, "$lt": d30}}, {"_id":0}).to_list(5000)
    def by_d(rows):
        c = Counter(); crit = Counter()
        for r in rows:
            c[r["district"]] += 1
            if r.get("severity") == "Critical": crit[r["district"]] += 1
        return c, crit
    rc, rcrit = by_d(recent); bc, _ = by_d(baseline)
    preds = []
    for d in DISTRICTS:
        r = rc.get(d["name"],0); b = max(bc.get(d["name"],1)/2, 1)  # avg per 30d
        growth = (r - b) / b
        confidence = min(0.95, 0.55 + max(0,growth)*0.4 + rcrit.get(d["name"],0)*0.05)
        risk = "High" if growth > 0.3 else "Medium" if growth > 0 else "Low"
        preds.append({"district": d["name"], "lat": d["lat"], "lng": d["lng"],
                      "recent_30d": r, "baseline_30d": round(b,1),
                      "growth_pct": round(growth*100,1), "risk": risk,
                      "confidence": round(confidence*100,1),
                      "reason": f"{'Increased' if growth>0 else 'Stable'} case volume ({r} recent vs {round(b,1)} avg), {rcrit.get(d['name'],0)} critical cases."})
    return sorted(preds, key=lambda x: -x["confidence"])

@api.get("/cases/{cid}/similar")
async def similar_cases(cid: str, user: dict = Depends(current_user)):
    target = await db.cases.find_one({"id": cid}, {"_id":0})
    if not target: raise HTTPException(404, "Not found")
    others = await db.cases.find({"id": {"$ne": cid}}, {"_id":0}).to_list(2000)
    scored = []
    for c in others:
        score = 0
        if c["crime_head"] == target["crime_head"]: score += 40
        if c["crime_sub_head"] == target["crime_sub_head"]: score += 25
        if c["district"] == target["district"]: score += 15
        # geo distance
        dx = abs(c["lat"] - target["lat"]); dy = abs(c["lng"] - target["lng"])
        if dx + dy < 0.1: score += 10
        # accused overlap
        ta = {a["name"] for a in target.get("accused",[])}
        ca = {a["name"] for a in c.get("accused",[])}
        if ta & ca: score += 20 * len(ta & ca)
        if score > 40:
            scored.append({**c, "match_score": score})
    scored.sort(key=lambda x: -x["match_score"])
    return scored[:10]

# ---------- KAVACHA AI ----------
async def build_kavacha_context(case_id: Optional[str] = None) -> str:
    """Build a compact context for the AI (case corpus summary + optional focused case)."""
    total = await db.cases.count_documents({})
    by_cat = await by_category({"role":"admin"}) if False else None  # placeholder
    cats = await db.cases.aggregate([{"$group":{"_id":"$crime_head","c":{"$sum":1}}}]).to_list(50)
    districts = await db.cases.aggregate([{"$group":{"_id":"$district","c":{"$sum":1}}}]).to_list(50)
    ctx = f"Namma Kavacha corpus: {total} cases across Karnataka.\n"
    ctx += "Cases by category: " + ", ".join([f"{c['_id']}={c['c']}" for c in cats]) + "\n"
    ctx += "Cases by district: " + ", ".join([f"{d['_id']}={d['c']}" for d in districts]) + "\n"
    if case_id:
        c = await db.cases.find_one({"id": case_id}, {"_id":0})
        if c:
            ctx += f"\n[FOCUSED CASE] FIR {c['fir_no']} — {c['title']} — {c['district']} — Status: {c['status']} — Severity: {c['severity']}\n"
            ctx += f"Description: {c['description']}\n"
            ctx += f"Accused: {[a['name'] for a in c.get('accused',[])]}\n"
            ctx += f"Victims: {[v['name'] for v in c.get('victims',[])]}\n"
    # recent 5 cases as sample
    recent = await db.cases.find({}, {"_id":0}).sort("date_registered",-1).limit(5).to_list(5)
    ctx += "\nRecent cases:\n"
    for c in recent:
        ctx += f"- {c['fir_no']} | {c['title']} | {c['district']} | {c['status']} | {c['date_registered']}\n"
    return ctx

@api.post("/kavacha/chat")
async def kavacha_chat(payload: ChatMessage, user: dict = Depends(current_user)):
    import re
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    session_id = payload.session_id or str(uuid.uuid4())
    context = await build_kavacha_context(payload.context_case_id)
    is_kannada = bool(re.search(r'[\u0C80-\u0CFF]', payload.message))
    language_rule = ("The user wrote in Kannada. Respond ENTIRELY in Kannada (ಕನ್ನಡ). "
                     "Use simple, everyday Kannada that a beat officer can read easily. "
                     "Cite FIR numbers using English format like [FIR/2026/40/02432]."
                     if is_kannada else
                     "Respond in clear plain English.")
    system = (
        "You are Kavacha AI, an intelligence copilot for Karnataka State Police officers. "
        f"{language_rule}\n\n"
        "STYLE RULES (strict):\n"
        "- Write in short, human-readable paragraphs. No jargon.\n"
        "- DO NOT use markdown asterisks like ** or __ for bold. DO NOT use markdown headers (#).\n"
        "- Use plain sentences and, at most, simple hyphen bullet points (-).\n"
        "- Cite specific FIR numbers in square brackets exactly like [FIR/2026/40/02432].\n"
        "- End with a short 'Next steps:' (or 'ಮುಂದಿನ ಹೆಜ್ಜೆಗಳು:' in Kannada) recommendation.\n"
        "- Be concise and data-driven. No fluff.\n\n"
        f"CURRENT CONTEXT:\n{context}"
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system).with_model("anthropic","claude-sonnet-4-5-20250929")
    async def gen():
        try:
            async for ev in chat.stream_message(UserMessage(text=payload.message)):
                if isinstance(ev, TextDelta):
                    # strip any leaked markdown bold markers as safety net
                    delta = ev.content.replace("**", "").replace("__", "")
                    yield f"data: {json.dumps({'delta': delta})}\n\n"
                elif isinstance(ev, StreamDone):
                    yield f"data: {json.dumps({'done': True, 'session_id': session_id, 'lang': 'kn' if is_kannada else 'en'})}\n\n"
                    break
        except Exception as e:
            logger.exception("Kavacha stream failed")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    await log_audit(user, "chat", "kavacha_ai", session_id, payload.message[:100])
    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})

@api.post("/kavacha/report/{cid}")
async def generate_report(cid: str, user: dict = Depends(current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    c = await db.cases.find_one({"id": cid}, {"_id":0})
    if not c: raise HTTPException(404, "Case not found")
    similar = await similar_cases(cid, user)
    system = "You are Kavacha AI, generating a formal investigation summary report for Karnataka State Police."
    prompt = (
        f"Generate a formal investigation summary for FIR {c['fir_no']} — {c['title']}. "
        f"Include sections: 1) Executive Summary, 2) Case Details, 3) Persons Involved, "
        f"4) Investigation Status, 5) Similar/Related Cases, 6) Recommended Next Steps. "
        f"Use markdown. Case data:\n{json.dumps(c, default=str)[:3000]}\n\n"
        f"Similar cases identified: {[s['fir_no'] for s in similar[:5]]}"
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"report-{cid}", system_message=system).with_model("anthropic","claude-sonnet-4-5-20250929")
    try:
        resp = await chat.send_message(UserMessage(text=prompt))
        await log_audit(user, "generate_report", "case", cid)
        return {"case_id": cid, "fir_no": c["fir_no"], "report": resp, "generated_at": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        raise HTTPException(500, f"AI report generation failed: {e}")

# ---------- UPLOADS ----------
@api.post("/upload/excel")
async def upload_excel(file: UploadFile = File(...), user: dict = Depends(require_role("admin"))):
    import openpyxl
    data = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(data))
    imported = 0; errors: List[str] = []
    if "CaseMaster" in wb.sheetnames or "FIR_Data" in wb.sheetnames:
        sheet_name = "CaseMaster" if "CaseMaster" in wb.sheetnames else "FIR_Data"
        ws = wb[sheet_name]
        headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
        for row in ws.iter_rows(min_row=2, values_only=True):
            try:
                rec = dict(zip(headers, row))
                fir_val = rec.get("fir_no") or rec.get("FIRNo")
                if not fir_val: continue
                fir_val = str(fir_val)
                station = str(rec.get("unit") or rec.get("PoliceStationName") or "Karnataka")
                # Same district assignment as bulk import — even Karnataka spread
                district_name, lat_a, lng_a = assign_karnataka_district(f"{fir_val}-{station}")
                # If user provided explicit lat/lng, respect them
                try:
                    lat = float(rec.get("lat") or rec.get("Latitude") or lat_a)
                    lng = float(rec.get("lng") or rec.get("Longitude") or lng_a)
                except Exception:
                    lat, lng = lat_a, lng_a
                c = Case(fir_no=fir_val,
                         title=str(rec.get("title") or f"{rec.get('CrimeMinorHeadName','') or 'Case'} at {district_name}"),
                         crime_head=str(rec.get("crime_head") or rec.get("CrimeMajorHeadName") or "Property Crime"),
                         crime_sub_head=str(rec.get("crime_sub_head") or rec.get("CrimeMinorHeadName") or ""),
                         district=district_name,
                         unit=f"{station} PS",
                         status=str(rec.get("status") or rec.get("CaseStatusName") or "Open"),
                         severity=str(rec.get("severity") or rec.get("GravityName") or "Medium"),
                         date_registered=str(rec.get("date_registered") or rec.get("CrimeRegisteredDate") or datetime.now(timezone.utc).date().isoformat())[:10],
                         location=str(rec.get("location") or f"{station}, {district_name}"),
                         lat=lat, lng=lng,
                         description=str(rec.get("description") or rec.get("BriefFacts") or ""))
                await db.cases.update_one({"fir_no": c.fir_no}, {"$set": c.model_dump()}, upsert=True)
                await emit("case:created", {"id": c.id, "fir_no": c.fir_no, "title": c.title, "district": c.district, "severity": c.severity, "by": user["email"]})
                imported += 1
            except Exception as e:
                errors.append(str(e))
    await log_audit(user, "upload", "excel", details=f"{imported} records")
    return {"imported": imported, "errors": errors[:5]}

@api.get("/data/template")
async def data_template(user: dict = Depends(current_user)):
    """Return a starter Excel template with the CaseMaster sheet and example rows."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from fastapi.responses import Response
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "CaseMaster"
    headers = ["fir_no","title","crime_head","crime_sub_head","district","unit","status",
               "severity","date_registered","location","lat","lng","description"]
    ws.append(headers)
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="0B132B", end_color="0B132B", fill_type="solid")
    for i, cell in enumerate(ws[1], start=1):
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="left")
        ws.column_dimensions[cell.column_letter].width = max(14, len(headers[i-1]) + 4)
    # Example rows
    examples = [
        ["FIR/2026/BEN/9001","Cyber fraud at Whitefield","Cyber Crime","Online Fraud","Bengaluru Urban",
         "Whitefield PS","Under Investigation","High","2026-01-15","Whitefield, Bengaluru",
         12.9698, 77.7500, "Victim received a fraudulent job-offer link and lost Rs. 2.4L."],
        ["FIR/2026/MYS/9002","Robbery at Devaraja Market","Property Crime","Robbery","Mysuru",
         "Devaraja Market PS","Open","Critical","2026-02-03","Devaraja Market, Mysuru",
         12.3067, 76.6547, "Gold jewellery snatched from a passer-by; two accused fled on motorcycle."],
    ]
    for row in examples:
        ws.append(row)
    # Small instruction sheet
    ws2 = wb.create_sheet("Instructions")
    lines = [
        "Namma Kavacha — Case Import Template",
        "",
        "1) Fill one row per FIR in the 'CaseMaster' sheet.",
        "2) fir_no MUST be unique (existing FIRs will be updated).",
        "3) severity ∈ {Low, Medium, High, Critical}.",
        "4) status ∈ {Open, Under Investigation, Chargesheeted, Closed}.",
        "5) date_registered should be YYYY-MM-DD.",
        "6) lat/lng are optional — if blank, the case is auto-placed in a Karnataka district.",
        "7) Upload via Data Ingestion → Excel sync. All changes go live immediately.",
    ]
    for i, line in enumerate(lines, 1):
        ws2.cell(row=i, column=1, value=line)
    ws2.column_dimensions["A"].width = 90
    buf = io.BytesIO()
    wb.save(buf); buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="namma-kavacha-template.xlsx"'},
    )

@api.post("/upload/pdf-extract")
async def upload_pdf(file: UploadFile = File(...), user: dict = Depends(require_role("admin","analyst"))):
    import pypdf
    data = await file.read()
    reader = pypdf.PdfReader(io.BytesIO(data))
    text = "\n".join([p.extract_text() or "" for p in reader.pages])[:4000]
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    system = "Extract structured FIR data from Indian police documents. Return strict JSON."
    prompt = (
        "Extract these fields as JSON: fir_no, title, crime_head, crime_sub_head, district, "
        "unit, status, severity, date_registered (YYYY-MM-DD), location, description, "
        "complainant (name/phone), victims (array of name/age/gender), accused (array of name/age/gender). "
        "If a field is unknown, use empty string or empty array. Return ONLY JSON, no prose.\n\n"
        f"PDF TEXT:\n{text}"
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"pdf-{uuid.uuid4()}", system_message=system).with_model("anthropic","claude-sonnet-4-5-20250929")
    try:
        resp = await chat.send_message(UserMessage(text=prompt))
        # crude JSON extraction
        s = resp.find("{"); e = resp.rfind("}")
        extracted = json.loads(resp[s:e+1]) if s >=0 else {}
        return {"extracted": extracted, "raw_preview": text[:500]}
    except Exception as e:
        raise HTTPException(500, f"Extraction failed: {e}")

# ---------- AUDIT ----------
@api.get("/audit")
async def get_audit(limit: int = 200, user: dict = Depends(require_role("admin","supervisor"))):
    logs = await db.audit_logs.find({}, {"_id":0}).sort("timestamp",-1).to_list(limit)
    return logs

# ---------- NOTIFICATIONS ----------
@api.get("/notifications")
async def notifications(user: dict = Depends(current_user)):
    # Derived alerts
    critical = await db.cases.count_documents({"severity":"Critical","status":{"$in":["Open","Under Investigation"]}})
    preds = await predictions(user)
    high_risk = [p for p in preds if p["risk"]=="High"][:3]
    notifs = []
    if critical:
        notifs.append({"id":"n1","severity":"crimson","title":f"{critical} critical cases open","body":"Immediate attention required.","timestamp": datetime.now(timezone.utc).isoformat()})
    for p in high_risk:
        notifs.append({"id":f"n-{p['district']}","severity":"amber",
                       "title":f"Hotspot alert: {p['district']}",
                       "body":f"Predicted {p['growth_pct']}% surge — confidence {p['confidence']}%.",
                       "timestamp": datetime.now(timezone.utc).isoformat()})
    notifs.append({"id":"n-info","severity":"emerald","title":"Kavacha AI is online","body":"Copilot ready to assist.","timestamp": datetime.now(timezone.utc).isoformat()})
    return notifs

# ---------- Health ----------
@api.get("/")
async def root():
    return {"service":"Namma Kavacha","status":"operational","time": datetime.now(timezone.utc).isoformat()}

# ---------- WebSocket live channel ----------
@app.websocket("/api/ws/live")
async def ws_live(websocket: WebSocket, token: str = Query(...)):
    """Live event channel — clients pass ?token=<jwt> for auth."""
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        await websocket.close(code=4401); return
    await ws_manager.connect(websocket)
    try:
        await websocket.send_json({"type":"welcome","payload":{"active": len(ws_manager.active)},"ts": datetime.now(timezone.utc).isoformat()})
        while True:
            # Keep-alive; ignore client messages
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_json({"type":"pong","payload":{},"ts": datetime.now(timezone.utc).isoformat()})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# ---------- Alerts (SMS / Email dispatch) — MOCKED transport ----------
class AlertDispatch(BaseModel):
    channels: List[str]  # ["sms","email"]
    recipients: List[str]  # phone or email
    subject: str = ""
    body: str

@api.post("/alerts/send")
async def send_alert(payload: AlertDispatch, user: dict = Depends(require_role("admin","analyst"))):
    """MOCKED: records the dispatch in DB + audit + broadcasts a notification.
    Wire Twilio / SendGrid / Emergent transports here to go live."""
    rec = {
        "id": str(uuid.uuid4()),
        "channels": payload.channels,
        "recipients": payload.recipients,
        "subject": payload.subject,
        "body": payload.body,
        "sent_by": user["email"],
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "transport": "MOCK",
        "delivered": True,
    }
    await db.alert_dispatches.insert_one(rec.copy())
    rec.pop("_id", None)
    await log_audit(user, "send_alert", "alerts", rec["id"], f"{payload.channels} → {len(payload.recipients)} recipients")
    await emit("alert:dispatched", {"channels": payload.channels, "recipients_count": len(payload.recipients), "subject": payload.subject})
    return rec

@api.get("/alerts")
async def list_alerts(limit: int = 50, user: dict = Depends(require_role("admin","supervisor","analyst"))):
    rows = await db.alert_dispatches.find({}, {"_id":0}).sort("sent_at",-1).to_list(limit)
    return rows

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get('CORS_ORIGINS','*').split(','),
                   allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup():
    await seed_users()
    await seed_cases()
    logger.info("Namma Kavacha ready.")

@app.on_event("shutdown")
async def shutdown():
    client.close()
