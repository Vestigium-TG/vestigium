CREATE TABLE USER (
    id UUID PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL
);


CREATE TABLE INVESTIGATION (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR NOT NULL,
    input_type VARCHAR NOT NULL,
    original_content TEXT NOT NULL,
    status VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_investigation_user
        FOREIGN KEY (user_id)
        REFERENCES USER(id)
);


CREATE TABLE SOURCE (
    id UUID PRIMARY KEY,
    investigation_id UUID NOT NULL,
    url TEXT NOT NULL,
    title VARCHAR NOT NULL,
    content TEXT,
    type VARCHAR,
    accessed_at TIMESTAMP,

    CONSTRAINT fk_source_investigation
        FOREIGN KEY (investigation_id)
        REFERENCES INVESTIGATION(id)
);


CREATE TABLE CLAIM (
    id UUID PRIMARY KEY,
    investigation_id UUID NOT NULL,
    source_id UUID,
    text TEXT NOT NULL,
    relevance DECIMAL,
    created_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_claim_investigation
        FOREIGN KEY (investigation_id)
        REFERENCES INVESTIGATION(id),

    CONSTRAINT fk_claim_source
        FOREIGN KEY (source_id)
        REFERENCES SOURCE(id)
);


CREATE TABLE QUESTION (
    id UUID PRIMARY KEY,
    claim_id UUID NOT NULL,
    text TEXT NOT NULL,
    answer TEXT,
    type VARCHAR,
    created_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_question_claim
        FOREIGN KEY (claim_id)
        REFERENCES CLAIM(id)
);


CREATE TABLE EVIDENCE (
    id UUID PRIMARY KEY,
    claim_id UUID NOT NULL,
    source_id UUID NOT NULL,
    description TEXT NOT NULL,
    excerpt TEXT,
    type VARCHAR,
    created_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_evidence_claim
        FOREIGN KEY (claim_id)
        REFERENCES CLAIM(id),

    CONSTRAINT fk_evidence_source
        FOREIGN KEY (source_id)
        REFERENCES SOURCE(id)
);


CREATE TABLE REFLECTION (
    id UUID PRIMARY KEY,
    claim_id UUID NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_reflection_claim
        FOREIGN KEY (claim_id)
        REFERENCES CLAIM(id)
);


CREATE TABLE CONCLUSION (
    id UUID PRIMARY KEY,
    investigation_id UUID NOT NULL UNIQUE,
    text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_conclusion_investigation
        FOREIGN KEY (investigation_id)
        REFERENCES INVESTIGATION(id)
);
