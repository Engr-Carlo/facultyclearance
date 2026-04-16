import NextAuth from "next-auth";
import { Role } from "@/lib/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      departmentId?: string;
    };
  }
}
