/**
 * DomainEventProcessor - Processes a `DEvent`. Mostn't be used separately, only by `DApp`.
 */
export class DEventProcessor<DEName extends string, DE extends DEvent<DEName>, Dependencies> {
    constructor(
        readonly dEventName: DEName,
        private domainEventHandlerFunc: (domainEvent: DE, deps: Dependencies) => Promise<void>,
    ) {
        this.dEventName = dEventName;
        this.domainEventHandlerFunc = domainEventHandlerFunc;
    }

    async process(domainEvent: DE, deps: Dependencies) {
        await this.domainEventHandlerFunc(domainEvent, deps);
    }
}

/**
 * `DEvent` - interface for events of your project. You can have your own classes for events,
 * there is no need to depend on a parent event class from **DDDam-app**.
 * Just make `eventName: DEName` property.
 */
export interface DEvent<DEName extends string> {
    eventName: DEName;
}
