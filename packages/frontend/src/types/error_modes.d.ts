export type NetworkErrorMode = "NETWORK_ERROR";
export type ApiErrorMode = "API_ERROR";

export type GenericAuthErrorModes =
    | "AUTHENTICATION_HEADER_MISSING"
    | "AUTHENTICATION_HEADER_INVALID"
    | "AUTHENTICATION_TOKEN_TABLE_NOT_INITIALIZED"
    | "AUTHENTICATION_USER_TABLE_NOT_INITIALIZED"
    | "AUTHENTICATION_TOKEN_NOT_FOUND"
    | "AUTHENTICATION_TOKEN_INVALID"
    | "AUTHENTICATION_USER_NOT_FOUND"
    | "DATABASE_ERROR";

export type RecaptchaErrorModes =
    | "RECAPTCHA_UNKNOWN_REMOTE_ADDRESS"
    | "RECAPTCHA_REQWEST_ERROR"
    | "RECAPTCHA_REQUEST_STATUS_ERROR"
    | "RECAPTCHA_DESERIALIZATION_ERROR"
    | "RECAPTCHA_REQUEST_ERROR"
    | "RECAPTCHA_VERIFICATION_FAILED";

export type LoginErrorModes =
    | "LOGIN_INVALID_CREDENTIALS"
    | "DATABASE_ERROR"
    | RecaptchaErrorModes;
export type RegisterErrorModes =
    | "REGISTER_INVALID_EMAIL_FORMAT"
    | "REGISTER_WEAK_PASSWORD"
    | "REGISTER_USER_EMAIL_CONFLICT"
    | "DATABASE_ERROR"
    | RecaptchaErrorModes;

export type MeErrorModes =
    | "ME_MISSING_AUTHORIZATION"
    | "ME_INVALID_TOKEN"
    | "ME_USER_NOT_FOUND"
    | "DATABASE_ERROR";

export type ErrorModes =
    | NetworkErrorMode
    | ApiErrorMode
    | GenericAuthErrorModes
    | LoginErrorModes
    | RegisterErrorModes
    | MeErrorModes;
