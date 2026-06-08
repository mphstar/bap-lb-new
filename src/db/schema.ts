import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, unique } from "drizzle-orm/pg-core";

// =========================================================================
// Better-Auth Core Tables
// =========================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// =========================================================================
// BAP System Application Tables
// =========================================================================

// User preferences (active week, etc.)
export const userData = pgTable("user_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }).unique(),
  activeWeek: integer("active_week").notNull().default(1),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Base templates for course schedules
export const scheduleTemplates = pgTable("schedule_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  scheduleId: text("schedule_id").notNull(), // Client-side generated ID (e.g., 'sched-1')
  no: integer("no").notNull(),
  mataKuliah: text("mata_kuliah").notNull().default(""),
  hari: text("hari").notNull().default(""),
  tempat: text("tempat").notNull().default(""),
  jam: text("jam").notNull().default(""),
  prodi: text("prodi").notNull().default(""),
  semester: text("semester").notNull().default(""),
  golongan: text("golongan").notNull().default(""),
  defaultPengajar: text("default_pengajar").notNull().default(""),
  defaultTeknisi: text("default_teknisi").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Master Dosen List
export const dosenList = pgTable("dosen_list", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  signature: text("signature"),
});

// Student Master Registry
export const studentMaster = pgTable("student_master", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  nim: text("nim").notNull(),
  name: text("name").notNull(),
  prodi: text("prodi").notNull().default(""),
  semester: text("semester").notNull().default(""),
  golongan: text("golongan").notNull().default(""),
});

// Weekly entries (records per week 1 - 16)
export const weeklyEntries = pgTable("weekly_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  scheduleId: text("schedule_id").notNull(), // References scheduleTemplates.scheduleId
  pengajar: text("pengajar").notNull().default(""),
  materi: text("materi").notNull().default(""),
  tanggal: text("tanggal").notNull().default(""),
  teknisi: text("teknisi").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userWeekScheduleUq: unique().on(t.userId, t.weekNumber, t.scheduleId),
}));

// Student attendance logs for weekly entries
export const weeklyStudents = pgTable("weekly_students", {
  id: uuid("id").primaryKey().defaultRandom(),
  weeklyEntryId: uuid("weekly_entry_id").notNull().references(() => weeklyEntries.id, { onDelete: "cascade" }),
  studentNo: integer("student_no").notNull(),
  nim: text("nim").notNull().default(""),
  name: text("name").notNull().default(""),
  remarks: text("remarks").notNull().default(""),
});

// Assessment Grading Forms (stored dynamically)
export const assessmentForms = pgTable("assessment_forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  formId: text("form_id").notNull(),
  name: text("name").notNull(),
  data: jsonb("data").notNull(), // Stores students, subjects, grades
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sticky Notes
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  color: text("color").notNull().default("default"),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exam Schedules
export const examSchedules = pgTable("exam_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exam Schedule Entries
export const examScheduleEntries = pgTable("exam_schedule_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  examScheduleId: uuid("exam_schedule_id").notNull().references(() => examSchedules.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  hari: text("hari").notNull(),
  tanggal: text("tanggal").notNull(),
  jam: text("jam").notNull(),
  semester: text("semester").notNull(),
  golongan: text("golongan").notNull(),
  kodeMk: text("kode_mk").notNull(),
  mataKuliah: text("mata_kuliah").notNull(),
  ruang: text("ruang").notNull(),
  pengawas: text("pengawas").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notes for Exam Entries
export const examScheduleNotes = pgTable("exam_schedule_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id").notNull().references(() => examScheduleEntries.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Archives
export const archives = pgTable("archives", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
