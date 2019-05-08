import { HomeComponent } from "./components/home/home.component";
import { BacktestDatabaseComponent } from "./components/backtest-database/backtest-database.component";

const PageRoutes: { [name: string]: string } = {
    "dashboard":  "",
    "strategies": "strategies",
    "database":   "database",
    "wallets":    "wallets",
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
        path: PageRoutes["strategies"],
        component: HomeComponent,
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