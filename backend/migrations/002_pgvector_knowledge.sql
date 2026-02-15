-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge Base (Semantic Search)
CREATE TABLE knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    source_type TEXT NOT NULL CHECK (source_type IN ('documentation', 'code', 'conversation', 'rule')),
    source_id UUID, -- Link to original source if applicable
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-ada-002 dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON knowledge_embeddings
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Index for similarity search
CREATE INDEX idx_knowledge_embedding ON knowledge_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
