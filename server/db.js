"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = exports.all = exports.run = exports.db = void 0;
exports.initDB = initDB;
var sqlite3_1 = require("sqlite3");
var util_1 = require("util");
var path_1 = require("path");
var url_1 = require("url");
var __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
var dbPath = path_1.default.resolve(__dirname, '../vuttik.db');
var db = new sqlite3_1.default.Database(dbPath);
exports.db = db;
// Promisify database methods
var run = (0, util_1.promisify)(db.run.bind(db));
exports.run = run;
var all = (0, util_1.promisify)(db.all.bind(db));
exports.all = all;
var get = (0, util_1.promisify)(db.get.bind(db));
exports.get = get;
function initDB() {
    return __awaiter(this, void 0, void 0, function () {
        var tables_to_migrate, _i, tables_to_migrate_1, t, exists, e_1, e_2, e_3, e_4, e_5, e_6, e_7, e_8, e_9, e_10, e_11, e_12, e_13, e_14, e_15, e_16, e_17, e_18, e_19, e_20, e_21, e_22, e_23, e_24, e_25, e_26, e_27, e_28, e_29, e_30, e_31, e_32, e_33, e_34, e_35, e_36, e_37, e_38, e_39, e_40, defaultChains, _a, defaultChains_1, chain, e_41, e_42, e_43, e_44, e_45, e_46, e_47, e_48, e_49, e_50, result, hasNewCategories, newCategoryNames, initialCategories, _b, initialCategories_1, cat, initialPlans, _c, initialPlans_1, plan, err_1;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    console.log('Initializing SQL database at:', dbPath);
                    tables_to_migrate = [
                        "users", "categories", "transaction_types", "subscription_plans",
                        "products", "posts", "post_likes", "metrics", "daily_stats",
                        "follows", "conversations", "messages", "comments", "post_verifications"
                    ];
                    _i = 0, tables_to_migrate_1 = tables_to_migrate;
                    _e.label = 1;
                case 1:
                    if (!(_i < tables_to_migrate_1.length)) return [3 /*break*/, 8];
                    t = tables_to_migrate_1[_i];
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, 6, , 7]);
                    return [4 /*yield*/, get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [t])];
                case 3:
                    exists = _e.sent();
                    if (!exists) return [3 /*break*/, 5];
                    console.log("Migrating table ".concat(t, " to vuttik_").concat(t, "..."));
                    return [4 /*yield*/, run("ALTER TABLE ".concat(t, " RENAME TO vuttik_").concat(t))];
                case 4:
                    _e.sent();
                    _e.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    e_1 = _e.sent();
                    console.error("Migration error for ".concat(t, ":"), e_1);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 1];
                case 8: 
                // Users Table
                return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_users (\n      uid TEXT PRIMARY KEY,\n      email TEXT,\n      display_name TEXT,\n      photo_url TEXT,\n      role TEXT DEFAULT 'user',\n      plan_id TEXT DEFAULT 'free',\n      is_banned BOOLEAN DEFAULT 0,\n      created_at TEXT,\n      password_hash TEXT,\n      oauth_provider TEXT,\n      oauth_id TEXT,\n      onboarding_completed BOOLEAN DEFAULT 0,\n      active_profile_mode TEXT DEFAULT 'personal',\n      age INTEGER,\n      gender TEXT,\n      country TEXT,\n      username TEXT,\n      username_changes TEXT DEFAULT '[]',\n      email_verified BOOLEAN DEFAULT 0,\n      verification_token TEXT,\n      reset_password_token TEXT,\n      reset_password_expires TEXT\n    )\n  ")];
                case 9:
                    // Users Table
                    _e.sent();
                    _e.label = 10;
                case 10:
                    _e.trys.push([10, 12, , 13]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN password_hash TEXT")];
                case 11:
                    _e.sent();
                    return [3 /*break*/, 13];
                case 12:
                    e_2 = _e.sent();
                    return [3 /*break*/, 13];
                case 13:
                    _e.trys.push([13, 15, , 16]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN oauth_provider TEXT")];
                case 14:
                    _e.sent();
                    return [3 /*break*/, 16];
                case 15:
                    e_3 = _e.sent();
                    return [3 /*break*/, 16];
                case 16:
                    _e.trys.push([16, 18, , 19]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN oauth_id TEXT")];
                case 17:
                    _e.sent();
                    return [3 /*break*/, 19];
                case 18:
                    e_4 = _e.sent();
                    return [3 /*break*/, 19];
                case 19:
                    _e.trys.push([19, 21, , 22]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN onboarding_completed BOOLEAN DEFAULT 0")];
                case 20:
                    _e.sent();
                    return [3 /*break*/, 22];
                case 21:
                    e_5 = _e.sent();
                    return [3 /*break*/, 22];
                case 22:
                    _e.trys.push([22, 24, , 25]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN age INTEGER")];
                case 23:
                    _e.sent();
                    return [3 /*break*/, 25];
                case 24:
                    e_6 = _e.sent();
                    return [3 /*break*/, 25];
                case 25:
                    _e.trys.push([25, 27, , 28]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN gender TEXT")];
                case 26:
                    _e.sent();
                    return [3 /*break*/, 28];
                case 27:
                    e_7 = _e.sent();
                    return [3 /*break*/, 28];
                case 28:
                    _e.trys.push([28, 30, , 31]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN country TEXT")];
                case 29:
                    _e.sent();
                    return [3 /*break*/, 31];
                case 30:
                    e_8 = _e.sent();
                    return [3 /*break*/, 31];
                case 31:
                    _e.trys.push([31, 33, , 34]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN language TEXT")];
                case 32:
                    _e.sent();
                    return [3 /*break*/, 34];
                case 33:
                    e_9 = _e.sent();
                    return [3 /*break*/, 34];
                case 34:
                    _e.trys.push([34, 36, , 37]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN username TEXT")];
                case 35:
                    _e.sent();
                    return [3 /*break*/, 37];
                case 36:
                    e_10 = _e.sent();
                    return [3 /*break*/, 37];
                case 37:
                    _e.trys.push([37, 39, , 40]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN username_changes TEXT DEFAULT '[]'")];
                case 38:
                    _e.sent();
                    return [3 /*break*/, 40];
                case 39:
                    e_11 = _e.sent();
                    return [3 /*break*/, 40];
                case 40:
                    _e.trys.push([40, 42, , 43]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN email_verified BOOLEAN DEFAULT 0")];
                case 41:
                    _e.sent();
                    return [3 /*break*/, 43];
                case 42:
                    e_12 = _e.sent();
                    return [3 /*break*/, 43];
                case 43:
                    _e.trys.push([43, 45, , 46]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN verification_token TEXT")];
                case 44:
                    _e.sent();
                    return [3 /*break*/, 46];
                case 45:
                    e_13 = _e.sent();
                    return [3 /*break*/, 46];
                case 46:
                    _e.trys.push([46, 48, , 49]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN next_billing_date TEXT")];
                case 47:
                    _e.sent();
                    return [3 /*break*/, 49];
                case 48:
                    e_14 = _e.sent();
                    return [3 /*break*/, 49];
                case 49:
                    _e.trys.push([49, 51, , 52]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN active_profile_mode TEXT DEFAULT 'personal'")];
                case 50:
                    _e.sent();
                    return [3 /*break*/, 52];
                case 51:
                    e_15 = _e.sent();
                    return [3 /*break*/, 52];
                case 52:
                    _e.trys.push([52, 54, , 55]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN is_banned BOOLEAN DEFAULT 0")];
                case 53:
                    _e.sent();
                    return [3 /*break*/, 55];
                case 54:
                    e_16 = _e.sent();
                    return [3 /*break*/, 55];
                case 55:
                    _e.trys.push([55, 57, , 58]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN strikes INTEGER DEFAULT 0")];
                case 56:
                    _e.sent();
                    return [3 /*break*/, 58];
                case 57:
                    e_17 = _e.sent();
                    return [3 /*break*/, 58];
                case 58:
                    _e.trys.push([58, 60, , 61]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN reset_password_token TEXT")];
                case 59:
                    _e.sent();
                    return [3 /*break*/, 61];
                case 60:
                    e_18 = _e.sent();
                    return [3 /*break*/, 61];
                case 61:
                    _e.trys.push([61, 63, , 64]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_users ADD COLUMN reset_password_expires TEXT")];
                case 62:
                    _e.sent();
                    return [3 /*break*/, 64];
                case 63:
                    e_19 = _e.sent();
                    return [3 /*break*/, 64];
                case 64: 
                // Notifications Table
                return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_notifications (\n      id TEXT PRIMARY KEY,\n      user_id TEXT NOT NULL,\n      type TEXT,\n      title TEXT NOT NULL,\n      message TEXT NOT NULL,\n      is_read BOOLEAN DEFAULT 0,\n      created_at TEXT NOT NULL,\n      FOREIGN KEY(user_id) REFERENCES vuttik_users(uid)\n    )\n  ")];
                case 65:
                    // Notifications Table
                    _e.sent();
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_notifications_user ON vuttik_notifications(user_id)')];
                case 66:
                    _e.sent();
                    // Categories Table
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_categories (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL,\n      icon TEXT DEFAULT 'Tag',\n      order_index INTEGER DEFAULT 0,\n      allowed_types TEXT, -- JSON array\n      fields TEXT, -- JSON array\n      system_fields TEXT -- JSON object\n    )\n  ")];
                case 67:
                    // Categories Table
                    _e.sent();
                    _e.label = 68;
                case 68:
                    _e.trys.push([68, 70, , 71]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_categories ADD COLUMN icon TEXT DEFAULT 'Tag'")];
                case 69:
                    _e.sent();
                    return [3 /*break*/, 71];
                case 70:
                    e_20 = _e.sent();
                    return [3 /*break*/, 71];
                case 71:
                    _e.trys.push([71, 73, , 74]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_categories ADD COLUMN created_by TEXT")];
                case 72:
                    _e.sent();
                    return [3 /*break*/, 74];
                case 73:
                    e_21 = _e.sent();
                    return [3 /*break*/, 74];
                case 74:
                    _e.trys.push([74, 76, , 77]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_categories ADD COLUMN is_service BOOLEAN DEFAULT 0")];
                case 75:
                    _e.sent();
                    return [3 /*break*/, 77];
                case 76:
                    e_22 = _e.sent();
                    return [3 /*break*/, 77];
                case 77:
                    _e.trys.push([77, 79, , 80]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_categories ADD COLUMN requires_ean BOOLEAN DEFAULT 0")];
                case 78:
                    _e.sent();
                    return [3 /*break*/, 80];
                case 79:
                    e_23 = _e.sent();
                    return [3 /*break*/, 80];
                case 80: 
                // Category Proposals Table
                return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_category_proposals (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL,\n      suggested_by_id TEXT,\n      suggested_by_name TEXT,\n      status TEXT DEFAULT 'pending', -- pending, approved, rejected\n      created_at TEXT\n    )\n  ")];
                case 81:
                    // Category Proposals Table
                    _e.sent();
                    // Category Votes Table
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_category_votes (\n      proposal_id TEXT,\n      guardian_id TEXT,\n      vote_type TEXT, -- 'up' or 'down'\n      created_at TEXT,\n      PRIMARY KEY (proposal_id, guardian_id),\n      FOREIGN KEY(proposal_id) REFERENCES vuttik_category_proposals(id),\n      FOREIGN KEY(guardian_id) REFERENCES vuttik_users(uid)\n    )\n  ")];
                case 82:
                    // Category Votes Table
                    _e.sent();
                    // Transaction Types Table
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_transaction_types (\n      id TEXT PRIMARY KEY,\n      label TEXT NOT NULL,\n      icon TEXT DEFAULT 'Tag',\n      active BOOLEAN DEFAULT 1\n    )\n  ")];
                case 83:
                    // Transaction Types Table
                    _e.sent();
                    _e.label = 84;
                case 84:
                    _e.trys.push([84, 86, , 87]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_transaction_types ADD COLUMN icon TEXT DEFAULT 'Tag'")];
                case 85:
                    _e.sent();
                    return [3 /*break*/, 87];
                case 86:
                    e_24 = _e.sent();
                    return [3 /*break*/, 87];
                case 87:
                    _e.trys.push([87, 89, , 90]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_transaction_types ADD COLUMN active BOOLEAN DEFAULT 1")];
                case 88:
                    _e.sent();
                    return [3 /*break*/, 90];
                case 89:
                    e_25 = _e.sent();
                    return [3 /*break*/, 90];
                case 90: 
                // Subscription Plans Table
                return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_subscription_plans (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL,\n      price REAL DEFAULT 0,\n      features TEXT, -- JSON array\n      is_hidden BOOLEAN DEFAULT 0,\n      is_coming_soon BOOLEAN DEFAULT 0,\n      is_recommended BOOLEAN DEFAULT 0,\n      order_index INTEGER DEFAULT 0\n    )\n  ")];
                case 91:
                    // Subscription Plans Table
                    _e.sent();
                    _e.label = 92;
                case 92:
                    _e.trys.push([92, 94, , 95]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_subscription_plans ADD COLUMN is_hidden BOOLEAN DEFAULT 0")];
                case 93:
                    _e.sent();
                    return [3 /*break*/, 95];
                case 94:
                    e_26 = _e.sent();
                    return [3 /*break*/, 95];
                case 95:
                    _e.trys.push([95, 97, , 98]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_subscription_plans ADD COLUMN is_coming_soon BOOLEAN DEFAULT 0")];
                case 96:
                    _e.sent();
                    return [3 /*break*/, 98];
                case 97:
                    e_27 = _e.sent();
                    return [3 /*break*/, 98];
                case 98:
                    _e.trys.push([98, 100, , 101]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_subscription_plans ADD COLUMN is_recommended BOOLEAN DEFAULT 0")];
                case 99:
                    _e.sent();
                    return [3 /*break*/, 101];
                case 100:
                    e_28 = _e.sent();
                    return [3 /*break*/, 101];
                case 101:
                    _e.trys.push([101, 103, , 104]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_subscription_plans ADD COLUMN order_index INTEGER DEFAULT 0")];
                case 102:
                    _e.sent();
                    return [3 /*break*/, 104];
                case 103:
                    e_29 = _e.sent();
                    return [3 /*break*/, 104];
                case 104: 
                // Products Table
                return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_products (\n      id TEXT PRIMARY KEY,\n      title TEXT NOT NULL,\n      description TEXT,\n      price REAL,\n      currency TEXT DEFAULT 'DOP',\n      category_id TEXT,\n      type_id TEXT,\n      author_id TEXT,\n      author_name TEXT,\n      location TEXT,\n      phone TEXT,\n      lat REAL,\n      lng REAL,\n      barcode TEXT,\n      is_on_sale BOOLEAN DEFAULT 0,\n      sale_price REAL,\n      images TEXT, -- JSON array\n      custom_fields TEXT, -- JSON object\n      created_at TEXT,\n      FOREIGN KEY(category_id) REFERENCES vuttik_categories(id),\n      FOREIGN KEY(author_id) REFERENCES vuttik_users(uid)\n    )\n  ")];
                case 105:
                    // Products Table
                    _e.sent();
                    _e.label = 106;
                case 106:
                    _e.trys.push([106, 108, , 109]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_products ADD COLUMN barcode TEXT")];
                case 107:
                    _e.sent();
                    return [3 /*break*/, 109];
                case 108:
                    e_30 = _e.sent();
                    return [3 /*break*/, 109];
                case 109:
                    _e.trys.push([109, 111, , 112]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_products ADD COLUMN phone TEXT")];
                case 110:
                    _e.sent();
                    return [3 /*break*/, 112];
                case 111:
                    e_31 = _e.sent();
                    return [3 /*break*/, 112];
                case 112:
                    _e.trys.push([112, 114, , 115]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_products ADD COLUMN lat REAL")];
                case 113:
                    _e.sent();
                    return [3 /*break*/, 115];
                case 114:
                    e_32 = _e.sent();
                    return [3 /*break*/, 115];
                case 115:
                    _e.trys.push([115, 117, , 118]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_products ADD COLUMN lng REAL")];
                case 116:
                    _e.sent();
                    return [3 /*break*/, 118];
                case 117:
                    e_33 = _e.sent();
                    return [3 /*break*/, 118];
                case 118:
                    _e.trys.push([118, 120, , 121]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_products ADD COLUMN is_on_sale BOOLEAN DEFAULT 0")];
                case 119:
                    _e.sent();
                    return [3 /*break*/, 121];
                case 120:
                    e_34 = _e.sent();
                    return [3 /*break*/, 121];
                case 121:
                    _e.trys.push([121, 123, , 124]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_products ADD COLUMN sale_price REAL")];
                case 122:
                    _e.sent();
                    return [3 /*break*/, 124];
                case 123:
                    e_35 = _e.sent();
                    return [3 /*break*/, 124];
                case 124:
                    _e.trys.push([124, 126, , 127]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_products ADD COLUMN chain TEXT")];
                case 125:
                    _e.sent();
                    return [3 /*break*/, 127];
                case 126:
                    e_36 = _e.sent();
                    return [3 /*break*/, 127];
                case 127:
                    _e.trys.push([127, 129, , 130]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_products ADD COLUMN store_name TEXT")];
                case 128:
                    _e.sent();
                    return [3 /*break*/, 130];
                case 129:
                    e_37 = _e.sent();
                    return [3 /*break*/, 130];
                case 130:
                    _e.trys.push([130, 132, , 133]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_products ADD COLUMN is_independent BOOLEAN DEFAULT 0")];
                case 131:
                    _e.sent();
                    return [3 /*break*/, 133];
                case 132:
                    e_38 = _e.sent();
                    return [3 /*break*/, 133];
                case 133:
                    _e.trys.push([133, 135, , 136]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_products ADD COLUMN country TEXT")];
                case 134:
                    _e.sent();
                    return [3 /*break*/, 136];
                case 135:
                    e_39 = _e.sent();
                    return [3 /*break*/, 136];
                case 136:
                    _e.trys.push([136, 138, , 139]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_products ADD COLUMN province TEXT")];
                case 137:
                    _e.sent();
                    return [3 /*break*/, 139];
                case 138:
                    e_40 = _e.sent();
                    return [3 /*break*/, 139];
                case 139: 
                // Chains Table
                return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_chains (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL,\n      created_by TEXT,\n      created_at TEXT\n    )\n  ")];
                case 140:
                    // Chains Table
                    _e.sent();
                    defaultChains = [
                        { id: 'nacional', name: 'Supermercados Nacional' },
                        { id: 'sirena', name: 'La Sirena' },
                        { id: 'jumbo', name: 'Jumbo' },
                        { id: 'bravo', name: 'Supermercados Bravo' },
                        { id: 'plaza-lama', name: 'Plaza Lama' },
                        { id: 'carrefour', name: 'Carrefour' },
                        { id: 'sirena-market', name: 'Sirena Market' },
                        { id: 'aprezio', name: 'Aprezio' },
                        { id: 'iberia', name: 'Hipermercados Iberia' },
                        { id: 'ole', name: 'Hipermercados Olé' }
                    ];
                    _a = 0, defaultChains_1 = defaultChains;
                    _e.label = 141;
                case 141:
                    if (!(_a < defaultChains_1.length)) return [3 /*break*/, 146];
                    chain = defaultChains_1[_a];
                    _e.label = 142;
                case 142:
                    _e.trys.push([142, 144, , 145]);
                    return [4 /*yield*/, run('INSERT INTO vuttik_chains (id, name, created_at) VALUES (?, ?, ?)', [chain.id, chain.name, new Date().toISOString()])];
                case 143:
                    _e.sent();
                    return [3 /*break*/, 145];
                case 144:
                    e_41 = _e.sent();
                    return [3 /*break*/, 145];
                case 145:
                    _a++;
                    return [3 /*break*/, 141];
                case 146: 
                // Product Votes Table
                return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_product_votes (\n      product_id TEXT,\n      user_id TEXT,\n      vote_type TEXT, -- 'up' or 'down'\n      created_at TEXT,\n      PRIMARY KEY (product_id, user_id),\n      FOREIGN KEY(product_id) REFERENCES vuttik_products(id),\n      FOREIGN KEY(user_id) REFERENCES vuttik_users(uid)\n    )\n  ")];
                case 147:
                    // Product Votes Table
                    _e.sent();
                    _e.label = 148;
                case 148:
                    _e.trys.push([148, 150, , 151]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_products ADD COLUMN posted_as TEXT DEFAULT 'personal'")];
                case 149:
                    _e.sent();
                    return [3 /*break*/, 151];
                case 150:
                    e_42 = _e.sent();
                    return [3 /*break*/, 151];
                case 151: 
                // Social Posts Table
                return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_posts (\n      id TEXT PRIMARY KEY,\n      author_id TEXT NOT NULL,\n      author_name TEXT,\n      author_avatar TEXT,\n      content TEXT NOT NULL,\n      image_url TEXT,\n      location TEXT,\n      is_verified BOOLEAN DEFAULT 0,\n      created_at TEXT NOT NULL,\n      posted_as TEXT DEFAULT 'personal',\n      FOREIGN KEY(author_id) REFERENCES vuttik_users(uid)\n    )\n  ")];
                case 152:
                    // Social Posts Table
                    _e.sent();
                    _e.label = 153;
                case 153:
                    _e.trys.push([153, 155, , 156]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_posts ADD COLUMN posted_as TEXT DEFAULT 'personal'")];
                case 154:
                    _e.sent();
                    return [3 /*break*/, 156];
                case 155:
                    e_43 = _e.sent();
                    return [3 /*break*/, 156];
                case 156: 
                // Post Likes Table (Relation)
                return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_post_likes (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      post_id TEXT,\n      user_id TEXT,\n      FOREIGN KEY(post_id) REFERENCES vuttik_posts(id),\n      FOREIGN KEY(user_id) REFERENCES vuttik_users(uid),\n      UNIQUE(post_id, user_id)\n    )\n  ")];
                case 157:
                    // Post Likes Table (Relation)
                    _e.sent();
                    // Metrics Table
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_metrics (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      user_id TEXT,\n      action TEXT,\n      target_id TEXT,\n      target_type TEXT,\n      metadata TEXT, -- JSON object\n      timestamp TEXT\n    )\n  ")];
                case 158:
                    // Metrics Table
                    _e.sent();
                    // Daily Aggregated Stats (For performance)
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_daily_stats (\n      date TEXT PRIMARY KEY,\n      views INTEGER DEFAULT 0,\n      searches INTEGER DEFAULT 0,\n      contacts INTEGER DEFAULT 0,\n      total_p2p_volume REAL DEFAULT 0\n    )\n  ")];
                case 159:
                    // Daily Aggregated Stats (For performance)
                    _e.sent();
                    // Indices for analytics performance
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON vuttik_metrics(timestamp)')];
                case 160:
                    // Indices for analytics performance
                    _e.sent();
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_metrics_action ON vuttik_metrics(action)')];
                case 161:
                    _e.sent();
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_products_category ON vuttik_products(category_id)')];
                case 162:
                    _e.sent();
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_products_created ON vuttik_products(created_at)')];
                case 163:
                    _e.sent();
                    // Follows Table (Who follows whom)
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_follows (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      follower_id TEXT NOT NULL,\n      following_id TEXT NOT NULL,\n      created_at TEXT,\n      UNIQUE(follower_id, following_id),\n      FOREIGN KEY(follower_id) REFERENCES vuttik_users(uid),\n      FOREIGN KEY(following_id) REFERENCES vuttik_users(uid)\n    )\n  ")];
                case 164:
                    // Follows Table (Who follows whom)
                    _e.sent();
                    // Product Follows Table (Who follows which product)
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_product_follows (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      user_id TEXT NOT NULL,\n      product_id TEXT NOT NULL,\n      entity_type TEXT DEFAULT 'product_id',\n      entity_value TEXT,\n      created_at TEXT,\n      UNIQUE(user_id, product_id),\n      FOREIGN KEY(user_id) REFERENCES vuttik_users(uid),\n      FOREIGN KEY(product_id) REFERENCES vuttik_products(id)\n    )\n  ")];
                case 165:
                    // Product Follows Table (Who follows which product)
                    _e.sent();
                    _e.label = 166;
                case 166:
                    _e.trys.push([166, 168, , 169]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_product_follows ADD COLUMN entity_type TEXT DEFAULT 'product_id'")];
                case 167:
                    _e.sent();
                    return [3 /*break*/, 169];
                case 168:
                    e_44 = _e.sent();
                    return [3 /*break*/, 169];
                case 169:
                    _e.trys.push([169, 171, , 172]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_product_follows ADD COLUMN entity_value TEXT")];
                case 170:
                    _e.sent();
                    return [3 /*break*/, 172];
                case 171:
                    e_45 = _e.sent();
                    return [3 /*break*/, 172];
                case 172: 
                // Conversations Table (like WhatsApp chats)
                return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_conversations (\n      id TEXT PRIMARY KEY,\n      participant_1 TEXT NOT NULL,\n      participant_2 TEXT NOT NULL,\n      last_message TEXT,\n      last_message_at TEXT,\n      created_at TEXT,\n      FOREIGN KEY(participant_1) REFERENCES vuttik_users(uid),\n      FOREIGN KEY(participant_2) REFERENCES vuttik_users(uid)\n    )\n  ")];
                case 173:
                    // Conversations Table (like WhatsApp chats)
                    _e.sent();
                    _e.label = 174;
                case 174:
                    _e.trys.push([174, 176, , 177]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_conversations ADD COLUMN p1_name TEXT")];
                case 175:
                    _e.sent();
                    return [3 /*break*/, 177];
                case 176:
                    e_46 = _e.sent();
                    return [3 /*break*/, 177];
                case 177:
                    _e.trys.push([177, 179, , 180]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_conversations ADD COLUMN p1_photo TEXT")];
                case 178:
                    _e.sent();
                    return [3 /*break*/, 180];
                case 179:
                    e_47 = _e.sent();
                    return [3 /*break*/, 180];
                case 180:
                    _e.trys.push([180, 182, , 183]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_conversations ADD COLUMN p2_name TEXT")];
                case 181:
                    _e.sent();
                    return [3 /*break*/, 183];
                case 182:
                    e_48 = _e.sent();
                    return [3 /*break*/, 183];
                case 183:
                    _e.trys.push([183, 185, , 186]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_conversations ADD COLUMN p2_photo TEXT")];
                case 184:
                    _e.sent();
                    return [3 /*break*/, 186];
                case 185:
                    e_49 = _e.sent();
                    return [3 /*break*/, 186];
                case 186: 
                // Seed the Guardian Global Chat if it doesn't exist
                return [4 /*yield*/, run("\n    INSERT OR IGNORE INTO vuttik_conversations (id, participant_1, participant_2, p1_name, p2_name, last_message, created_at)\n    VALUES ('guardian_global_chat', 'system', 'system', 'Chat de Guardianes', 'Chat de Guardianes', 'Bienvenido al chat de guardianes', ?)\n  ", [new Date().toISOString()])];
                case 187:
                    // Seed the Guardian Global Chat if it doesn't exist
                    _e.sent();
                    // Messages Table (persistent messages per conversation)
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_messages (\n      id TEXT PRIMARY KEY,\n      conversation_id TEXT NOT NULL,\n      sender_id TEXT NOT NULL,\n      content TEXT NOT NULL,\n      sent_at TEXT NOT NULL,\n      is_read BOOLEAN DEFAULT 0,\n      FOREIGN KEY(conversation_id) REFERENCES vuttik_conversations(id),\n      FOREIGN KEY(sender_id) REFERENCES vuttik_users(uid)\n    )\n  ")];
                case 188:
                    // Messages Table (persistent messages per conversation)
                    _e.sent();
                    // Comments Table
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_comments (\n      id TEXT PRIMARY KEY,\n      post_id TEXT,\n      author_id TEXT,\n      author_name TEXT,\n      author_avatar TEXT,\n      content TEXT NOT NULL,\n      created_at TEXT,\n      FOREIGN KEY(post_id) REFERENCES vuttik_posts(id),\n      FOREIGN KEY(author_id) REFERENCES vuttik_users(uid)\n    )\n  ")];
                case 189:
                    // Comments Table
                    _e.sent();
                    // Post Verifications Table (Veracity Votes)
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_post_verifications (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      post_id TEXT,\n      user_id TEXT,\n      is_veracious BOOLEAN, -- 1 for True, 0 for False\n      created_at TEXT,\n      UNIQUE(post_id, user_id),\n      FOREIGN KEY(post_id) REFERENCES vuttik_posts(id),\n      FOREIGN KEY(user_id) REFERENCES vuttik_users(uid)\n    )\n  ")];
                case 190:
                    // Post Verifications Table (Veracity Votes)
                    _e.sent();
                    // Business Profiles Table (persistent negocio/business profile data)
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_business_profiles (\n      uid TEXT PRIMARY KEY,\n      name TEXT,\n      description TEXT,\n      location TEXT,\n      phone TEXT,\n      working_hours TEXT,\n      logo TEXT,\n      social_links TEXT, -- JSON object {instagram, facebook, twitter, website}\n      created_at TEXT,\n      updated_at TEXT,\n      FOREIGN KEY(uid) REFERENCES vuttik_users(uid)\n    )\n  ")];
                case 191:
                    // Business Profiles Table (persistent negocio/business profile data)
                    _e.sent();
                    // Business Members Table (team management)
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_business_members (\n      id TEXT PRIMARY KEY,\n      business_uid TEXT NOT NULL,\n      member_uid TEXT NOT NULL,\n      role TEXT DEFAULT 'admin',\n      status TEXT DEFAULT 'pending',\n      created_at TEXT,\n      FOREIGN KEY(business_uid) REFERENCES vuttik_business_profiles(uid),\n      FOREIGN KEY(member_uid) REFERENCES vuttik_users(uid)\n    )\n  ")];
                case 192:
                    // Business Members Table (team management)
                    _e.sent();
                    // Reports Table (Universal for posts, products, and users)
                    return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_reports (\n      id TEXT PRIMARY KEY,\n      reporter_id TEXT NOT NULL,\n      target_id TEXT NOT NULL,\n      target_type TEXT NOT NULL, -- 'user', 'post', 'product'\n      target_title TEXT, -- Name of user or title of post/product for easy viewing\n      author_id TEXT, -- Original author of the reported content (if applicable)\n      author_name TEXT,\n      reason TEXT NOT NULL,\n      status TEXT DEFAULT 'pending', -- pending, resolved, dismissed\n      created_at TEXT NOT NULL\n    )\n  ")];
                case 193:
                    // Reports Table (Universal for posts, products, and users)
                    _e.sent();
                    _e.label = 194;
                case 194:
                    _e.trys.push([194, 196, , 197]);
                    return [4 /*yield*/, run("ALTER TABLE vuttik_notifications ADD COLUMN type TEXT")];
                case 195:
                    _e.sent();
                    return [3 /*break*/, 197];
                case 196:
                    e_50 = _e.sent();
                    return [3 /*break*/, 197];
                case 197: 
                // EAN Database Table
                return [4 /*yield*/, run("\n    CREATE TABLE IF NOT EXISTS vuttik_ean_database (\n      ean TEXT PRIMARY KEY,\n      name TEXT NOT NULL,\n      description TEXT,\n      brand TEXT,\n      category TEXT,\n      image_url TEXT,\n      created_by TEXT,\n      created_at TEXT\n    )\n  ")];
                case 198:
                    // EAN Database Table
                    _e.sent();
                    // Indices for performance
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_comments_post ON vuttik_comments(post_id)')];
                case 199:
                    // Indices for performance
                    _e.sent();
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_verifications_post ON vuttik_post_verifications(post_id)')];
                case 200:
                    _e.sent();
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON vuttik_messages(conversation_id)')];
                case 201:
                    _e.sent();
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_messages_sent ON vuttik_messages(sent_at)')];
                case 202:
                    _e.sent();
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_follows_follower ON vuttik_follows(follower_id)')];
                case 203:
                    _e.sent();
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_follows_following ON vuttik_follows(following_id)')];
                case 204:
                    _e.sent();
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON vuttik_conversations(participant_1)')];
                case 205:
                    _e.sent();
                    return [4 /*yield*/, run('CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON vuttik_conversations(participant_2)')];
                case 206:
                    _e.sent();
                    console.log('Database schema created successfully.');
                    _e.label = 207;
                case 207:
                    _e.trys.push([207, 225, , 226]);
                    return [4 /*yield*/, get("SELECT COUNT(*) as count FROM vuttik_categories WHERE id = 'TECNOLOGIA'")];
                case 208:
                    result = _e.sent();
                    hasNewCategories = ((_d = result === null || result === void 0 ? void 0 : result.count) !== null && _d !== void 0 ? _d : 0) > 0;
                    if (!!hasNewCategories) return [3 /*break*/, 224];
                    console.log('Seeding new initial categories...');
                    return [4 /*yield*/, run('DELETE FROM vuttik_categories')];
                case 209:
                    _e.sent(); // Clear old categories
                    newCategoryNames = [
                        "Tecnología", "Videojuegos", "Audio", "Cámaras", "Electrodomésticos", "Seguridad", "Vehículos", "Repuestos", "Motocicletas", "Maquinaria", "Muebles", "Ferretería", "Jardinería", "Mascotas", "Inmuebles", "Ropa", "Calzado", "Joyería", "Bolsos", "Cosmética", "Fitness", "Ciclismo", "Deportes", "Camping", "Libros", "Instrumentos", "Arte", "Coleccionables", "Juguetes", "Alimentos", "Bebidas", "Suplementos", "Repostería", "Plomería", "Electricidad", "Carpintería", "Limpieza", "Tutorías", "Mudanzas", "Préstamos", "Seguros", "Asesoría", "Empleos", "Químicos", "Papelería", "Embalajes", "Herramientas", "Software", "Entradas", "Catering", "Telefonía", "Relojería", "Computación", "Iluminación", "Climatización", "Llantas", "Neumáticos", "Bicicletas", "Perfumería", "Lencería", "Bisutería", "Óptica", "Cristalería", "Vajilla", "Tapicería", "Colchones", "Antigüedades", "Artesanías", "Pinturas", "Esculturas", "Cómics", "Música", "Películas", "Coleccionismo", "Caza", "Pesca", "Senderismo", "Gimnasios", "Nutrición", "Licorería", "Charcutería", "Panadería", "Heladería", "Lavandería", "Sastrería", "Peluquería", "Barbería", "Veterinaria", "Guarderías", "Fotografía", "Imprenta", "Contabilidad", "Notaría", "Logística", "Almacenaje", "Envases", "Maternidad", "Cotillón", "Hospedaje", "Turismo"
                    ];
                    initialCategories = newCategoryNames.map(function (name, index) { return ({
                        id: name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_'),
                        name: name,
                        order: index + 1,
                        types: ['sell', 'buy'],
                        fields: [],
                        sys: {
                            title: { label: 'Título del anuncio', required: true },
                            price: { label: 'Precio', required: true },
                            location: { label: 'Ubicación', required: true },
                            description: { label: 'Descripción', required: true }
                        }
                    }); });
                    _b = 0, initialCategories_1 = initialCategories;
                    _e.label = 210;
                case 210:
                    if (!(_b < initialCategories_1.length)) return [3 /*break*/, 213];
                    cat = initialCategories_1[_b];
                    return [4 /*yield*/, run('INSERT OR REPLACE INTO vuttik_categories (id, name, icon, order_index, allowed_types, fields, system_fields) VALUES (?, ?, ?, ?, ?, ?, ?)', [cat.id, cat.name, 'Tag', cat.order, JSON.stringify(cat.types), JSON.stringify(cat.fields), JSON.stringify(cat.sys)])];
                case 211:
                    _e.sent();
                    _e.label = 212;
                case 212:
                    _b++;
                    return [3 /*break*/, 210];
                case 213: return [4 /*yield*/, run('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', ['sell', 'Venta', 'ArrowUpCircle', 1])];
                case 214:
                    _e.sent();
                    return [4 /*yield*/, run('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', ['buy', 'Compra', 'ArrowDownCircle', 1])];
                case 215:
                    _e.sent();
                    return [4 /*yield*/, run('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', ['rent', 'Alquiler', 'Key', 1])];
                case 216:
                    _e.sent();
                    return [4 /*yield*/, run('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', ['loan', 'Préstamo', 'Banknote', 1])];
                case 217:
                    _e.sent();
                    return [4 /*yield*/, run('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', ['hire', 'Contratación', 'BriefcaseBusiness', 1])];
                case 218:
                    _e.sent();
                    return [4 /*yield*/, run('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', ['service', 'Servicio', 'ShieldCheck', 1])];
                case 219:
                    _e.sent();
                    initialPlans = [
                        { id: 'free', name: 'Gratis', price: 0, features: ['market', 'social'] },
                        { id: 'business', name: 'Empresa', price: 29.99, features: ['market', 'social', 'business_dash', 'priority_support'] },
                        { id: 'negocio', name: 'Negocio', price: 9.99, features: ['market', 'social', 'negocio_dash'] },
                        { id: 'guardian', name: 'Guardian', price: 0, features: ['market', 'social', 'guardian_dash'] },
                    ];
                    _c = 0, initialPlans_1 = initialPlans;
                    _e.label = 220;
                case 220:
                    if (!(_c < initialPlans_1.length)) return [3 /*break*/, 223];
                    plan = initialPlans_1[_c];
                    return [4 /*yield*/, run('INSERT OR REPLACE INTO vuttik_subscription_plans (id, name, price, features) VALUES (?, ?, ?, ?)', [plan.id, plan.name, plan.price, JSON.stringify(plan.features)])];
                case 221:
                    _e.sent();
                    _e.label = 222;
                case 222:
                    _c++;
                    return [3 /*break*/, 220];
                case 223:
                    console.log('Seeding completed successfully.');
                    _e.label = 224;
                case 224: return [3 /*break*/, 226];
                case 225:
                    err_1 = _e.sent();
                    console.error('Error during seeding check:', err_1);
                    return [3 /*break*/, 226];
                case 226: return [2 /*return*/];
            }
        });
    });
}
