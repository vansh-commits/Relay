"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-18

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "conversations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", sa.String(255), unique=True, nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("metadata", JSONB, nullable=False, server_default="{}"),
    )
    op.create_index("idx_conversations_session_id", "conversations", ["session_id"])
    op.create_index("idx_conversations_status", "conversations", ["status"])
    op.create_index("idx_conversations_created_at", "conversations", ["created_at"])

    op.create_table(
        "messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("confidence_score", sa.Float, nullable=True),
        sa.Column("retrieved_chunks", JSONB, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("idx_messages_created_at", "messages", ["created_at"])
    op.create_index("idx_messages_confidence_score", "messages", ["confidence_score"])

    op.create_table(
        "knowledge_sources",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("source_path", sa.Text, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("chunk_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("last_ingested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_knowledge_sources_status", "knowledge_sources", ["status"])

    op.create_table(
        "escalations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=False),
        sa.Column("reason", sa.String(100), nullable=False),
        sa.Column("confidence_score", sa.Float, nullable=True),
        sa.Column("handoff_summary", sa.Text, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("assigned_agent", sa.String(255), nullable=True),
        sa.Column("resolution_notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_escalations_status", "escalations", ["status"])
    op.create_index("idx_escalations_created_at", "escalations", ["created_at"])

    op.create_table(
        "feedback",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("message_id", UUID(as_uuid=True), sa.ForeignKey("messages.id"), nullable=False),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=False),
        sa.Column("rating", sa.String(10), nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("reingest_flagged", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_feedback_message_id", "feedback", ["message_id"])
    op.create_index("idx_feedback_rating", "feedback", ["rating"])
    op.create_index("idx_feedback_created_at", "feedback", ["created_at"])


def downgrade() -> None:
    op.drop_table("feedback")
    op.drop_table("escalations")
    op.drop_table("knowledge_sources")
    op.drop_table("messages")
    op.drop_table("conversations")
