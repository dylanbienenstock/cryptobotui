export interface HubResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export class MarketReference {
    public exchangeName: string;
    public symbol: string;
    public key: string;

    constructor(exchangeName: string, symbol: string) {
        this.exchangeName = exchangeName;
        this.symbol = symbol;
        this.key = `${this.exchangeName}::${this.symbol}`;
    }
}