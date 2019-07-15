import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CryptoChartComponent } from './crypto-chart/crypto-chart.component';
import { CryptoMultiChartComponent } from './crypto-multi-chart/crypto-multi-chart.component';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [CryptoChartComponent, CryptoMultiChartComponent],
  exports: [CryptoChartComponent, CryptoMultiChartComponent]
})
export class CryptoChartsModule { }
