import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { RouterModule } from "@angular/router";

import { MonacoEditorModule } from "ngx-monaco-editor";
import { CryptoChartsModule } from "../crypto-charts/crypto-charts.module";

import { AppComponent } from "./app.component";
import { HomeComponent } from "./components/home/home.component";
import { NavbarComponent } from "./components/navbar/navbar.component";
import { SidebarComponent } from "./components/sidebar/sidebar.component";
import { StatusbarComponent } from "./components/statusbar/statusbar.component";
import { ButtonComponent } from "./components/ui/button/button.component";
import { ButtonRowComponent } from "./components/ui/button-row/button-row.component";
import { IconButtonColumnComponent } from "./components/ui/icon-button-column/icon-button-column.component";
import { IconButtonComponent } from "./components/ui/icon-button/icon-button.component";
import { Routes } from "./app.routes";
import { SignalRService } from "./services/signalr.service";
import { ExchangeNetworkService } from "./services/exchange-network.service";
import { BacktestDatabaseComponent } from "./components/backtest-database/backtest-database.component";
import { PairComponent } from "./components/ui/pair/pair.component";
import { ProgressBarComponent } from "./components/ui/progress-bar/progress-bar.component";
import { InterfaceService } from "./services/interface.service";
import { BacktestDatabaseGridComponent } from "./components/backtest-database-grid/backtest-database-grid.component";
import { PageControlsComponent } from "./components/ui/page-controls/page-controls.component";
import { StrategiesComponent } from "./components/strategies/strategies.component";
import { TabViewComponent } from "./components/ui/tab-view/tab-view.component";
import { TabContainerComponent } from "./components/ui/tab-container/tab-container.component";
import { completions } from "./components/strategies/strategies.monaco";

import { lib_es5_d_ts } from "./lib.es5";
import { ChartComponent } from './components/chart/chart.component';
import { TradingTerminalComponent } from './components/trading-terminal/trading-terminal.component';
import { MenuComponent } from './components/ui/menu/menu.component';
import { OrderbookComponent } from './components/orderbook/orderbook.component';
import { TradesComponent } from "./components/trades/trades.component";
import { TradesService } from "./services/trades.service";
import { OrderbookService } from "./services/orderbook.service";
import { PairListComponent } from './components/pair-list/pair-list.component';
import { PriceComponent } from './components/ui/price/price.component';
import { ScaleService } from "./services/scale.service";
import { Monokai } from "./components/strategies/strategies.theme";

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        NavbarComponent,
        SidebarComponent,
        StatusbarComponent,
        ButtonComponent,
        ButtonRowComponent,
        IconButtonColumnComponent,
        IconButtonComponent,
        BacktestDatabaseComponent,
        PairComponent,
        ProgressBarComponent,
        BacktestDatabaseGridComponent,
        PageControlsComponent,
        TradingTerminalComponent,
        TabContainerComponent,
        TabViewComponent,
        ChartComponent,
        StrategiesComponent,
        MenuComponent,
        OrderbookComponent,
        TradesComponent,
        PairListComponent,
        PriceComponent
    ],
    imports: [
        // BrowserModule.withServerTransition({ appId: "ng-cli-universal" }),
        BrowserModule,
        HttpClientModule,
        FormsModule,
        RouterModule.forRoot(Routes),
        CryptoChartsModule,
        MonacoEditorModule.forRoot({
            defaultOptions: {
                theme: "monokai",
                language: "typescript",
                fontFamily: "Iosevka, mono",
                fontSize: "16px",
                minimap: { enabled: false }
            },
            onMonacoLoad: () => {
                let _monaco = (window as any).monaco;
                let defaults = _monaco.languages.typescript.javascriptDefaults;

                setTimeout(() => {
                    _monaco.editor.defineTheme("monokai", Monokai);
                    _monaco.editor.setTheme("monokai");

                    window.addEventListener("resize", () => _monaco.editor.setTheme("monokai"));
                });

                _monaco.languages.registerCompletionItemProvider("typescript", {
                    provideCompletionItems: (model, position) => ({ items: completions })
                });

                defaults.setCompilerOptions({
                    noLib: true,
                    allowNonTsExtensions: true
                });

                defaults.addExtraLib(lib_es5_d_ts, "lib.es6.d.ts");
            }
        })
    ],
    providers: [
        SignalRService,
        ExchangeNetworkService,
        InterfaceService,
        TradesService,
        OrderbookService,
        ScaleService
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
