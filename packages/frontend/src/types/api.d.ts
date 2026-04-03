import type * as modes from "./error_modes";

type Flatten<T> = T extends string
    ? T
    : T extends { status: string }
    ? T["status"]
    : never;

declare global {
    namespace Api {
        export type ErrorModes = modes.ErrorModes;
        export type FlatErrorModes = Flatten<ErrorModes>;

        export type ResponseError<Mode> = Mode extends string
            ? {
                status: Mode;
                message: string;
            }
            : Mode extends { status: string; body: infer Body }
            ? {
                status: Mode["status"];
                message: string;
                body: Body;
            }
            : never;

        export interface FatalError<
            mode extends Api.FlatErrorModes = Api.FlatErrorModes,
        > {
            status: mode;
            message: string;
        }

        // POST /auth/login
        export type LoginError = ResponseError<modes.LoginErrorModes>;
        export type LoginResponse = {
            token: string;
            user: Objects.User;
        };

        // POST /auth/register
        export type RegisterError = ResponseError<modes.RegisterErrorModes>;
        export type RegisterResponse = {
            token: string;
            user: Objects.User;
        };
    }

    namespace Objects {
        interface User {
            userId: number;
            email: string;
            createdAt: number;
            updatedAt: number;
        }
    }
}

export { };