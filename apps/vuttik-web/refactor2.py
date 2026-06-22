import os
import re

tables = [
    "users", "categories", "transaction_types", "subscription_plans",
    "products", "posts", "post_likes", "metrics", "daily_stats",
    "follows", "conversations", "messages", "comments", "post_verifications"
]

files = [
    "server/db.ts",
]

def replace_in_sql(content):
    for table in tables:
        patterns = [
            r'(?i)(\bTABLE\s+IF\s+NOT\s+EXISTS\s+)' + table + r'(\b)',
        ]
        for p in patterns:
            content = re.sub(p, r'\1vuttik_' + table + r'\2', content)
    return content

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = replace_in_sql(content)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print(f"Refactored {file_path}")
