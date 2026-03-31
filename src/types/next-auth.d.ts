import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    role: string;
    branchId?: string;
    branchName?: string;
  }

  interface Session {
    user: User & { id: string; role: string; branchId?: string; branchName?: string };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    branchId?: string;
    branchName?: string;
  }
}
