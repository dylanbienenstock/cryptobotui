import { HomeComponent } from "./components/home/home.component";
import { BacktestDatabaseComponent } from "./components/backtest-database/backtest-database.component";
import { TradingTerminalComponent } from "./components/trading-terminal/trading-terminal.component";
import { StrategiesComponent } from "./components/strategies/strategies.component";

const PageRoutes: { [name: string]: string } = {
    "dashboard": "",
    "terminal":  "terminal",
    "strategies":  "strategies",
    "database":  "database",
    "wallets":   "wallets",
};

const Routes = [
    {
        path: PageRoutes["dashboard"],
        component: HomeComponent,
        pathMatch: "full",
        data: {
            page: "dashboard"
        }
    },
    {
        path: PageRoutes["terminal"],
        component: TradingTerminalComponent,
        data: {
            page: "terminal"
        }
    },
    {
        path: PageRoutes["strategies"],
        component: StrategiesComponent,
        data: {
            page: "strategies"
        }
    },
    {
        path: PageRoutes["database"],
        component: BacktestDatabaseComponent,
        data: {
            page: "database"
        }
    },
    {
        path: PageRoutes["wallets"],
        component: HomeComponent,
        data: {
            page: "wallets"
        }
    }
];

export { PageRoutes, Routes };