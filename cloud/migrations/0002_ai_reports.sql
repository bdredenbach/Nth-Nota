-- Only explicitly submitted, reviewed AI report excerpts go here.
CREATE TABLE IF NOT EXISTS ai_reports (
 id TEXT PRIMARY KEY,
 created_ms INTEGER NOT NULL,
 reason TEXT NOT NULL,
 excerpt TEXT NOT NULL,
 details TEXT NOT NULL
);
