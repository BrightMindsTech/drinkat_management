ALTER TABLE EmployeeDocument ADD COLUMN documentType TEXT NOT NULL DEFAULT 'other';
ALTER TABLE EmployeeDocument ADD COLUMN documentNumber TEXT;
ALTER TABLE EmployeeDocument ADD COLUMN issuedOn DATETIME;
ALTER TABLE EmployeeDocument ADD COLUMN expiresOn DATETIME;
