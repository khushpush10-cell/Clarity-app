# Database Schema Overview

Prisma schema is defined in `prisma/schema.prisma`.

Primary entities:

- `User`
- `Workspace`
- `WorkspaceMember`
- `Task`
- `Habit`
- `HabitLog`
- `Goal`
- `FocusSession`
- `ProgressCore`
- `Comment`
- `Notification`
- `AuditLog`

Key patterns:

- Soft-delete columns (`deletedAt`) on critical records
- Workspace-scoped entities for authorization boundaries
- Relationship indexes for common filters and listing queries
