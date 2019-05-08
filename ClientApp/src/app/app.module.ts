import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { RouterModule } from "@angular/router";

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
import { ProgressBarComponent } from './components/ui/progress-bar/progress-bar.component';
import { InterfaceService } from "./services/interface.service";
import { LazyForDirective } from "./lazy";

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
        LazyForDirective
    ],
    imports: [
        BrowserModule.withServerTransition({ appId: "ng-cli-universal" }),
        HttpClientModule,
        FormsModule,
        RouterModule.forRoot(Routes)
    ],
    providers: [
        SignalRService,
        ExchangeNetworkService,
        InterfaceService
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
