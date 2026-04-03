declare global {
    namespace Objects {
        interface User {
            userId: number;
            email: string;
            role: "admin" | "volunteer";
            createdAtMs: number;
            updatedAtMs: number;
        }
    }
}

export { };