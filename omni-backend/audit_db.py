import os
import django
from django.db import connection

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

with connection.cursor() as c:
    print("=== All Triggers in the Database ===")
    c.execute("""
        SELECT 
            event_object_schema, 
            event_object_table, 
            trigger_name, 
            event_manipulation, 
            action_statement
        FROM information_schema.triggers
        WHERE event_object_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY event_object_schema, event_object_table;
    """)
    for row in c.fetchall():
        print(f"Schema: {row[0]}, Table: {row[1]}, Name: {row[2]}, Event: {row[3]}")
        print(f"  Statement: {row[4]}")
        print("-" * 10)

    print("\n=== Checking Profiles Table Constraints ===")
    c.execute("""
        SELECT column_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles';
    """)
    for row in c.fetchall():
        print(f"Column: {row[0]}, Nullable: {row[1]}, Default: {row[2]}")
