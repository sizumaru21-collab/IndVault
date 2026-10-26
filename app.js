import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const state = { user: null, key: null, salt: null, notes: [], selectedId: null, db: null, auth: null, dbReady: false };
const DB_NAME = "indvault";
const STORE = "encryptedNotes";
const ITERATIONS = 600000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function message(id, text, bad=false) {
  const el = $(id); el.textContent = text; el.style.color = bad ? "#fda4af" : "";
}
function status(text) { $("status").textContent = text; }
function bytesToB64(bytes) {
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64ToBytes(s) {
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
  return out;
}
function randomBytes(n) { return crypto.getRandomValues(new Uint8Array(n)); }

function openLocalDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, {keyPath:"id"});
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function localAll() {
  const db = await openLocalDb();
  return new Promise((resolve,reject) => {
    const tx=db.transaction(STORE,"readonly"), req=tx.objectStore(STORE).getAll();
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
async function localPut(record) {
  const db = await openLocalDb();
  return new Promise((resolve,reject) => {
    const tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error);
  });
}
async function localDelete(id) {
  const db = await openLocalDb();
  return new Promise((resolve,reject) => {
    const tx=db.transaction(STORE,"readwrite"); tx.objectStore(STORE).delete(id);
    tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error);
  });
}

async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {name:"PBKDF2", salt, iterations:ITERATIONS, hash:"SHA-256"},
    material, {name:"AES-GCM", length:256}, false, ["encrypt","decrypt"]
  );
}
async function encryptNote(note) {
  const iv = randomBytes(12);
  const payload = encoder.encode(JSON.stringify(note));
  const encrypted = await crypto.subtle.encrypt({name:"AES-GCM",iv}, state.key, payload);
  return { id:note.id, iv:bytesToB64(iv), ciphertext:bytesToB64(new Uint8Array(encrypted)), updatedAt:note.updatedAt, schemaVersion:1 };
}
async function decryptRecord(record) {
  const clear = await crypto.subtle.decrypt(
    {name:"AES-GCM",iv:b64ToBytes(record.iv)},
    state.key, b64ToBytes(record.ciphertext)
  );
  const note = JSON.parse(decoder.decode(clear));
  if (!note || typeof note.id !== "string" || typeof note.title !== "string" || typeof note.body !== "string") {
    throw new Error("Decrypted note has an invalid format.");
  }
  return note;
}
function newId() { return crypto.randomUUID(); }
function assertConfig() {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("REPLACE_") ||
      !firebaseConfig.projectId || firebaseConfig.projectId.startsWith("REPLACE_") ||
      !firebaseConfig.appId || firebaseConfig.appId.startsWith("REPLACE_")) {
    throw new Error("Firebase is not configured yet. Edit firebase-config.js first.");
  }
}
function renderNotes() {
  const list = $("notesList"); list.replaceChildren();
  const sorted = [...state.notes].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  if (!sorted.length) { const p=document.createElement("p"); p.className="muted small"; p.textContent="No notes yet."; list.append(p); return; }
  for (const note of sorted) {
    const button=document.createElement("button"); button.className="note-row"+(note.id===state.selectedId?" selected":"");
    const title=document.createElement("span"); title.textContent=note.title || "Untitled note";
    const date=document.createElement("small"); date.textContent=new Date(note.updatedAt||Date.now()).toLocaleDateString();
    button.append(title,date);
    button.addEventListener("click",()=>selectNote(note.id));
    list.append(button);
  }
}
function selectNote(id) {
  const note=state.notes.find(n=>n.id===id); if(!note)return;
  state.selectedId=id; $("noteTitle").value=note.title; $("noteBody").value=note.body; renderNotes();
}
function clearEditor() { state.selectedId=null; $("noteTitle").value=""; $("noteBody").value=""; renderNotes(); }
async function loadVaultSalt() {
  if (!state.user) {
    const key = "indvault-local-salt";
    let saved = sessionStorage.getItem(key);
    if (!saved) { saved=bytesToB64(randomBytes(16)); sessionStorage.setItem(key,saved); }
    return b64ToBytes(saved);
  }
  const ref=doc(state.db,"users",state.user.uid,"vault","metadata");
  const snap=await getDoc(ref);
  if (snap.exists()) {
    const data=snap.data();
    if (data.schemaVersion!==1 || typeof data.salt!=="string") throw new Error("Unsupported vault metadata.");
    return b64ToBytes(data.salt);
  }
  const salt=randomBytes(16);
  await setDoc(ref,{salt:bytesToB64(salt),schemaVersion:1,createdAt:Date.now()});
  return salt;
}
async function unlockVault() {
  const password=$("vaultPassword").value;
  if (password.length<14) throw new Error("Use a unique vault passphrase of at least 14 characters.");
  state.salt=await loadVaultSalt();
  state.key=await deriveKey(password,state.salt);
  // A wrong password is detected by failed AES-GCM authentication when decrypting existing records.
  const local=await localAll();
  let cloud=[];
  if(state.user) cloud=await readCloudRecords();
  const records=new Map();
  for(const r of local) records.set(r.id,r);
  for(const r of cloud) {
    const old=records.get(r.id);
    if(!old || (r.updatedAt||0)>(old.updatedAt||0)) records.set(r.id,r);
  }
  const clear=[];
  for(const r of records.values()) {
    try { clear.push(await decryptRecord(r)); }
    catch { throw new Error("Could not decrypt existing records. Check the vault passphrase. No records were changed."); }
  }
  state.notes=clear; state.key=state.key; $("vaultPanel").classList.remove("hidden");
  $("vaultPassword").value="";
  renderNotes();
  message("vaultMessage",`Vault unlocked. ${state.notes.length} note(s) loaded.`);
  status(state.user ? "Signed in · vault unlocked" : "Local vault · unlocked");
}
async function readCloudRecords() {
  const snap=await getDocs(collection(state.db,"users",state.user.uid,"notes"));
  return snap.docs.map(d=>d.data());
}
async function persistNote(note) {
  const record=await encryptNote(note);
  await localPut(record);
  if(state.user) await setDoc(doc(state.db,"users",state.user.uid,"notes",note.id),record);
}
async function syncNow() {
  if(!state.key) throw new Error("Unlock the vault first.");
  if(!state.user) throw new Error("Sign in to Firebase to sync across devices. Local encrypted storage still works.");
  const cloud=await readCloudRecords();
  const merged=new Map();
  for(const n of state.notes) merged.set(n.id,n);
  for(const r of cloud) {
    const localRecord=(await localAll()).find(x=>x.id===r.id);
    const bestLocal=merged.get(r.id);
    if(!bestLocal || (r.updatedAt||0)>(bestLocal.updatedAt||0)) {
      merged.set(r.id,await decryptRecord(r));
      await localPut(r);
    } else if(!localRecord || (bestLocal.updatedAt||0)>(r.updatedAt||0)) {
      await persistNote(bestLocal);
    }
  }
  state.notes=[...merged.values()];
  // Upload local-only notes.
  const ids=new Set(cloud.map(r=>r.id));
  for(const n of state.notes) if(!ids.has(n.id)) await persistNote(n);
  renderNotes(); message("vaultStatus","Sync finished. Review notes on both devices after edits.");
}
async function saveSelected() {
  if(!state.key) throw new Error("Unlock the vault first.");
  const title=$("noteTitle").value.trim().slice(0,160);
  const body=$("noteBody").value;
  const id=state.selectedId||newId();
  const note={id,title,body,updatedAt:Date.now()};
  await persistNote(note);
  state.notes=state.notes.filter(n=>n.id!==id); state.notes.unshift(note); state.selectedId=id;
  renderNotes(); message("vaultStatus","Encrypted note saved locally"+(state.user?" and synced":" (local only)")+".");
}
async function deleteSelected() {
  if(!state.key||!state.selectedId) throw new Error("Select a note first.");
  const id=state.selectedId;
  await localDelete(id);
  if(state.user) await deleteDoc(doc(state.db,"users",state.user.uid,"notes",id));
  state.notes=state.notes.filter(n=>n.id!==id); clearEditor();
  message("vaultStatus","Selected note deleted.");
}
function exportBackup() {
  const password=$("vaultPassword").value;
  // Do not require the vault password again; backup consists only of already encrypted records.
  localAll().then(records=>{
    const blob=new Blob([JSON.stringify({app:"IndVault",schemaVersion:1,exportedAt:new Date().toISOString(),records},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="indvault-encrypted-backup.json";a.click();URL.revokeObjectURL(url);
    message("vaultStatus","Encrypted backup exported. Store it safely.");
  }).catch(e=>message("vaultStatus",e.message,true));
}
async function importBackup(file) {
  if(!state.key) throw new Error("Unlock the vault first.");
  const data=JSON.parse(await file.text());
  if(data.app!=="IndVault"||data.schemaVersion!==1||!Array.isArray(data.records)) throw new Error("This is not a supported IndVault encrypted backup.");
  const decoded=[];
  for(const r of data.records) decoded.push(await decryptRecord(r));
  for(let i=0;i<data.records.length;i++) await localPut(data.records[i]);
  for(const n of decoded) { state.notes=state.notes.filter(x=>x.id!==n.id); state.notes.push(n); }
  renderNotes(); message("vaultStatus",`Imported ${decoded.length} encrypted record(s) locally. Sync to upload them.`);
}
function lockVault() {
  state.key=null; state.salt=null; state.notes=[]; state.selectedId=null;
  $("vaultPanel").classList.add("hidden"); $("noteTitle").value=""; $("noteBody").value="";
  $("vaultPassword").value=""; renderNotes(); status(state.user?"Signed in · vault locked":"Local mode · vault locked");
  message("vaultMessage","Vault locked.");
}
async function setupFirebase() {
  assertConfig();
  const app=initializeApp(firebaseConfig);
  state.auth=getAuth(app); state.db=getFirestore(app); state.dbReady=true;
  onAuthStateChanged(state.auth,user=>{
    state.user=user;
    $("signOut").classList.toggle("hidden",!user);
    status(user?"Signed in · vault locked":"Local mode · not connected");
    if(user) message("accountMessage",`Signed in as ${user.email||"account"}.`);
  });
}
$("signUp").addEventListener("click",async()=>{
  try{assertConfig(); if(!state.auth) await setupFirebase(); await createUserWithEmailAndPassword(state.auth,$("email").value,$("accountPassword").value); message("accountMessage","Account created and signed in.");}
  catch(e){message("accountMessage",e.message,true);}
});
$("signIn").addEventListener("click",async()=>{
  try{assertConfig(); if(!state.auth) await setupFirebase(); await signInWithEmailAndPassword(state.auth,$("email").value,$("accountPassword").value); message("accountMessage","Signed in.");}
  catch(e){message("accountMessage",e.message,true);}
});
$("signOut").addEventListener("click",async()=>{try{await signOut(state.auth);lockVault();message("accountMessage","Signed out.");}catch(e){message("accountMessage",e.message,true);}});
$("unlock").addEventListener("click",async()=>{try{if(!state.dbReady && !firebaseConfig.apiKey.startsWith("REPLACE_")) await setupFirebase(); await unlockVault();}catch(e){message("vaultMessage",e.message,true);}});
$("lock").addEventListener("click",lockVault);
$("newNote").addEventListener("click",clearEditor);
$("saveNote").addEventListener("click",async()=>{try{await saveSelected();}catch(e){message("vaultStatus",e.message,true);}});
$("deleteNote").addEventListener("click",async()=>{try{await deleteSelected();}catch(e){message("vaultStatus",e.message,true);}});
$("sync").addEventListener("click",async()=>{try{await syncNow();}catch(e){message("vaultStatus",e.message,true);}});
$("exportBackup").addEventListener("click",exportBackup);
$("importBackup").addEventListener("change",async e=>{try{if(e.target.files[0])await importBackup(e.target.files[0]);}catch(err){message("vaultStatus",err.message,true);}finally{e.target.value="";}});
window.addEventListener("pagehide",()=>{state.key=null;});
if(!("crypto" in window)||!crypto.subtle||!window.isSecureContext){
  message("vaultMessage","Web Crypto requires a secure context (HTTPS or localhost). Do not use an insecure HTTP deployment.",true);
}
