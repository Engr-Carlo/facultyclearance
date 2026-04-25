import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", [
  "professor",
  "chair",
  "dean",
  "admin",
]);

export const termEnum = pgEnum("term", ["prelim", "midterm", "finals"]);

export const statusEnum = pgEnum("status", [
  "not_submitted",
  "submitted",
  "returned",
  "chair_approved",
  "dean_cleared",
  "rejected",
]);

export const decisionEnum = pgEnum("decision", [
  "approved",
  "returned",
  "rejected",
  "dean_cleared",
  "dean_override",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "submitted",
  "approved",
  "returned",
  "rejected",
  "dean_cleared",
  "deadline",
]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  college: text("college").notNull().default("University of Cabuyao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: roleEnum("role").notNull().default("professor"),
  departmentId: uuid("department_id").references(() => departments.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const semesters = pgTable("semesters", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  deadline: timestamp("deadline"),
  driveFolderId: text("drive_folder_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Requirement Tree ─────────────────────────────────────────────────────────
// Each semester has an independent tree. Folder nodes are groupings.
// Leaf nodes are the actual upload slots (each linked to a requirements row).
// typeTag values: 'Category' | 'Subject' | 'DocType' | 'Term'

export const requirementTreeNodes = pgTable("requirement_tree_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  semesterId: uuid("semester_id")
    .notNull()
    .references(() => semesters.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"), // self-reference added via alter — nullable = root node
  name: text("name").notNull(),
  nodeType: text("node_type").notNull().default("folder"), // 'folder' | 'leaf'
  typeTag: text("type_tag"), // 'Category' | 'Subject' | 'DocType' | 'Term' | null
  hasLabComponent: boolean("has_lab_component").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  // For leaf nodes: comma-separated requirementIds (two if hasLabComponent=true)
  requirementIds: text("requirement_ids"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const requirements = pgTable("requirements", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectCode: text("subject_code").notNull(),
  subjectName: text("subject_name").notNull(),
  term: termEnum("term").notNull(),
  docType: text("doc_type").notNull(),
  hasLabComponent: boolean("has_lab_component").notNull().default(false),
  semesterId: uuid("semester_id")
    .notNull()
    .references(() => semesters.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const professorRequirements = pgTable("professor_requirements", {
  id: uuid("id").primaryKey().defaultRandom(),
  professorId: uuid("professor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  requirementId: uuid("requirement_id")
    .notNull()
    .references(() => requirements.id, { onDelete: "cascade" }),
  semesterId: uuid("semester_id")
    .notNull()
    .references(() => semesters.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clearanceItems = pgTable("clearance_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  professorId: uuid("professor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  requirementId: uuid("requirement_id")
    .notNull()
    .references(() => requirements.id, { onDelete: "cascade" }),
  semesterId: uuid("semester_id")
    .notNull()
    .references(() => semesters.id, { onDelete: "cascade" }),
  driveFileId: text("drive_file_id"),
  driveFileName: text("drive_file_name"),
  status: statusEnum("status").notNull().default("not_submitted"),
  submittedAt: timestamp("submitted_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  clearanceItemId: uuid("clearance_item_id")
    .notNull()
    .references(() => clearanceItems.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  decision: decisionEnum("decision").notNull(),
  comment: text("comment"),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clearanceItemId: uuid("clearance_item_id").references(
    () => clearanceItems.id,
    { onDelete: "cascade" }
  ),
  type: notificationTypeEnum("type").notNull(),
  message: text("message").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  targetTable: text("target_table"),
  targetId: uuid("target_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// NextAuth required tables
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").notNull().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compositePk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  clearanceItems: many(clearanceItems),
  reviews: many(reviews),
  notifications: many(notifications),
  professorRequirements: many(professorRequirements),
}));

export const semestersRelations = relations(semesters, ({ many }) => ({
  requirements: many(requirements),
  clearanceItems: many(clearanceItems),
  professorRequirements: many(professorRequirements),
  treeNodes: many(requirementTreeNodes),
}));

export const requirementTreeNodesRelations = relations(
  requirementTreeNodes,
  ({ one, many }) => ({
    semester: one(semesters, {
      fields: [requirementTreeNodes.semesterId],
      references: [semesters.id],
    }),
    parent: one(requirementTreeNodes, {
      fields: [requirementTreeNodes.parentId],
      references: [requirementTreeNodes.id],
      relationName: "parent_child",
    }),
    children: many(requirementTreeNodes, { relationName: "parent_child" }),
  })
);

export const requirementsRelations = relations(
  requirements,
  ({ one, many }) => ({
    semester: one(semesters, {
      fields: [requirements.semesterId],
      references: [semesters.id],
    }),
    clearanceItems: many(clearanceItems),
    professorRequirements: many(professorRequirements),
  })
);

export const clearanceItemsRelations = relations(
  clearanceItems,
  ({ one, many }) => ({
    professor: one(users, {
      fields: [clearanceItems.professorId],
      references: [users.id],
    }),
    requirement: one(requirements, {
      fields: [clearanceItems.requirementId],
      references: [requirements.id],
    }),
    semester: one(semesters, {
      fields: [clearanceItems.semesterId],
      references: [semesters.id],
    }),
    reviews: many(reviews),
    notifications: many(notifications),
  })
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  clearanceItem: one(clearanceItems, {
    fields: [reviews.clearanceItemId],
    references: [clearanceItems.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type TreeNode = typeof requirementTreeNodes.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type Semester = typeof semesters.$inferSelect;
export type Requirement = typeof requirements.$inferSelect;
export type ProfessorRequirement = typeof professorRequirements.$inferSelect;
export type ClearanceItem = typeof clearanceItems.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

export type Role = "professor" | "chair" | "dean" | "admin";
export type Status =
  | "not_submitted"
  | "submitted"
  | "returned"
  | "chair_approved"
  | "dean_cleared"
  | "rejected";
export type Term = "prelim" | "midterm" | "finals";
