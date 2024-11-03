import {TSchema, Static} from "@sinclair/typebox";
import {Value, ValueError} from "@sinclair/typebox/value";
import {DEvent} from "./d-event";


/**
 * `DUseCase` - can be used as a Command or a Query of CQRS.
 */
export class DUseCase<
    UseCaseName extends string,
    ParamsSchema extends TSchema,
    Dependencies, UseCaseResult,
> {
    /**
     * 
     * @param useCaseName the name of the Use Case. Will be remembered by the type system
     * in the DApp.
     * @param paramsSchema validation schema of the Use Case parameters.
     * @param useCaseFunc 
     */
    constructor(
        readonly useCaseName: UseCaseName,
        readonly paramsSchema: ParamsSchema,
        private useCaseFunc: UseCaseFunc<UseCaseName, Static<ParamsSchema>, Dependencies, UseCaseResult>,
    ) {
        this.useCaseName = useCaseName;
        this.paramsSchema = paramsSchema;
        this.useCaseFunc = useCaseFunc;
    }

    async execute(
        params: Static<ParamsSchema>,
        deps: Dependencies,
        dEventHandler: (dEvent: DEvent<any>[]) => void,
    ): Promise<UseCaseResult> {
        const errors = [...Value.Errors(this.paramsSchema, params)];
        if (errors.length > 0) {
            throw new ValidationError(params, this.paramsSchema, errors);
        }
        return await this.useCaseFunc(params, deps, this.useCaseName, dEventHandler);
    }
}

type UseCaseFunc<UseCaseName extends string, UseCaseParams, Dependencies, UseCaseResult> = (
    params: UseCaseParams,
    deps: Dependencies,
    useCaseName: UseCaseName,
    dEventHandler: (dEvent: DEvent<any>[]) => void,
) => Promise<UseCaseResult>;

export class ValidationError extends Error {
    constructor(
        readonly value: any,
        readonly schema: TSchema,
        readonly errors: ValueError[],
    ) {
        super(`Data Validation error`);
    }
}
