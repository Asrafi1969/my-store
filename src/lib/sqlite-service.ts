import type { HishabState, Party, Product, Txn } from "./hishab-store";
import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";

let SQLModule: any = null;
let sqlInitPromise: Promise<any> | null = null;

async function getSQL(timeoutMs = 6000) {
  if (SQLModule) return SQLModule;
  if (!sqlInitPromise) {
    sqlInitPromise = (async () => {
      // 1. Try Vite-bundled / resolved wasm asset URL
      try {
        const mod = await initSqlJs({
          locateFile: () => sqlWasmUrl,
        });
        SQLModule = mod;
        return mod;
      } catch (assetErr) {
        console.warn("Vite asset WASM load failed, trying /sql-wasm.wasm:", assetErr);
      }

      // 2. Try root public /sql-wasm.wasm
      try {
        const mod = await initSqlJs({
          locateFile: () => "/sql-wasm.wasm",
        });
        SQLModule = mod;
        return mod;
      } catch (localErr) {
        console.warn("Local WASM load failed, trying cdnjs:", localErr);
      }

      // 3. Try official CDN
      try {
        const mod = await initSqlJs({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
        });
        SQLModule = mod;
        return mod;
      } catch (finalErr) {
        console.error("All SQL.js initialization attempts failed:", finalErr);
        throw finalErr;
      }
    })();
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("SQL.js initialization timed out")), timeoutMs)
  );

  return Promise.race([sqlInitPromise, timeoutPromise]);
}

// Preload in background
if (typeof window !== "undefined") {
  getSQL().catch((e) => console.log("Background SQL.js preload status:", e.message));
}

/**
 * Converts HishabState into SQLite 3 binary database Uint8Array buffer (.db file)
 */
export async function stateToSqliteDbBuffer(state: HishabState): Promise<Uint8Array> {
  try {
    const SQL = await getSQL();
    const db: any = new SQL.Database();

    // Create SQLite tables
    db.run(`
      CREATE TABLE IF NOT EXISTS shop_info (
        id INTEGER PRIMARY KEY,
        shopName TEXT
      );
      CREATE TABLE IF NOT EXISTS parties (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        type TEXT,
        due REAL
      );
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        unit TEXT,
        stock REAL,
        buyPrice REAL,
        sellPrice REAL
      );
      CREATE TABLE IF NOT EXISTS txns (
        id TEXT PRIMARY KEY,
        kind TEXT,
        date TEXT,
        partyId TEXT,
        productId TEXT,
        qty REAL,
        amount REAL,
        paid REAL,
        discount REAL,
        method TEXT,
        note TEXT,
        refId TEXT
      );
      CREATE TABLE IF NOT EXISTS hishab_state_backup (
        id INTEGER PRIMARY KEY,
        json_data TEXT
      );
    `);

    // Insert shop info
    const stmtShop = db.prepare("INSERT INTO shop_info (id, shopName) VALUES (1, ?)");
    stmtShop.run([state.shopName || "আমার দোকান"]);
    stmtShop.free();

    // Insert full state backup snapshot
    const stmtBackup = db.prepare("INSERT INTO hishab_state_backup (id, json_data) VALUES (1, ?)");
    stmtBackup.run([JSON.stringify(state)]);
    stmtBackup.free();

    // Insert parties
    if (state.parties && state.parties.length > 0) {
      const stmtParty = db.prepare(
        "INSERT INTO parties (id, name, phone, type, due) VALUES (?, ?, ?, ?, ?)"
      );
      for (const p of state.parties) {
        stmtParty.run([p.id, p.name, p.phone || "", p.type, p.due || 0]);
      }
      stmtParty.free();
    }

    // Insert products
    if (state.products && state.products.length > 0) {
      const stmtProd = db.prepare(
        "INSERT INTO products (id, name, unit, stock, buyPrice, sellPrice) VALUES (?, ?, ?, ?, ?, ?)"
      );
      for (const p of state.products) {
        stmtProd.run([p.id, p.name, p.unit || "পিস", p.stock || 0, p.buyPrice || 0, p.sellPrice || 0]);
      }
      stmtProd.free();
    }

    // Insert transactions
    if (state.txns && state.txns.length > 0) {
      const stmtTxn = db.prepare(
        "INSERT INTO txns (id, kind, date, partyId, productId, qty, amount, paid, discount, method, note, refId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      for (const t of state.txns) {
        stmtTxn.run([
          t.id,
          t.kind,
          t.date,
          t.partyId || null,
          t.productId || null,
          t.qty ?? null,
          t.amount || 0,
          t.paid || 0,
          t.discount ?? null,
          t.method || null,
          t.note || null,
          t.refId || null,
        ]);
      }
      stmtTxn.free();
    }

    const binaryArray = db.export();
    db.close();
    return binaryArray;
  } catch (err) {
    console.warn("SQL export failed, generating JSON fallback buffer:", err);
    const jsonStr = JSON.stringify(state, null, 2);
    return new TextEncoder().encode(jsonStr);
  }
}

