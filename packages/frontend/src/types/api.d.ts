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
            tokenExpiryAtMs: number;
        };

        // POST /auth/register
        export type RegisterError = ResponseError<modes.RegisterErrorModes>;
        export type RegisterResponse = {
            token: string;
            user: Objects.User;
            tokenExpiryAtMs: number;
        };

        // GET /auth/me
        export type MeError = ResponseError<modes.MeErrorModes>;
        export type MeResponse = {
            user: Objects.User;
            tokenExpiryAtMs: number;
        };

        // POST /pets
        export type CreatePetError = ResponseError<modes.CreatePetErrorModes>;
        export type CreatePetResponse = Objects.Pet;

        // GET /pets
        export type GetPetsError = ResponseError<"DATABASE_ERROR">;
        export type GetPetsResponse = Objects.Pet[];

        // GET /pets/:id
        export type GetPetByIdError = ResponseError<modes.GetPetByIdErrorModes>;
        export type GetPetByIdResponse = Objects.Pet;

        // GET /donations
        export type GetDonationsError = ResponseError<"DATABASE_ERROR">;
        export type GetDonationsResponse = Objects.Donation[];

        // POST /donations
        export type CreateDonationError = ResponseError<modes.CreateDonationErrorModes>;
        export type CreateDonationBody = {
            donorName?: string;
            amount: number;
            message?: string;
        };
        export type CreateDonationResponse = Objects.Donation;

        // POST /create-stripe-checkout-session?amount=:amount
        export type CreateStripeCheckoutSessionError = ResponseError<modes.CreateStripeCheckoutSessionErrorModes>;
        export type CreateStripeCheckoutSessionBody = {
            donorName?: string;
            message?: string;
        };
        export type CreateStripeCheckoutSessionResponse = {
            url: string;
        };

        // GET /applications
        // No routes are currently implemented in the backend for this scope.
    }

    namespace Objects {
        interface User {
            userId: number;
            email: string;
            createdAt: number;
            updatedAt: number;
        }

        interface Pet {
            petId: number;
            name: string;
            ageMonths: number;
            gender: "male" | "female";
            status: "available" | "adopted" | "pending";
            species: string;
            description: string;
            imageUrl: string;
            createdAt: number;
            updatedAt: number;
        }

        interface Donation {
            donationId: number;
            donorName: string;
            amount: number;
            message: string | null;
            createdAt: number;
        }
    }
}

export { };