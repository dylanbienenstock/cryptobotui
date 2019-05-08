using System;
using System.Threading;
using System.Threading.Tasks;
using CryptoBot.Exchanges;
using CryptoBot.Exchanges.Currencies;
using CryptoBotUI.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace CryptoBotUI.Services
{
    public class ExchangeNetworkService
    {
        public ExchangeNetwork Network   { get; private set; }
        public bool            Connected { get; private set; }

        public ExchangeNetworkService()
        {
            Network = new ExchangeNetwork
            (
                exchanges: new Exchange[]
                {
                    new Binance()
                }
            );

            Connect();
            SpinWait.SpinUntil(() => Connected);
        }

        public async void Connect()
        {
            await Network.Connect();
            Connected = true;
        }
    }
}