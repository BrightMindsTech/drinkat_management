-- Employee-level form assignments (manager -> direct reports).
-- Safe to run once on existing DB after 0001/0002.

CREATE TABLE "FormTemplateEmployee" (
  "templateId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  PRIMARY KEY ("templateId", "employeeId"),
  CONSTRAINT "FormTemplateEmployee_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ManagementFormTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FormTemplateEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