/**
 * Parses SQLite binary database buffer OR fallback JSON into HishabState
 */
export async function sqliteDbBufferToState(buffer: ArrayBuffer | Uint8Array): Promise<HishabState | null> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // 1. Check if it's JSON text
  try {
    const text = new TextDecoder().decode(bytes);
    if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        return {
          shopName: typeof parsed.shopName === "string" ? parsed.shopName : "আমার দোকান",
          parties: Array.isArray(parsed.parties) ? parsed.parties : [],
          products: Array.isArray(parsed.products) ? parsed.products : [],
          txns: Array.isArray(parsed.txns) ? parsed.txns : [],
        };
      }
    }
  } catch (e) {
    // Not JSON, continue to SQLite parser
  }

  // 2. Parse as SQLite Database
  try {
    const SQL = await getSQL();
    const db: any = new SQL.Database(bytes);

    // Try reading from hishab_state_backup if present
    try {
      const backupRes = db.exec("SELECT json_data FROM hishab_state_backup WHERE id = 1 LIMIT 1");
      if (backupRes.length > 0 && backupRes[0].values.length > 0) {
        const rawJson = String(backupRes[0].values[0][0]);
        const parsed = JSON.parse(rawJson);
        if (parsed && typeof parsed === "object") {
          db.close();
          return {
            shopName: typeof parsed.shopName === "string" ? parsed.shopName : "আমার দোকান",
            parties: Array.isArray(parsed.parties) ? parsed.parties : [],
            products: Array.isArray(parsed.products) ? parsed.products : [],
            txns: Array.isArray(parsed.txns) ? parsed.txns : [],
          };
        }
      }
    } catch (e) {}

    let shopName = "আমার দোকান";
    try {
      const res = db.exec("SELECT shopName FROM shop_info LIMIT 1");
      if (res.length > 0 && res[0].values.length > 0) {
        shopName = String(res[0].values[0][0]);
      }
    } catch (e) {}

    const parties: Party[] = [];
    try {
      const res = db.exec("SELECT id, name, phone, type, due FROM parties");
      if (res.length > 0) {
        for (const row of res[0].values) {
          parties.push({
            id: String(row[0]),
            name: String(row[1]),
            phone: String(row[2] || ""),
            type: (row[3] as "customer" | "supplier") || "customer",
            due: Number(row[4]) || 0,
          });
        }
      }
    } catch (e) {}

    const products: Product[] = [];
    try {
      const res = db.exec("SELECT id, name, unit, stock, buyPrice, sellPrice FROM products");
      if (res.length > 0) {
        for (const row of res[0].values) {
          products.push({
            id: String(row[0]),
            name: String(row[1]),
            unit: String(row[2] || "পিস"),
            stock: Number(row[3]) || 0,
            buyPrice: Number(row[4]) || 0,
            sellPrice: Number(row[5]) || 0,
          });
        }
      }
    } catch (e) {}

    const txns: Txn[] = [];
    try {
      const res = db.exec(
        "SELECT id, kind, date, partyId, productId, qty, amount, paid, discount, method, note, refId FROM txns"
      );
      if (res.length > 0) {
        for (const row of res[0].values) {
          txns.push({
            id: String(row[0]),
            kind: row[1] as any,
            date: String(row[2]),
            partyId: row[3] ? String(row[3]) : undefined,
            productId: row[4] ? String(row[4]) : undefined,
            qty: row[5] !== null ? Number(row[5]) : undefined,
            amount: Number(row[6]) || 0,
            paid: Number(row[7]) || 0,
            discount: row[8] !== null ? Number(row[8]) : undefined,
            method: row[9] ? (row[9] as any) : undefined,
            note: row[10] ? String(row[10]) : undefined,
            refId: row[11] ? String(row[11]) : undefined,
          });
        }
      }
    } catch (e) {}

    db.close();

    return {
      shopName,
      parties,
      products,
      txns,
    };
  } catch (err) {
    console.error("SQLite parse error:", err);
    
    // 3. Fallback: Search for any embedded JSON string in the raw buffer
    try {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      const firstBrace = text.indexOf('{"shopName"');
      if (firstBrace !== -1) {
        const lastBrace = text.lastIndexOf("}");
        if (lastBrace > firstBrace) {
          const extracted = text.substring(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(extracted);
          if (parsed && typeof parsed === "object") {
            return {
              shopName: typeof parsed.shopName === "string" ? parsed.shopName : "আমার দোকান",
              parties: Array.isArray(parsed.parties) ? parsed.parties : [],
              products: Array.isArray(parsed.products) ? parsed.products : [],
              txns: Array.isArray(parsed.txns) ? parsed.txns : [],
            };
          }
        }
      }
    } catch (embErr) {
      console.warn("Embedded JSON fallback parse failed:", embErr);
    }

    return null;
  }
}
