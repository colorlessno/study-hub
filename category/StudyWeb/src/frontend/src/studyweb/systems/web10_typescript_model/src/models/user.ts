export type UserRole = "learner" | "mentor" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  bio?: string;
};
