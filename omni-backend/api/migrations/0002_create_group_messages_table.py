import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    GroupMessage was declared with Meta.managed = False, so 0001_initial's
    CreateModel for it never ran any real DDL -- the group_messages table
    (and its group/sender foreign keys, which weren't even tracked in
    migration state) was never created in any database. Now that the model
    is managed = True, this migration creates the real table and brings
    Django's migration state in line with what models.py has always
    described, without re-touching any of the other 0001 tables.
    """

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterModelOptions(
                    name="groupmessage",
                    options={"db_table": "group_messages", "managed": True},
                ),
                migrations.AddField(
                    model_name="groupmessage",
                    name="group",
                    field=models.ForeignKey(
                        default=uuid.uuid4,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        db_column="group_id",
                        to="api.readinggroup",
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="groupmessage",
                    name="sender",
                    field=models.ForeignKey(
                        default=uuid.uuid4,
                        on_delete=django.db.models.deletion.CASCADE,
                        db_column="sender_id",
                        to="api.profile",
                    ),
                    preserve_default=False,
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        CREATE TABLE IF NOT EXISTS group_messages (
                            id uuid PRIMARY KEY,
                            content text NOT NULL,
                            created_at timestamptz NOT NULL,
                            group_id uuid NOT NULL REFERENCES reading_groups(id) ON DELETE CASCADE,
                            sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
                        );
                        CREATE INDEX IF NOT EXISTS group_messages_group_id_idx ON group_messages(group_id);
                        CREATE INDEX IF NOT EXISTS group_messages_sender_id_idx ON group_messages(sender_id);
                    """,
                    reverse_sql="DROP TABLE IF EXISTS group_messages;",
                ),
            ],
        ),
    ]
