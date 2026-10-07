import "server-only";
import { betterAuth } from "better-auth";
import { db } from "@/lib/db";

// The secret and base URL come from BETTER_AUTH_SECRET and BETTER_AUTH_URL.
export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
});
