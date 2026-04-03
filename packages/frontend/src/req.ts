import type { NetworkErrorMode, ApiErrorMode } from "./types/error_modes";

type Success<T> = { data: T; error: undefined; spread: () => T };
type Failure<E> = { data: undefined; error: E; spread: () => E };

type Result<T, E = Error> = Success<T> | Failure<E>;

function tryCatch<T>(promise: Promise<T>): Promise<Result<T, Error>> {
    return promise.then((data) => success(data)).catch((error) => failure(error));
}

function success<T>(data: T): Success<T> {
    return {
        data,
        error: undefined,
        spread() {
            return this.data;
        },
    } as Success<T>;
}

function failure<E>(error: E): Failure<E> {
    return {
        data: undefined,
        error,
        spread() {
            return this.error;
        },
    } as Failure<E>;
}

class ReqBase {
    protected response: Response;

    constructor(response: Response) {
        this.response = response;
    }

    public isOk(): boolean {
        return this.response.ok;
    }

    public getStatus(): number {
        return this.response.status;
    }

    public getStatusText(): string {
        return this.response.statusText;
    }

    public getHeaders(): Headers {
        return this.response.headers;
    }

    public async text(): Promise<
        Result<string, Api.ResponseError<ApiErrorMode>>
    > {
        const text = await tryCatch(this.response.text());
        if (!text.error) {
            return success(text.data);
        }

        return failure({
            status: "API_ERROR" as const,
            message: `${this.getStatus()} ${this.getStatusText()} - ${text.error.message
                }`,
        });
    }
}

class ReqSuccess<T> extends ReqBase {
    constructor(response: Response) {
        super(response);
    }

    public async json(): Promise<Result<T, Api.ResponseError<ApiErrorMode>>> {
        const json = await tryCatch(this.response.json());
        if (!json.error) {
            return success(json.data);
        }

        return failure({
            status: "API_ERROR" as const,
            message: `${this.getStatus()} ${this.getStatusText()} - ${json.error.message
                }`,
        });
    }

    public async arrayBuffer(): Promise<
        Result<ArrayBuffer, Api.ResponseError<ApiErrorMode>>
    > {
        const buffer = await tryCatch(this.response.arrayBuffer());
        if (!buffer.error) {
            return success(buffer.data);
        }

        return failure({
            status: "API_ERROR" as const,
            message: `${this.getStatus()} ${this.getStatusText()} - ${buffer.error.message
                }`,
        });
    }
}

class ReqFailure<E extends Api.ResponseError<Api.ErrorModes>> extends ReqBase {
    constructor(response: Response) {
        super(response);
    }

    public async json(): Promise<
        Result<E, Api.ResponseError<ApiErrorMode>>
    > {
        const json = await tryCatch(this.response.json());
        if (!json.error) {
            return success(json.data);
        }

        return failure({
            status: "API_ERROR" as const,
            message: `${this.getStatus()} ${this.getStatusText()} - ${json.error.message}`,
        });
    }
}

class Req<T, E extends Api.ResponseError<Api.ErrorModes>> extends ReqBase {
    constructor(response: Response) {
        super(response);
    }

    public split(): Result<ReqSuccess<T>, ReqFailure<E>> {
        return this.isOk()
            ? success(new ReqSuccess<T>(this.response))
            : failure(new ReqFailure<E>(this.response));
    }
}

function req<T, E extends Api.ResponseError<Api.ErrorModes>>(
    url: string,
    options: RequestInit & { signal: AbortSignal }
): Promise<Result<Req<T, E>, Api.FatalError<NetworkErrorMode> | "ABORTED">>;

function req<T, E extends Api.ResponseError<Api.ErrorModes>>(
    url: string,
    options: Omit<RequestInit, "signal"> & { signal?: undefined | null }
): Promise<Result<Req<T, E>, Api.ResponseError<NetworkErrorMode>>>;

async function req<T, E extends Api.ResponseError<Api.ErrorModes>>(
    url: string,
    options: RequestInit
): Promise<Result<Req<T, E>, Api.ResponseError<NetworkErrorMode> | "ABORTED">> {
    const request = await tryCatch(fetch(url, options));

    if (!request.error) {
        return success(new Req<T, E>(request.data));
    }

    if (request.error.name === "AbortError") {
        return failure("ABORTED" as const);
    }

    return failure({
        status: "NETWORK_ERROR" as const,
        message: request.error.message,
    });
}

export default req;