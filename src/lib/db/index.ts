import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzleHttp(sql, { schema });

// Pool-based client needed by DrizzleAdapter (requires transactions)
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const dbPool = drizzleWs(pool, { schema });

export type DB = typeof db;
