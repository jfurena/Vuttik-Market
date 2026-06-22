import os
import re

tables = [
    "users", "categories", "transaction_types", "subscription_plans",
    "products", "posts", "post_likes", "metrics", "daily_stats",
    "follows", "conversations", "messages", "comments", "post_verifications"
]

files = [
    "server/db.ts",
    "server/index.ts",
    "server/auth.ts"
]

def replace_in_sql(content):
    for table in tables:
        # Match table names in SQL context: FROM table, INTO table, JOIN table, UPDATE table, TABLE table
        # Also handle ON table(col) for index, REFERENCES table(col)
        patterns = [
            r'(?i)(\bFROM\s+)' + table + r'(\b)',
            r'(?i)(\bINTO\s+)' + table + r'(\b)',
            r'(?i)(\bJOIN\s+)' + table + r'(\b)',
            r'(?i)(\bUPDATE\s+)' + table + r'(\b)',
            r'(?i)(\bTABLE\s+)' + table + r'(\b)',
            r'(?i)(\bREFERENCES\s+)' + table + r'(\s*\()',
            r'(?i)(\bON\s+)' + table + r'(\s*\()',
        ]
        for p in patterns:
            content = re.sub(p, r'\1vuttik_' + table + r'\2', content)
    return content

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = replace_in_sql(content)
    
    if "db.ts" in file_path:
        # Add migration script
        migration_block = """  // Auto-migration to new table prefixes
  const tables_to_migrate = [
    "users", "categories", "transaction_types", "subscription_plans",
    "products", "posts", "post_likes", "metrics", "daily_stats",
    "follows", "conversations", "messages", "comments", "post_verifications"
  ];
  for (const t of tables_to_migrate) {
    try {
      const exists = await get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [t]);
      if (exists) {
        console.log(`Migrating table ${t} to vuttik_${t}...`);
        await run(`ALTER TABLE ${t} RENAME TO vuttik_${t}`);
      }
    } catch (e) {
      console.error(`Migration error for ${t}:`, e);
    }
  }
"""
        new_content = new_content.replace(
            "console.log('Initializing SQL database at:', dbPath);",
            "console.log('Initializing SQL database at:', dbPath);\n\n" + migration_block
        )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print(f"Refactored {file_path}")
