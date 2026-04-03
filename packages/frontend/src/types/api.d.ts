declare global {
    namespace Objects {
        interface User {
            userId: number;
            email: string;
            createdAtMs: number;
            updatedAtMs: number;
        }
    }
}

export { };